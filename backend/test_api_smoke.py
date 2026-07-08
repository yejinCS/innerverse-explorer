"""FastAPI 앱을 실제로 띄우고 전 엔드포인트 호출 (dummy 백엔드, 네트워크 X)."""
import os
os.environ["ANALYZER_BACKEND"] = "dummy"
os.environ["FALLBACK_TO_DUMMY"] = "true"

from fastapi.testclient import TestClient
import main
c = TestClient(main.app)

def show(name, r):
    body = r.json()
    s = str(body)
    print(f"  {name:28} [{r.status_code}] {s[:90]}")
    assert r.status_code == 200, f"{name} 실패: {body}"
    return body

print("="*70); print("전 엔드포인트 스모크 (ANALYZER_BACKEND=dummy)"); print("="*70)

show("GET /", c.get("/"))
h = show("GET /health", c.get("/health"))
assert h["analyzer_backend"] == "dummy" and h["active_analyzer"] == "dummy"

show("GET /api/_debug/analyze", c.get("/api/_debug/analyze"))

# analyze: dummy→휴리스틱 보강 확인. 위기어 넣어서 crisis_score 반응 보기
a = show("POST /api/analyze", c.post("/api/analyze", data={"text_data":"오늘 너무 불안하고 지쳤어. 시험이 걱정돼."}))
assert 0 <= a["pos"] <= 100 and a["dominant"] in ("bloom","calm","tense","wither","void")
assert a["diary"]["primary"] in main.DIARY_LABELS
print(f"      → dominant={a['dominant']} crisis={a['crisis_score']} primary={a['diary']['primary']}")

# 빈 텍스트도 계약 지켜야
show("POST /api/analyze (빈값)", c.post("/api/analyze", data={"text_data":""}))

# momo: dummy generate + escalate 로직
m = show("POST /api/momo/reply", c.post("/api/momo/reply", json={"text":"요즘 자꾸 죽고싶다는 생각이 들어"}))
print(f"      → escalate={m['escalate']} (위기어 있으니 True 기대)")
assert m["escalate"] is True
m2 = show("POST /api/momo (평범)", c.post("/api/momo/reply", json={"text":"오늘 커피 맛있었어","context":["지난주에도 카페 갔었지"]}))
assert m2["escalate"] is False

show("POST /api/embed (미설정)", c.post("/api/embed", json={"text":"안녕"}))  # EMBED 미설정→None
show("POST /api/reflect (빈)", c.post("/api/reflect", json={"diaries":[]}))
r = show("POST /api/reflect", c.post("/api/reflect", json={"diaries":["오늘 소연이랑 만났다"],"fact_summary":"대학원생"}))
# dummy는 generate가 JSON이 아니므로 fallback(기존 유지)돼야
assert r["fact_summary"] == "대학원생"

show("POST /api/crisis/check", c.post("/api/crisis/check", json={"text":"자해하고 싶어"}))
show("POST /api/weekly (빈)", c.post("/api/weekly", json={"diaries":[]}))
show("POST /api/weekly", c.post("/api/weekly", json={"diaries":["월요일 힘듦","화요일 나아짐"]}))
show("GET /api/weekly/{uid}", c.get("/api/weekly/user123"))
show("POST /api/insights", c.post("/api/insights"))

# vision: dummy는 analyze_image 미지원 → NotImplementedError → 스텁
import io
png = b'\x89PNG\r\n\x1a\n' + b'\x00'*40
v = show("POST /api/vision", c.post("/api/vision", files={"photo":("t.png", io.BytesIO(png), "image/png")}))
print(f"      → scene='{v['scene']}' (미지원 스텁 기대)")

print("\n✅ 전 엔드포인트 통과 (14개)")
