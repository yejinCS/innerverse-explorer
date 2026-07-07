"""
전역 설정 — 두 개의 독립 토글 축을 환경변수로 제어한다.

┌─ 축 1: ANALYZER_BACKEND ── '무엇으로' 분석하는가 ──────────────┐
│   vllm   : 직접 서빙하는 오픈 모델(OpenAI 호환)로 분석            │
│   claude : Anthropic Claude API 로 분석                    │
│   dummy  : 외부 호출 없이 고정 결과 (기본값)                     │
└───────────────────────────────────────────────────────────┘

┌─ 축 2: VLLM_PROVIDER ── vLLM 서버가 '어디에' 있는가 ───────────┐
│   modal  : Modal 서버리스에 띄운 vLLM                        │
│   runpod : RunPod(Pod/Serverless)에 띄운 vLLM              │
│   custom : 직접 URL 지정 (로컬/Colab/기타)                    │
│                                                          │
│   ※ 이 축은 ANALYZER_BACKEND=vllm 일 때만 의미가 있다.         │
│     claude/dummy 를 쓰면 이 값은 무시된다.                     │
└──────────────────────────────────────────────────────────┘

전환 예시 (코드 수정 없이 환경변수만):
    ANALYZER_BACKEND=claude                          # Claude 사용
    ANALYZER_BACKEND=vllm  VLLM_PROVIDER=modal       # Modal 위 vLLM
    ANALYZER_BACKEND=vllm  VLLM_PROVIDER=runpod      # RunPod 위 vLLM
"""
import os


class Settings:
    # ── 축 1: 분석기 선택 ──
    ANALYZER_BACKEND: str = os.getenv("ANALYZER_BACKEND", "dummy").lower()

    # ── 축 2: vLLM 서빙 위치 선택 (축 1 이 vllm 일 때만 사용) ──
    VLLM_PROVIDER: str = os.getenv("VLLM_PROVIDER", "custom").lower()

    # vLLM 공통 (provider 가 최종 base_url 을 채워줄 수도, 여기서 직접 줄 수도) ─
    VLLM_MODEL: str = os.getenv("VLLM_MODEL", "")
    VLLM_API_KEY: str = os.getenv("VLLM_API_KEY", "not-needed")
    # custom provider 전용: 직접 base_url 지정 (로컬/Colab ngrok 등)
    VLLM_BASE_URL: str = os.getenv("VLLM_BASE_URL", "http://localhost:8000/v1")

    # ── Modal provider 설정 ──
    # Modal 배포 후 나오는 웹 엔드포인트 (예: https://<user>--<app>-serve.modal.run)
    # 이 뒤에 /v1 을 붙여 OpenAI 호환 경로를 만든다.
    MODAL_VLLM_URL: str = os.getenv("MODAL_VLLM_URL", "")
    MODAL_VLLM_TOKEN: str = os.getenv("MODAL_VLLM_TOKEN", "not-needed")

    # ── RunPod provider 설정 ──
    # 방식 A) Pod 직접 노출:  http://<pod-id>-8000.proxy.runpod.net
    # 방식 B) Serverless:      https://api.runpod.ai/v2/<ENDPOINT_ID>/openai/v1
    RUNPOD_VLLM_URL: str = os.getenv("RUNPOD_VLLM_URL", "")
    RUNPOD_API_KEY: str = os.getenv("RUNPOD_API_KEY", "")

    # ── Claude 설정 ──
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5")

    # ── 공통 ──
    # 외부 모델 호출 타임아웃(초). 서버리스 콜드스타트 고려해 넉넉히.
    REQUEST_TIMEOUT: float = float(os.getenv("REQUEST_TIMEOUT", "120"))
    # 분석 실패 시 더미로 폴백할지. 개발/데모 중엔 True 가 편하다.
    FALLBACK_TO_DUMMY: bool = os.getenv("FALLBACK_TO_DUMMY", "true").lower() == "true"

    CORS_ORIGINS: list[str] = (
        os.getenv("CORS_ORIGINS", "*").split(",")
        if os.getenv("CORS_ORIGINS")
        else ["*"]
    )


settings = Settings()
