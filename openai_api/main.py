import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

load_dotenv(dotenv_path=".env")
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GPTRequest(BaseModel):
    content: str  # 분석 요청 프롬프트

@app.post("/gpt-analysis")
async def gpt_analysis(req: GPTRequest):
    print("📨 받은 프롬프트:", req.content)
    if not req.content or req.content.strip() == "":
        return {"error": "프롬프트가 비어있습니다."}
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a professional market analyst. Provide a comprehensive analysis based on the provided market data, including overall market trends, indicator analysis, and investor insights. Structure your response into the following sections: 1. Indicator Analysis, 2. Overall Market Trends, 3. Recent Market Conditions, 4. Inter-Indicator Correlations, 5. Future Predictions, 6. Investor Insights."},
                {"role": "user", "content": req.content}
            ],
        )
        return {"result": response.choices[0].message.content}
    except Exception as e:
        return {"error": str(e)}