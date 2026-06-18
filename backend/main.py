"""
INNERVERSE 2.0 — AI Backend (FastAPI)

API 계약 = BACKEND_AI_PLAN.md 3절. 응답 규격은 프론트 `src/store/emotionStore.ts`
및 `src/lib/api-types.ts`와 1:1로 맞춰야 한다.

5감정 키(pos/calm/ten/sad/emp)는 프론트·백·DB 전부에서 불변. (행성 색 블렌딩이 묶임)

⚠️ 의료/위기 원칙 (BACKEND_AI_PLAN.md 4-3):
  - AI는 진단하지 않는다. crisis_score / escalate 는 '신호 강도'일 뿐.
  - 위기 연계 여부는 항상 사용자 선택. 직접 의료행위 금지 → 제휴 병원/플랫폼 아웃링크.

현재 단계 = Phase 0(토대): 계약 고정 + 더미/휴리스틱 응답.
실제 OpenAI 연결은 Phase 1+ 에서 `analyze_with_llm()` 등을 채운다.
"""
from __future__ import annotations

import os
import shutil
from typing import Literal, Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# backend/.env 자동 로드 (python-dotenv 없으면 무시)
try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

app = FastAPI(title="Innerverse AI Backend", version="0.1.0")

# 🚨 CORS — 배포 시 allow_origins 를 실제 프론트 도메인으로 좁힐 것 (BACKEND_AI_PLAN.md 규율 7)
# 환경변수 ALLOWED_ORIGINS(콤마 구분)가 있으면 그것을 우선 사용.
_origins_env = os.getenv("ALLOWED_ORIGINS", "").strip()
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# 공통 타입
# ─────────────────────────────────────────────────────────────────────────────
EmoKey = Literal["pos", "calm", "ten", "sad", "emp"]
Dominant = Literal["bloom", "calm", "tense", "wither", "void"]


class EmotionScores(BaseModel):
    pos: int = Field(0, ge=0, le=100)  # 고양 Elated
    calm: int = Field(0, ge=0, le=100)  # 평온 Serene
    ten: int = Field(0, ge=0, le=100)  # 긴장 Tense
    sad: int = Field(0, ge=0, le=100)  # 격앙 Agitated
    emp: int = Field(0, ge=0, le=100)  # 침체 Depressed


# 일기 화면용 7라벨 (기쁨/차분/사랑/슬픔/분노/긴장/공허) — 프론트 diaryStore.EmotionLabel 과 1:1
DIARY_LABELS = ("기쁨", "차분", "사랑", "슬픔", "분노", "긴장", "공허")


class DiaryEmotion(BaseModel):
    label: str
    pct: int


class DiaryResult(BaseModel):
    emotions: list[DiaryEmotion]
    primary: str


class AnalyzeResponse(BaseModel):
    status: str = "success"
    extracted_text: str
    pos: int
    calm: int
    ten: int
    sad: int
    emp: int
    dominant: Dominant
    keywords: list[str]
    crisis_score: float = Field(0.0, ge=0.0, le=1.0)
    diary: DiaryResult  # 앱 일기 화면용 7라벨 결과


class MomoReplyRequest(BaseModel):
    text: str
    emotions: Optional[EmotionScores] = None
    history: list[str] = Field(default_factory=list)
    context: list[str] = Field(default_factory=list)  # RAG: 검색된 과거 일기 스니펫
    profile: str = ""  # ③④ 사실·성향 요약 (항상 주입되는 장기기억)


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: Optional[list[float]] = None
    dim: int = 0


# ── 장기기억 추출기 (③ 사실 / ④ 성향 / 관계) ──
class ReflectRequest(BaseModel):
    diaries: list[str] = Field(default_factory=list)
    fact_summary: Optional[str] = None
    persona_summary: Optional[str] = None


class ReflectFact(BaseModel):
    kind: str = "slow"
    key: str
    value: str


class ReflectRelation(BaseModel):
    name: str
    relation: str = ""
    sentiment: str = ""


class ReflectResponse(BaseModel):
    fact_summary: str = ""
    persona_summary: str = ""
    facts: list[ReflectFact] = Field(default_factory=list)
    relations: list[ReflectRelation] = Field(default_factory=list)


