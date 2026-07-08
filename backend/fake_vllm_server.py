"""가짜 OpenAI 호환 vLLM 서버 — 실제 GPU 없이 VllmAnalyzer 경로를 검증."""
from fastapi import FastAPI, Request
import uvicorn

app = FastAPI()

@app.get("/v1/models")
async def models():
    return {"object":"list","data":[{"id":"fake-model","object":"model"}]}

@app.post("/v1/chat/completions")
async def chat(req: Request):
    body = await req.json()
    msgs = body.get("messages", [])
    user = " ".join(m.get("content","") if isinstance(m.get("content"),str) else "img" for m in msgs)
    # analyze 프롬프트면 감정 JSON, 아니면 일반 텍스트
    if "Russell" in user or "순환모형" in user:
        content = ('{"pos":10,"calm":15,"ten":55,"sad":10,"emp":10,'
                   '"dominant":"tense","keywords":["시험","불안","걱정"],"crisis_score":0.1,'
                   '"diary":{"emotions":[{"label":"긴장","pct":60},{"label":"차분","pct":40}],"primary":"긴장"}}')
    elif "장기 기억" in user or "기존 fact_summary" in user:
        content = '{"fact_summary":"대학원생, 소연과 친구","persona_summary":"시험 앞두면 불안","facts":[{"kind":"slow","key":"직업","value":"대학원생"}],"relations":[{"name":"소연","relation":"친구","sentiment":"긍정"}]}'
    elif "회고" in user or "recommendations" in user:
        content = '{"summary":"이번 주 롤러코스터였지만 잘 버텼어요.","recommendations":["산책","음악 감상","일기 쓰기"]}'
    else:
        content = "많이 긴장됐겠다. 그래도 여기 이렇게 적어준 것만으로 한 걸음이야. 오늘은 깊게 세 번 숨쉬어보자."
    return {"id":"x","object":"chat.completion","choices":[
        {"index":0,"message":{"role":"assistant","content":content},"finish_reason":"stop"}]}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8111, log_level="error")
