"""
Analyzer 계층 — 축 1: '무엇으로' 분석하는가.

    Analyzer
      ├─ DummyAnalyzer   : 외부 호출 없음. 고정 결과.
      ├─ VllmAnalyzer    : OpenAI 호환 vLLM 서버 호출.
      │                    ↳ 서버 '위치'는 providers.py(축 2)가 결정.
      └─ ClaudeAnalyzer  : Anthropic Claude 호출.

두 축의 결합 지점:
    VllmAnalyzer 는 스스로 URL 을 모른다. build_provider() 가 준
    VllmEndpoint(base_url, api_key)만 받아서 호출한다.
    → Modal ↔ RunPod 전환은 provider 에서만 일어나고 여기 코드는 불변.

주의(동기 클라이언트):
    명료함을 위해 동기 클라이언트를 쓴다. 트래픽이 늘면 Async 계열로 바꾸거나
    run_in_executor 로 감싼다 → main.py 는 이미 asyncio.to_thread 로 감싸둠.
"""
from __future__ import annotations

import abc
import json

from config import settings
from schema import ANALYSIS_JSON_SCHEMA, SYSTEM_PROMPT
from providers import build_provider


class Analyzer(abc.ABC):
    name: str = "base"

    @abc.abstractmethod
    def analyze(self, text: str) -> dict:
        """
        일기 텍스트 → {"emotions":[...], "relationships":[...]} 반환.
        color 는 붙이지 않는다(공통 후처리 attach_colors 담당).
        """
        raise NotImplementedError


# ─────────────────────────────────────────────────────────────
# 1) dummy — 외부 서버 없이도 앱 전체가 돌게 하는 기본값
# ─────────────────────────────────────────────────────────────
class DummyAnalyzer(Analyzer):
    name = "dummy"

    def analyze(self, text: str) -> dict:
        return {
            "emotions": [
                {"label": "기쁨", "value": 45},
                {"label": "슬픔", "value": 15},
                {"label": "분노", "value": 5},
                {"label": "불안", "value": 20},
                {"label": "평온", "value": 60},
            ],
            "relationships": [
                {"person": "김팀장", "relation": "직장 동료",
                 "status": "스트레스 유발", "score": -80},
                {"person": "지현이", "relation": "친구",
                 "status": "위로가 됨", "score": 60},
            ],
        }


# ─────────────────────────────────────────────────────────────
# 2) vLLM — OpenAI 호환 서버 호출. 서버 위치는 provider(축 2)가 주입.
# ─────────────────────────────────────────────────────────────
class VllmAnalyzer(Analyzer):
    name = "vllm"

    def __init__(self) -> None:
        # 지연 초기화: 이 분석기가 실제 선택됐을 때만 클라이언트 생성.
        from openai import OpenAI  # vLLM 이 OpenAI 호환이라 그대로 사용

        if not settings.VLLM_MODEL:
            raise RuntimeError("VLLM_MODEL 환경변수가 비어 있습니다.")

        # 축 2 결합: provider 가 (base_url, api_key)를 만들어 준다.
        provider = build_provider()
        ep = provider.endpoint()
        self.provider_name = provider.name  # 로깅/health 용

        self.client = OpenAI(
            base_url=ep.base_url,
            api_key=ep.api_key,
            timeout=settings.REQUEST_TIMEOUT,
        )
        self.model = settings.VLLM_MODEL
        print(f"[analyzers] vLLM provider={provider.name} base_url={ep.base_url}")

    def analyze(self, text: str) -> dict:
        completion = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=0.3,
            # ★ vLLM 전용: 이 스키마로만 출력하도록 강제.
            #   띄운 vLLM 버전이 guided_json 을 지원하지 않으면
            #   response_format={"type":"json_schema", ...} 방식으로 교체.
            # 모든 vllm은 guided_json 을 지원하지만, vLLM 서버가 오래된 버전이면
            # guided_json 을 무시하고 그냥 일반 텍스트를 내보낼 수 있다
            extra_body={"guided_json": ANALYSIS_JSON_SCHEMA},
        )
        return json.loads(completion.choices[0].message.content)


# ─────────────────────────────────────────────────────────────
# 3) Claude — Anthropic API. tool 스키마로 JSON 강제.
#    (Claude 는 Anthropic 이 서빙 → provider(축 2) 개념 없음)
# ─────────────────────────────────────────────────────────────
class ClaudeAnalyzer(Analyzer):
    name = "claude"

    def __init__(self) -> None:
        import anthropic

        if not settings.ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY 환경변수가 비어 있습니다.")

        self.client = anthropic.Anthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            timeout=settings.REQUEST_TIMEOUT,
        )
        self.model = settings.CLAUDE_MODEL

    def analyze(self, text: str) -> dict:
        # guided_json 이 없으므로 'tool use'로 구조화 출력을 강제.
        # 스키마는 schema.py 것을 그대로 재사용 → vLLM 과 동일 계약.
        tool = {
            "name": "report_analysis",
            "description": "일기의 감정·인간관계 분석 결과를 이 형식으로 보고한다.",
            "input_schema": ANALYSIS_JSON_SCHEMA,
        }
        resp = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=[tool],
            tool_choice={"type": "tool", "name": "report_analysis"},
            messages=[{"role": "user", "content": text}],
        )
        for block in resp.content:
            if getattr(block, "type", None) == "tool_use":
                return block.input
        raise ValueError("Claude 응답에서 tool_use 결과를 찾지 못했습니다.")


# ─────────────────────────────────────────────────────────────
# 팩토리 — 축 1 설정을 보고 분석기 하나를 만들어 준다.
# ─────────────────────────────────────────────────────────────
_ANALYZER_REGISTRY: dict[str, type[Analyzer]] = {
    "dummy": DummyAnalyzer,
    "vllm": VllmAnalyzer,
    "claude": ClaudeAnalyzer,
}


def build_analyzer(backend: str | None = None) -> Analyzer:
    """
    backend 지정이 없으면 settings.ANALYZER_BACKEND 사용.
    알 수 없는 값이면 dummy 로 안전하게 떨어진다.
    """
    key = (backend or settings.ANALYZER_BACKEND).lower()
    cls = _ANALYZER_REGISTRY.get(key)
    if cls is None:
        print(f"[analyzers] 알 수 없는 ANALYZER_BACKEND='{key}', dummy 로 대체")
        cls = DummyAnalyzer
    return cls()