class WeeklyReq(BaseModel):
    diaries: list[str] = Field(default_factory=list)


class WeeklyAIResponse(BaseModel):
    summary: str = ""
    recommendations: list[str] = Field(default_factory=list)


class MomoReplyResponse(BaseModel):
    reply: str
    escalate: bool = False


class CrisisCheckRequest(BaseModel):
    text: str


class CrisisCheckResponse(BaseModel):
    risk_score: float = Field(0.0, ge=0.0, le=1.0)
    signal: str
    suggest_escalation: bool = False


class VisionResponse(BaseModel):
    labels: list[str]
    scene: str
    emotion_hint: Optional[Dominant] = None


class WeeklyReviewResponse(BaseModel):
    summary: str
    dominant: Dominant
    calendar: list[Optional[Dominant]]  # 7일
    recommendations: list[str]


# ─────────────────────────────────────────────────────────────────────────────
# 휴리스틱 (Phase 0 더미) — Phase 1에서 LLM 으로 교체
# ─────────────────────────────────────────────────────────────────────────────
def decide_dominant(e: dict[str, float]) -> Dominant:
    """프론트 constants.ts decideBranch 와 동일 로직 (포팅). dominant 라벨 일치 보장."""
    positivity = e["pos"] + e["calm"]
    total = positivity + e["ten"] + e["sad"] + e["emp"] + 0.001
    r_pos = positivity / total
    r_ten = e["ten"] / total
    r_sad = e["sad"] / total
    r_emp = e["emp"] / total
    if r_emp > 0.38:
        return "void"
    if r_sad > 0.34:
        return "wither"
    if r_ten > 0.34:
        return "tense"
    if r_pos > 0.5 and total > 55:
        return "bloom"
    return "calm"


# 아주 단순한 키워드 휴리스틱 (실서비스 아님 — 데모/계약 검증용)
_LEXICON: dict[EmoKey, tuple[str, ...]] = {
    "pos": ("행복", "기뻐", "신나", "설레", "좋았", "최고", "뿌듯", "사랑"),
    "calm": ("평온", "편안", "안정", "괜찮", "고요", "차분", "휴식", "쉬었"),
    "ten": ("긴장", "불안", "초조", "걱정", "조마", "떨려", "마감", "시험"),
    "sad": ("화가", "분노", "짜증", "억울", "열받", "싫어", "답답"),
    "emp": ("우울", "지쳐", "무기력", "외로", "공허", "슬퍼", "포기", "힘들"),
}
_CRISIS_TERMS = ("자해", "자살", "죽고", "죽고싶", "사라지고", "없어지고", "끝내고")


def heuristic_emotions(text: str) -> EmotionScores:
    scores = {"pos": 12, "calm": 10, "ten": 8, "sad": 6, "emp": 6}
    for key, terms in _LEXICON.items():
        for t in terms:
            if t in text:
                scores[key] += 22  # type: ignore[index]
    # 0~100 클램프
    return EmotionScores(**{k: max(0, min(100, v)) for k, v in scores.items()})


def heuristic_crisis(text: str) -> float:
    hits = sum(1 for t in _CRISIS_TERMS if t in text)
    return min(1.0, 0.55 + 0.2 * hits) if hits else 0.0


def heuristic_keywords(text: str) -> list[str]:
    found = [t for terms in _LEXICON.values() for t in terms if t in text]
    return (found[:3]) or ["기록"]


# 7라벨 휴리스틱 (프론트 DiaryWrite.analyze 규칙 포팅) — LLM 실패 시 폴백
_DIARY_RULES: list[tuple[str, str]] = [
    ("기쁨", "기쁘|행복|뿌듯|좋|감사|신나|설레|즐거"),
    ("사랑", "사랑|보고싶|애틋|따뜻|애정"),
    ("차분", "평온|편안|안정|차분|괜찮|담담|쉬|쉬엄"),
    ("슬픔", "슬프|우울|눈물|외로|지쳤|허전|아프"),
    ("분노", "화|짜증|답답|억울|열받|분노"),
    ("긴장", "불안|걱정|초조|긴장|무섭|두렵|떨려|회의"),
    ("공허", "공허|텅 빈|무기력|허무|아무것"),
]
_DIARY_BASE: dict[str, int] = {"기쁨": 4, "차분": 4, "사랑": 2, "슬픔": 2, "분노": 1, "긴장": 2, "공허": 1}


