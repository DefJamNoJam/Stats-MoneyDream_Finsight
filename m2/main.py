# finsight/backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fred_api import fetch_m2_data  # 같은 폴더 내 fred_api.py에서 함수 가져오기

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/m2")
def get_m2_data():
    # fred_api.py의 fetch_m2_data() 함수를 사용하여 M2 데이터를 가져옴
    m2_data = fetch_m2_data()
    dates = [item["date"] for item in m2_data]
    values = [item["value"] for item in m2_data]
    return {"dates": dates, "values": values}