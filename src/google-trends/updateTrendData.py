from pytrends.request import TrendReq
import pandas as pd
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv
import os

# 🔧 .env 파일에서 환경변수 로드
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 📌 설정값
KEYWORDS = ["bitcoin", "ethereum"]
REGION = "US"

# 📅 가장 최신 날짜 가져오기
def get_latest_date(keyword, granularity):
    response = supabase.table("google_trends") \
        .select("date") \
        .eq("keyword", keyword) \
        .eq("granularity", granularity) \
        .order("date", desc=True) \
        .limit(1) \
        .execute()

    if response.data:
        return response.data[0]["date"]
    return None

# 📤 Supabase에 데이터 삽입
def upload_to_supabase(df):
    table_name = "google_trends"
    inserted_count = 0

    for _, row in df.iterrows():
        entry = {
            "date": row["date"],
            "keyword": row["keyword"],
            "granularity": row["granularity"],
            "value": round(float(row["value"]), 2)
        }
        print("🟢 Insert:", (entry["date"], entry["keyword"], entry["granularity"]))
        supabase.table(table_name).insert(entry).execute()
        inserted_count += 1

    print(f"✅ {inserted_count}건 삽입 완료" if inserted_count > 0 else "ℹ️ 새로운 데이터 없음")

# 🔄 키워드별 전체 & 최근 5년 데이터 수집 및 삽입
def fetch_and_update(keyword):
    pytrends = TrendReq(hl='en-US', tz=360)

    # 1️⃣ Monthly
    latest_date = get_latest_date(keyword, "monthly")
    pytrends.build_payload([keyword], cat=0, timeframe='2004-01-01 2025-12-31', geo=REGION, gprop='')
    df_monthly = pytrends.interest_over_time()
    if not df_monthly.empty:
        df_monthly = df_monthly.reset_index()
        df_monthly = df_monthly.rename(columns={keyword: "value", "date": "date"})
        df_monthly["granularity"] = "monthly"
        df_monthly["keyword"] = keyword
        df_monthly = df_monthly[["date", "keyword", "granularity", "value"]]
        df_monthly["date"] = df_monthly["date"].dt.strftime("%Y-%m-01")
        if latest_date:
            df_monthly = df_monthly[df_monthly["date"] > latest_date]
        upload_to_supabase(df_monthly)

    # 2️⃣ Weekly
    latest_date = get_latest_date(keyword, "weekly")
    pytrends.build_payload([keyword], cat=0, timeframe='today 5-y', geo=REGION, gprop='')
    df_weekly = pytrends.interest_over_time()
    if not df_weekly.empty:
        df_weekly = df_weekly.reset_index()
        df_weekly = df_weekly.rename(columns={keyword: "value", "date": "date"})
        df_weekly["granularity"] = "weekly"
        df_weekly["keyword"] = keyword
        df_weekly = df_weekly[["date", "keyword", "granularity", "value"]]
        df_weekly["date"] = df_weekly["date"].dt.strftime("%Y-%m-%d")
        if latest_date:
            df_weekly = df_weekly[df_weekly["date"] > latest_date]
        upload_to_supabase(df_weekly)

# ✅ 실행
if __name__ == "__main__":
    for kw in KEYWORDS:
        print(f"\n🔄 업데이트 중: {kw}")
        fetch_and_update(kw)
    print("\n🎉 모든 키워드 업데이트 완료")
