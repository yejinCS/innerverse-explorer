"""VllmAnalyzer 실제 경로 검증 — 가짜 vLLM(127.0.0.1:8111)에 붙여서."""
import os, importlib
os.environ["ANALYZER_BACKEND"] = "vllm"
os.environ["VLLM_PROVIDER"] = "custom"
os.environ["VLLM_BASE_URL"] = "http://127.0.0.1:8111"   # providers가 /v1 붙임
os.environ["VLLM_MODEL"] = "fake-model"
os.environ["VLLM_API_KEY"] = "not-needed"
os.environ["FALLBACK_TO_DUMMY"] = "false"  # 폴백 끄고 진짜 vLLM 경로만 검증

import config, providers, analyzers, main
for m in (config, providers, analyzers, main): importlib.reload(m)

from fastapi.testclient import TestClient
c = TestClient(main.app)

print("="*70); print("VllmAnalyzer 실경로 (가짜 vLLM 서버)"); print("="*70)

h = c.get("/health").json()
print(f"  /health active_analyzer = {h['active_analyzer']}  base_url = {h['vllm_base_url']}")
assert h["active_analyzer"] == "vllm", "vllm 이 활성화 안 됨!"
assert h["vllm_base_url"] == "http://127.0.0.1:8111/v1"

# analyze → 가짜 서버가 tense JSON 반환하도록 세팅됨
a = c.post("/api/analyze", data={"text_data":"시험이 코앞이라 너무 불안해"}).json()
print(f"  analyze → ten={a['ten']} dominant={a['dominant']} keywords={a['keywords']} primary={a['diary']['primary']}")
assert a["dominant"] == "tense" and a["ten"] == 55, "vLLM 분석 결과 반영 안 됨!"
assert a["keywords"] == ["시험","불안","걱정"]

# _debug/analyze → raw 그대로
d = c.get("/api/_debug/analyze?text=불안").json()
print(f"  _debug ok={d['ok']} backend={d['backend']}")
assert d["ok"] and d["backend"] == "vllm"

# momo → 가짜 서버의 일반 텍스트 응답
m = c.post("/api/momo/reply", json={"text":"긴장돼"}).json()
print(f"  momo → '{m['reply'][:40]}...'")
assert "긴장" in m["reply"] or "숨" in m["reply"], "vLLM generate 반영 안 됨!"

# reflect → 가짜 서버가 구조화 JSON 반환
r = c.post("/api/reflect", json={"diaries":["소연이랑 도서관 감"]}).json()
print(f"  reflect → fact='{r['fact_summary'][:30]}' facts={len(r['facts'])} rels={len(r['relations'])}")
assert r["facts"] and r["relations"], "vLLM reflect 파싱 실패!"
assert r["relations"][0]["name"] == "소연"

# weekly → 가짜 서버 회고 JSON
w = c.post("/api/weekly", json={"diaries":["월 힘듦","수 나아짐"]}).json()
print(f"  weekly → summary='{w['summary'][:25]}' recs={w['recommendations']}")
assert len(w["recommendations"]) == 3

print("\n✅ VllmAnalyzer 전 경로 통과 — vLLM 연결 구조 정상 동작")