def heuristic_diary(text: str) -> DiaryResult:
    import re

    scores = dict(_DIARY_BASE)
    for label, pat in _DIARY_RULES:
        m = re.findall(pat, text)
        if m:
            scores[label] += len(m) * 8
    total = sum(scores.values()) or 1
    ranked = sorted(
        ({"label": k, "pct": round(v / total * 100)} for k, v in scores.items()),
        key=lambda x: x["pct"],
        reverse=True,
    )
    emos = [DiaryEmotion(**x) for x in ranked if x["pct"] >= 5]
    primary = emos[0].label if emos else "차분"
    return DiaryResult(emotions=emos, primary=primary)


def normalize_diary(raw: dict, text: str) -> DiaryResult:
    """LLM이 준 diary를 검증/정리. 없거나 이상하면 휴리스틱 폴백."""
    items = (raw or {}).get("emotions") or []
    emos = []
    for x in items:
        label = str(x.get("label", "")).strip()
        if label in DIARY_LABELS:
            emos.append(DiaryEmotion(label=label, pct=max(0, min(100, int(x.get("pct", 0) or 0)))))
    if not emos:
        return heuristic_diary(text)
    emos.sort(key=lambda e: e.pct, reverse=True)
    primary = str((raw or {}).get("primary") or "").strip()
    if primary not in DIARY_LABELS:
        primary = emos[0].label
    return DiaryResult(emotions=emos, primary=primary)


# 감정 분석 프롬프트 (BACKEND_AI_PLAN.md 4-1)
PROMPT_ANALYZE = (
    "너는 감정 분석기다. 사용자의 일기를 읽고 Russell 순환모형 5감정의 '비율'을 0~100으로 매겨라.\n"
    "- pos 고양(긍정·높은각성) / calm 평온(긍정·낮은각성) / ten 긴장(부정·높은각성)\n"
    "- sad 격앙(부정·높은각성) / emp 침체(부정·낮은각성)\n"
    "또한 핵심 키워드 3개, 위기신호 점수(crisis_score 0~1)를 산출하라.\n"
    "crisis_score는 자해·자살·심각한 절망 표현이 강할수록 1에 가깝게. (진단이 아니라 신호 강도)\n"
    'dominant 는 bloom|calm|tense|wither|void 중 하나.\n'
    "또한 일기 화면 표시용으로 7개 한국어 감정라벨(기쁨/차분/사랑/슬픔/분노/긴장/공허)의 비중(pct, 합 100 근처)을 "
    "비중 높은 순으로 매기고, 가장 강한 라벨을 primary로 정하라.\n"
    '반드시 JSON만 출력: {{"pos":n,"calm":n,"ten":n,"sad":n,"emp":n,'
    '"dominant":"...","keywords":[...],"crisis_score":n,'
    '"diary":{{"emotions":[{{"label":"기쁨","pct":n}}],"primary":"기쁨"}}}}\n'
    '일기: """{text}"""'
)


GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"


def _get_llm():
    """공급자 자동 선택. Gemini 우선 → OpenAI → None.
    Gemini 는 OpenAI 호환 엔드포인트라 같은 SDK(base_url 만 교체)로 쓴다.
    반환: (client, model) 또는 None."""
    try:
        from openai import OpenAI
    except ImportError:
        print("openai SDK 미설치 — 휴리스틱 폴백")
        return None

    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if gemini_key:
        model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        return OpenAI(api_key=gemini_key, base_url=GEMINI_BASE_URL), model

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        return OpenAI(api_key=openai_key), model

    return None


