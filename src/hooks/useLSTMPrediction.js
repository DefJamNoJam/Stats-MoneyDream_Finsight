// src/hooks/useLSTMPrediction.js
import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * symbol: 예) 'BTCUSDT'
 * 백엔드 /api/lstm-prediction?symbol=... 호출, stopLoss & takeProfit 반환
 */
export const useLSTMPrediction = (symbol) => {
  const [bands, setBands] = useState({ stopLoss: null, takeProfit: null });

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        const url = `http://localhost:8002/api/lstm-prediction?symbol=${symbol}`;
        const res = await axios.get(url);
        console.log('[useLSTMPrediction]', symbol, '=>', res.data);
        setBands({
          stopLoss: res.data.stopLoss,
          takeProfit: res.data.takeProfit,
        });
      } catch (err) {
        console.error('LSTM 예측 API 오류:', err);
      }
    };

    fetchPrediction();
    const intervalId = setInterval(fetchPrediction, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [symbol]);

  return bands;
};
