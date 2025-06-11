import requests

url = "http://localhost:8001/gpt-analysis"
data = {
    "content": "Please analyze the market data: BTC prices increased steadily while M2 supply is declining."
}

try:
    response = requests.post(url, json=data)
    print("📨 요청 보낸 데이터:", data)
    print("📬 응답 받은 결과:", response.status_code)
    print("📊 분석 결과:")
    print(response.json())
except Exception as e:
    print("🚨 에러 발생:", str(e))
