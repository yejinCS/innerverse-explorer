"""토글 매트릭스 + 폴백 동작 검증 (실제 네트워크 호출 없이 라우팅/생성 로직만)."""
import os, importlib
import config, providers, analyzers

def fresh(env):
    for k in ("ANALYZER_BACKEND","VLLM_PROVIDER","VLLM_MODEL","VLLM_BASE_URL",
              "MODAL_VLLM_URL","RUNPOD_VLLM_URL","RUNPOD_API_KEY","ANTHROPIC_API_KEY",
              "FALLBACK_TO_DUMMY","VLLM_API_KEY","MODAL_VLLM_TOKEN"):
        os.environ.pop(k, None) # 이전 테스트케이스로 생셩된 환경변수 제거
    os.environ.update(env)
    importlib.reload(config); importlib.reload(providers); importlib.reload(analyzers)
    return config, providers, analyzers

print("="*70)
print("1) analyzer 팩토리가 ANALYZER_BACKEND 대로 갈라지는가")
print("="*70)
cases = [
    ("dummy 기본",          {}),
    ("dummy 명시",          {"ANALYZER_BACKEND":"dummy"}),
    ("vllm+modal (URL O)",  {"ANALYZER_BACKEND":"vllm","VLLM_PROVIDER":"modal",
                             "MODAL_VLLM_URL":"https://x--vllm-serve.modal.run","VLLM_MODEL":"Qwen/Qwen2.5-7B-Instruct"}),
    ("vllm+runpod (URL O)", {"ANALYZER_BACKEND":"vllm","VLLM_PROVIDER":"runpod",
                             "RUNPOD_VLLM_URL":"https://pod-8000.proxy.runpod.net","VLLM_MODEL":"Qwen/Qwen2.5-7B-Instruct"}),
    ("vllm custom(로컬)",   {"ANALYZER_BACKEND":"vllm","VLLM_PROVIDER":"custom",
                             "VLLM_BASE_URL":"http://localhost:8000","VLLM_MODEL":"my-model"}),
    ("claude",              {"ANALYZER_BACKEND":"claude","ANTHROPIC_API_KEY":"sk-ant-x"}),
]
for name, env in cases:
    _, _, analyzers = fresh(env)
    a = analyzers.build_analyzer()
    print(f"  [{name:22}] → analyzer.name = {a.name}")

print()
print("="*70)
print("2) 설정 누락 시 폴백 동작 (FALLBACK_TO_DUMMY)")
print("="*70)
# vllm 인데 URL 없음 + 폴백 ON → dummy 로 떨어져야
_,_,analyzers = fresh({"ANALYZER_BACKEND":"vllm","VLLM_PROVIDER":"modal","FALLBACK_TO_DUMMY":"true"})
a = analyzers.build_analyzer()
print(f"  [vllm URL누락 + 폴백ON ] → {a.name}  (기대: dummy)")
assert a.name == "dummy", "폴백 실패!"

# vllm 인데 URL 없음 + 폴백 OFF → 예외 나야
_,_,analyzers = fresh({"ANALYZER_BACKEND":"vllm","VLLM_PROVIDER":"modal","FALLBACK_TO_DUMMY":"false"})
try:
    a = analyzers.build_analyzer()
    print(f"  [vllm URL누락 + 폴백OFF] → {a.name}  ❌ (예외가 나야 하는데 안 남)")
except Exception as e:
    print(f"  [vllm URL누락 + 폴백OFF] → 예외 발생 ✓  ({type(e).__name__})")

# claude 인데 키 없음 + 폴백 ON → dummy
_,_,analyzers = fresh({"ANALYZER_BACKEND":"claude","FALLBACK_TO_DUMMY":"true"})
a = analyzers.build_analyzer()
print(f"  [claude 키누락 + 폴백ON ] → {a.name}  (기대: dummy)")
assert a.name == "dummy"

print()
print("="*70)
print("3) providers.build_provider 가 base_url 에 /v1 을 붙이는가")
print("="*70)
_, providers, _ = fresh({"ANALYZER_BACKEND":"vllm","VLLM_PROVIDER":"modal",
                         "MODAL_VLLM_URL":"https://x--vllm-serve.modal.run","VLLM_MODEL":"m"})
ep = providers.build_provider().endpoint()
print(f"  modal  base_url = {ep.base_url}")
assert ep.base_url.endswith("/v1")
_, providers, _ = fresh({"ANALYZER_BACKEND":"vllm","VLLM_PROVIDER":"runpod",
                         "RUNPOD_VLLM_URL":"https://pod-8000.proxy.runpod.net/v1","VLLM_MODEL":"m"})
ep = providers.build_provider().endpoint()
print(f"  runpod base_url = {ep.base_url}  (이미 /v1 이면 중복 안 붙음)")
assert ep.base_url.count("/v1") == 1

print()
print("="*70)
print("4) DummyAnalyzer 가 실제로 계약 dict 를 주는가 (네트워크 없이)")
print("="*70)
_,_,analyzers = fresh({"ANALYZER_BACKEND":"dummy"})
a = analyzers.build_analyzer()
raw = a.analyze("오늘 좀 힘들었어")
print(f"  analyze() keys = {sorted(raw.keys())}")
print(f"  generate()      = {a.generate('sys','user')[:30]}...")
assert all(k in raw for k in ("pos","calm","ten","sad","emp","dominant","keywords","crisis_score","diary"))
print("\n✅ 매트릭스 전부 통과")
