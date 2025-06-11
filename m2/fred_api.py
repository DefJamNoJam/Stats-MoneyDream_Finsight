# backend/fred_api.py
import requests
import os
from dotenv import load_dotenv

load_dotenv()

FRED_API_KEY = os.getenv("FRED_API_KEY")
FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations"

def fetch_m2_data():
    params = {
        "series_id": "M2SL",
        "api_key": FRED_API_KEY,
        "file_type": "json",
        "observation_start": "2017-09-01"
    }
    response = requests.get(FRED_BASE_URL, params=params)
    response.raise_for_status()
    data = response.json()

    return [
        {"date": obs["date"], "value": float(obs["value"])}
        for obs in data["observations"]
        if obs["value"] != "."
    ]