def analyze_with_llm(text: str) -> Optional[AnalyzeResponse]:
    """LLM(Gemini/OpenAI)으로 실제 분석. 키 없거나 실패하면 None → 휴리스틱 폴백."""
    import json

    if not text.strip():
        return None
    llm = _get_llm()
    if llm is None:
        return None
    client, model = llm

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": PROMPT_ANALYZE.format(text=text)}],
            response_format={"type": "json_object"},
            temperature=0.4,
        )
        data = json.loads(resp.choices[0].message.content or "{}")
    except Exception as e:  # 네트워크/파싱 등 모든 실패 → 폴백
        print(f"LLM analyze 실패, 휴리스틱 폴백: {e}")
        return None

    emo = {k: max(0, min(100, int(data.get(k, 0) or 0))) for k in ("pos", "calm", "ten", "sad", "emp")}
    dominant = data.get("dominant")
    if dominant not in ("bloom", "calm", "tense", "wither", "void"):
        dominant = decide_dominant({k: float(v) for k, v in emo.items()})
    keywords = [str(k) for k in (data.get("keywords") or [])][:3] or ["기록"]
    crisis = float(data.get("crisis_score", 0.0) or 0.0)
    diary = normalize_diary(data.get("diary"), text)
    return AnalyzeResponse(
        extracted_text=text,
        pos=emo["pos"], calm=emo["calm"], ten=emo["ten"], sad=emo["sad"], emp=emo["emp"],
        dominant=dominant,
        keywords=keywords,
        crisis_score=max(0.0, min(1.0, crisis)),
        diary=diary,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 임베딩 (RAG 장기기억) — Gemini/OpenAI 둘 다 768차원으로 맞춤
# ─────────────────────────────────────────────────────────────────────────────
def embed_text(text: str) -> Optional[list[float]]:
    if not text.strip():
        return None
    try:
        from openai import OpenAI
    except ImportError:
        return None
    gem = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if gem:
        try:
            client = OpenAI(api_key=gem, base_url=GEMINI_BASE_URL)
            r = client.embeddings.create(model=os.getenv("EMBED_MODEL", "text-embedding-004"), input=text)
            return list(r.data[0].embedding)
        except Exception as e:
            print(f"embed(gemini) 실패: {e}")
            return None
    oa = os.getenv("OPENAI_API_KEY")
    if oa:
        try:
            client = OpenAI(api_key=oa)
            r = client.embeddings.create(model="text-embedding-3-small", input=text, dimensions=768)
            return list(r.data[0].embedding)
        except Exception as e:
            print(f"embed(openai) 실패: {e}")
            return None
    return None


# 모모 공감 답장 프롬프트 (BACKEND_AI_PLAN.md 4-2) — '묻는 엔진' 역할 + 기억 주입
PROMPT_MOMO_SYSTEM = (
    "너는 '모모', 유리로 빚어진 다정한 AI 감정 동반자다.\n"
    "- 짧고(2~3문장) 따뜻하게. 판단·훈계·진단 금지.\n"
    "- CBT 톤: 감정을 인정 → 생각을 살짝 다시 보게 → 작은 한 걸음 제안.\n"
    "- 아래 '과거 기록'이 있으면 자연스럽게 인용해 '나를 기억하는' 느낌을 줘라 "
    "(예: 지난번 발표 때도 비슷했는데 잘 넘겼잖아).\n"
    "- 진단·의료행위 금지. 위기 신호가 강하면 위로 후 전문가 연계를 부드럽게 권한다."
)


def llm_text(system: str, user: str) -> Optional[str]:
    """통합 텍스트 생성 — Anthropic(Claude) 우선(PPT 일치) → Gemini/OpenAI → None."""
    ak = os.getenv("ANTHROPIC_API_KEY")
    if ak:
        try:
            import anthropic

            client = anthropic.Anthropic(api_key=ak)
            msg = client.messages.create(
                model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-haiku-latest"),
                max_tokens=400,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            return "".join(getattr(b, "text", "") for b in msg.content)
        except Exception as e:
            print(f"Claude 실패, 폴백: {e}")
    llm = _get_llm()
    if llm:
        client, model = llm
        try:
            r = client.chat.completions.create(
                model=model,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                temperature=0.6,
            )
            return r.choices[0].message.content
        except Exception as e:
            print(f"llm_text 실패, 폴백: {e}")
    return None


# ─────────────────────────────────────────────────────────────────────────────
# 라우트
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {"message": "Innerverse AI Server is running!", "version": app.version}


@app.get("/api/health")
def health():
    """진단용 — 어떤 AI 공급자가 활성인지, SDK/키 상태 확인."""
    has_gemini = bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    has_openai = bool(os.getenv("OPENAI_API_KEY"))
    try:
        import openai  # noqa: F401

        sdk = True
    except ImportError:
        sdk = False
    if has_gemini and sdk:
        provider = "gemini"
    elif has_openai and sdk:
        provider = "openai"
    else:
        provider = "heuristic"
    return {
        "provider": provider,
        "gemini_key_loaded": has_gemini,
        "openai_key_loaded": has_openai,
        "openai_sdk_installed": sdk,
    }


@app.get("/api/_debug/llm")
def debug_llm():
    """실제 LLM 호출을 한 번 시도하고 결과/에러를 그대로 반환 (진단용)."""
    llm = _get_llm()
    if llm is None:
        return {"ok": False, "reason": "no provider — key 또는 openai SDK 없음"}
    client, model = llm
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": 'respond with json {"ok": true}'}],
            response_format={"type": "json_object"},
        )
        return {"ok": True, "model": model, "sample": resp.choices[0].message.content}
    except Exception as e:
        return {"ok": False, "model": model, "error": f"{type(e).__name__}: {e}"}


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_diary(
    audio_file: UploadFile | None = File(None),
    text_data: str | None = Form(None),
):
    """일기(text/audio) → 5감정 + dominant + keywords + crisis_score.
    응답 규격 = 프론트 emotionStore / api-types.ts 와 1:1."""
    extracted_text = text_data or ""

    # 음성 → (Phase 4) Whisper STT. 현재는 임시 저장 후 플레이스홀더.
    if audio_file:
        file_path = f"temp_{audio_file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
        print(f"🎤 오디오 파일 저장: {file_path}")
        extracted_text = "[음성에서 변환된 텍스트 — Phase 4 Whisper 예정]"
        os.remove(file_path)

    if text_data:
        print(f"✍️ 텍스트 일기 수신: {text_data[:20]}...")

    # Phase 1: LLM 우선, 없으면 휴리스틱 폴백
    llm = analyze_with_llm(extracted_text)
    if llm is not None:
        return llm

    emo = heuristic_emotions(extracted_text)
    dominant = decide_dominant(emo.model_dump())
    return AnalyzeResponse(
        extracted_text=extracted_text,
        pos=emo.pos,
        calm=emo.calm,
        ten=emo.ten,
        sad=emo.sad,
        emp=emo.emp,
        dominant=dominant,
        keywords=heuristic_keywords(extracted_text),
        crisis_score=heuristic_crisis(extracted_text),
        diary=heuristic_diary(extracted_text),
    )


@app.post("/api/momo/reply", response_model=MomoReplyResponse)
async def momo_reply(req: MomoReplyRequest):
    """모모 공감 답장 — RAG(과거 일기 context) + 감정 주입 → LLM. 실패 시 휴리스틱.
    ⚠️ 진단 금지. 위기 신호 강하면 위로 후 전문가 연계 제안."""
    crisis = heuristic_crisis(req.text)
    escalate = crisis >= 0.6

    parts: list[str] = []
    if req.profile:
        parts.append(f"내가 아는 너(장기기억): {req.profile}")
    if req.context:
        parts.append("과거 기록(참고):\n" + "\n".join(f"- {c}" for c in req.context[:3]))
    if req.emotions:
        e = req.emotions
        parts.append(f"현재 감정비율 pos{e.pos}/calm{e.calm}/ten{e.ten}/sad{e.sad}/emp{e.emp}")
    parts.append(f"사용자: {req.text}")
    if escalate:
        parts.append("(위기 신호 감지됨 — 위로 후 전문가 연계를 부드럽게 권할 것)")

    reply = llm_text(PROMPT_MOMO_SYSTEM, "\n\n".join(parts))
    if not reply:
        if escalate:
            reply = "많이 힘들었구나. 지금은 저보다 전문가의 도움이 필요한 순간 같아요. 비대면 상담을 연결해 드릴까요?"
        elif req.context:
            reply = "예전 기록을 보니 너 이런 결을 지나온 적 있어. 그때처럼 오늘도 한 걸음만 같이 가보자."
        else:
            reply = "그 마음 충분히 그럴 수 있어. 오늘은 작은 한 걸음만 같이 떠올려보자."
    return MomoReplyResponse(reply=reply.strip(), escalate=escalate)


@app.post("/api/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    """RAG 임베딩 — 키 있으면 768차원 벡터, 없으면 None(프론트가 폴백 검색)."""
    v = embed_text(req.text)
    return EmbedResponse(embedding=v, dim=len(v) if v else 0)


PROMPT_REFLECT = (
    "너는 사용자의 장기 기억을 관리하는 분석기다. 최근 일기들과 기존 프로필을 보고 갱신하라.\n"
    "- fact_summary: 사용자에 대한 '사실'을 한 단락으로 누적 요약(직업·상황·핵심 관계 등). 기존 요약을 유지하며 갱신.\n"
    "- persona_summary: 반복되는 '성향·패턴'을 한 단락으로(예: 스트레스 받으면 자책, 칭찬받으면 회복 빠름, 월요일에 가라앉음).\n"
    "- facts: 새로 확인된 구조화 사실. kind는 permanent|slow|tracked 중 하나, key/value.\n"
    "- relations: 일기에 등장한 사람. name/relation/sentiment.\n"
    "근거가 약하면 비워라(지어내지 말 것).\n"
    '반드시 JSON만: {"fact_summary":"...","persona_summary":"...",'
    '"facts":[{"kind":"slow","key":"직업","value":"대학원생"}],'
    '"relations":[{"name":"소연","relation":"친구","sentiment":"긍정"}]}'
)


@app.post("/api/reflect", response_model=ReflectResponse)
def reflect(req: ReflectRequest):
    """최근 일기 → 사실/성향 요약·구조화 사실·관계 추출 (PPT ③④ 비동기 갱신). 키 없으면 기존 유지."""
    import json

    fallback = ReflectResponse(fact_summary=req.fact_summary or "", persona_summary=req.persona_summary or "")
    if not req.diaries:
        return fallback
    llm = _get_llm()
    if llm is None:
        return fallback
    client, model = llm
    user = (
        f"기존 fact_summary: {req.fact_summary or '(없음)'}\n"
        f"기존 persona_summary: {req.persona_summary or '(없음)'}\n\n"
        "최근 일기:\n" + "\n".join(f"- {d}" for d in req.diaries[:10])
    )
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": PROMPT_REFLECT}, {"role": "user", "content": user}],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        d = json.loads(resp.choices[0].message.content or "{}")
        facts = []
        for f in d.get("facts") or []:
            if not f.get("key"):
                continue
            kind = str(f.get("kind", "slow"))
            if kind not in ("permanent", "slow", "tracked"):
                kind = "slow"
            facts.append(ReflectFact(kind=kind, key=str(f["key"]), value=str(f.get("value", ""))))
        rels = [
            ReflectRelation(name=str(r["name"]), relation=str(r.get("relation", "")), sentiment=str(r.get("sentiment", "")))
            for r in (d.get("relations") or [])
            if r.get("name")
        ]
        return ReflectResponse(
            fact_summary=str(d.get("fact_summary") or req.fact_summary or ""),
            persona_summary=str(d.get("persona_summary") or req.persona_summary or ""),
            facts=facts,
            relations=rels,
        )
    except Exception as e:
        print(f"reflect 실패: {e}")
        return fallback


@app.post("/api/crisis/check", response_model=CrisisCheckResponse)
async def crisis_check(req: CrisisCheckRequest):
    """위기 스크리닝 (트리거 신호일 뿐, 진단 아님). 연계는 항상 사용자 선택."""
    score = heuristic_crisis(req.text)
    return CrisisCheckResponse(
        risk_score=score,
        signal="high" if score >= 0.6 else ("low" if score > 0 else "none"),
        suggest_escalation=score >= 0.6,
    )


@app.post("/api/vision", response_model=VisionResponse)
async def vision(photo: UploadFile = File(...)):
    """멀티모달 사진 분석 — 사진 속 장면·분위기를 일기 맥락으로. (Gemini Vision)
    키 없거나 실패하면 스텁."""
    import base64
    import json

    llm = _get_llm()
    if llm is None:
        return VisionResponse(labels=["사진"], scene="(분석 불가 — AI 키 없음)", emotion_hint=None)
    client, model = llm
    try:
        data = await photo.read()
        b64 = base64.b64encode(data).decode()
        mime = photo.content_type or "image/jpeg"
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "이 사진을 보고 일기 맥락용으로 JSON만 출력해라. "
                                '{"labels":[핵심 사물/장면 3~5개 한국어], '
                                '"scene":"한 줄 분위기 묘사(한국어)", '
                                '"emotion_hint":"bloom|calm|tense|wither|void 중 하나 또는 null"}'
                            ),
                        },
                        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                    ],
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        d = json.loads(resp.choices[0].message.content or "{}")
        eh = d.get("emotion_hint")
        if eh not in ("bloom", "calm", "tense", "wither", "void"):
            eh = None
        return VisionResponse(
            labels=[str(x) for x in (d.get("labels") or [])][:5] or ["사진"],
            scene=str(d.get("scene") or ""),
            emotion_hint=eh,
        )
    except Exception as e:
        print(f"vision 실패: {e}")
        return VisionResponse(labels=["사진"], scene="(분석 실패)", emotion_hint=None)


PROMPT_WEEKLY = (
    "너는 따뜻한 감정 회고 도우미다. 이번 주 일기들을 보고:\n"
    "- summary: 2~3문장으로 이번 주 마음 흐름을 따뜻하게 회고(판단·훈계 금지).\n"
    "- recommendations: 도움될 추천 3개(노래/장소/활동 등, 짧게).\n"
    '반드시 JSON만: {"summary":"...","recommendations":["...","...","..."]}'
)


@app.post("/api/weekly", response_model=WeeklyAIResponse)
def weekly(req: WeeklyReq):
    """이번 주 일기 → AI 회고 요약 + 추천. 키 없거나 일기 없으면 기본 문구."""
    import json

    fb = WeeklyAIResponse(
        summary="이번 주도 마음을 차곡차곡 기록했어요. 작은 순간들이 행성 위에 쌓이고 있어요 🌱",
        recommendations=["가벼운 산책 30분", "좋아하는 노래 한 곡", "오늘의 감정 한 줄 더"],
    )
    if not req.diaries:
        return fb
    llm = _get_llm()
    if llm is None:
        return fb
    client, model = llm
    user = "이번 주 일기:\n" + "\n".join(f"- {d}" for d in req.diaries[:10])
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": PROMPT_WEEKLY}, {"role": "user", "content": user}],
            response_format={"type": "json_object"},
            temperature=0.5,
        )
        d = json.loads(resp.choices[0].message.content or "{}")
        recs = [str(x) for x in (d.get("recommendations") or [])][:4]
        return WeeklyAIResponse(summary=str(d.get("summary") or fb.summary), recommendations=recs or fb.recommendations)
    except Exception as e:
        print(f"weekly 실패: {e}")
        return fb


@app.get("/api/weekly/{uid}", response_model=WeeklyReviewResponse)
async def weekly_review(uid: str):
    """주간 리뷰 (집계형 스텁 — 실제 AI 요약은 POST /api/weekly 사용)."""
    return WeeklyReviewResponse(
        summary="POST /api/weekly 로 AI 요약을 생성하세요.",
        dominant="calm",
        calendar=[None, None, None, None, None, None, None],
        recommendations=["일기 꾸준히 쓰기"],
    )


@app.post("/api/insights")
async def insights():
    """집계·차분 프라이버시 적용 B2B 인사이트 (Phase 5). 개인 식별 불가. 현재는 스텁."""
    return {"status": "not_implemented", "phase": 5}
# end of Phase 0 stubs
