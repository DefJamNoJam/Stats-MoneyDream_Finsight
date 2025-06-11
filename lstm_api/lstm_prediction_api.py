# lstm_prediction_api.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import ta
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import load_model
from tensorflow.keras import metrics
import requests
import os
from dotenv import load_dotenv

load_dotenv()  # 환경변수 로드

app = FastAPI()

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 필요한 도메인만 허용할 수 있음
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 상수 및 모델 로드
MODEL_PATH = os.getenv("LSTM_MODEL_PATH", "lstm_model.h5")
SEQ_LENGTH = 30

try:
    model = load_model(MODEL_PATH, compile=False)
    model.compile(optimizer='adam', loss='mean_absolute_error', metrics=[metrics.MeanAbsoluteError()])
except Exception as e:
    # 모델 로드에 실패하면, 서버 실행 시 바로 에러를 발생시킴
    raise RuntimeError(f"모델 로드 실패: {e}")

# 스케일러 (실제 운영 환경에서는 학습 시 사용한 scaler를 재사용하는 것이 좋습니다)
scaler = MinMaxScaler(feature_range=(0, 1))

def fetch_realtime_data(symbol="BTCUSDT", interval="1m", limit=200):
    url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}"
    data = requests.get(url).json()
    if not data:
        raise HTTPException(status_code=400, detail="Binance API 데이터 조회 실패")
    df = pd.DataFrame(data, columns=[
        "timestamp", "open", "high", "low", "close", "volume",
        "close_time", "qav", "trades", "tbbav", "tbqav", "ignore"
    ])
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
    numeric_cols = ["open", "high", "low", "close", "volume"]
    df[numeric_cols] = df[numeric_cols].astype(float)
    return df[numeric_cols]

def preprocess_for_lstm(df, seq_length=30):
    # 기술 지표 계산
    df["rsi"] = ta.momentum.RSIIndicator(df["close"], window=14).rsi()
    df["ema"] = ta.trend.EMAIndicator(df["close"], window=14).ema_indicator()
    df["macd"] = ta.trend.MACD(df["close"]).macd()
    df["atr"] = ta.volatility.AverageTrueRange(df["high"], df["low"], df["close"]).average_true_range()
    
    features = ["close", "rsi", "ema", "macd", "atr"]
    df.dropna(inplace=True)
    
    if len(df) < seq_length:
        return None, None
    
    df[features] = df[features].astype(np.float32)
    scaled = scaler.fit_transform(df[features])
    X_seq = scaled[-seq_length:]
    X_seq = np.expand_dims(X_seq, axis=0)
    return df, X_seq

def compute_bands(current_price, target_pred):
    half = target_pred / 2
    stop_loss = current_price - half
    take_profit = current_price + half
    return stop_loss, take_profit

@app.get("/api/lstm-prediction")
def get_lstm_prediction(symbol: str = "BTCUSDT"):
    df = fetch_realtime_data(symbol=symbol, interval="1m", limit=200)
    df_processed, X_seq = preprocess_for_lstm(df.copy(), seq_length=SEQ_LENGTH)
    if X_seq is None:
        raise HTTPException(status_code=400, detail="데이터가 충분하지 않습니다.")
    
    pred = model.predict(X_seq)  # 예: shape (1,1)
    target_pred = float(pred[0][0])
    current_price = df_processed["close"].iloc[-1]
    stop_loss, take_profit = compute_bands(current_price, target_pred)
    
    # 수정된 부분: numpy.float32 타입을 기본 float로 변환
    return {"stopLoss": float(stop_loss), "takeProfit": float(take_profit)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
