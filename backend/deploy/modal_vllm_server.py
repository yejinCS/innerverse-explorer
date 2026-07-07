"""
Modal 에 vLLM 을 OpenAI 호환 서버로 띄우는 배포 스크립트.

이 파일은 백엔드(main.py)와 '별개'로 Modal 에 올라가는 독립 서버다.
    배포:   modal deploy modal_vllm_server.py
    배포 후 콘솔에 뜨는 URL(예: https://<user>--innerverse-vllm-serve.modal.run)을
    백엔드의 MODAL_VLLM_URL 환경변수에 넣으면 VllmAnalyzer 가 그대로 호출한다.

구조:
    [프론트] → [FastAPI main.py] → HTTP → [이 Modal vLLM 서버] → 응답

주의:
    - 저가/무료 GPU 사정을 고려해 '양자화 모델'을 기본값으로 둔다(VRAM 절약).
    - vLLM 버전은 반드시 고정(pin). latest 사용 금지.
      단, 콜드스타트가 있으니 백엔드 REQUEST_TIMEOUT 을 넉넉히(120초+) 둘 것.

※ 실제 값(모델명/GPU/버전)은 배포 환경에서 재확인 후 조정하세요.
"""
import modal

# ── 모델·서빙 설정 ──
# 무료/저가 GPU(T4·A10G 등)에서 돌리기 좋은 양자화 7B 예시
# 다른 모델을 쓰면 MODEL_NAME 과 백엔드의 VLLM_MODEL 을 '동일하게' 맞출 것.
MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct-AWQ"
SERVED_NAME = "innerverse-emotion"   # 백엔드 VLLM_MODEL 에 이 값을 넣는다
VLLM_VERSION = "0.21.0"              # 반드시 고정
GPU_TYPE = "A10G"                    # T4/A10G/A100 등. 모델 크기에 맞게.
N_GPU = 1
VLLM_PORT = 8000
# 서버 인증 토큰(선택). 설정 시 백엔드 MODAL_VLLM_TOKEN 과 일치시킬 것.
API_TOKEN = "not-needed"

# vLLM 컨테이너 이미지. Modal 이 CUDA 드라이버를 제공하므로 pip 설치만.
vllm_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.9.0-devel-ubuntu22.04", add_python="3.12"
    )
    .entrypoint([])
    .pip_install(f"vllm=={VLLM_VERSION}")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
)

# 모델 가중치를 볼륨에 캐싱 → 콜드스타트 시 재다운로드 방지.
hf_cache = modal.Volume.from_name("hf-cache", create_if_missing=True)

app = modal.App("innerverse-vllm")


@app.function(
    image=vllm_image,
    gpu=f"{GPU_TYPE}:{N_GPU}",
    volumes={"/root/.cache/huggingface": hf_cache},
    timeout=30 * 60,           # 배포/로딩 여유
    scaledown_window=5 * 60,   # 유휴 5분 후 scale-to-zero (과금 0)
)
@modal.web_server(port=VLLM_PORT, startup_timeout=20 * 60)
def serve():
    """vLLM OpenAI 호환 서버를 subprocess 로 띄운다. /v1/... 경로가 열린다."""
    import subprocess

    cmd = [
        "vllm", "serve", MODEL_NAME,
        "--served-model-name", SERVED_NAME,
        "--host", "0.0.0.0",
        "--port", str(VLLM_PORT),
        "--quantization", "awq",        # 양자화 모델에 맞춰 지정
        "--max-model-len", "4096",      # KV 캐시 메모리 절약
        "--gpu-memory-utilization", "0.90",
    ]
    if API_TOKEN and API_TOKEN != "not-needed":
        cmd += ["--api-key", API_TOKEN]

    subprocess.Popen(" ".join(cmd), shell=True)
