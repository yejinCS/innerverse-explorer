# INNERVERSE — 새 세션 핸드오프 (이 파일 먼저 읽기)

> 마지막 업데이트: 2026-07 · 이전 세션에서 PPT 완성 → 앱 통합 → AI 연결 → GitHub 정리까지 끝냄.
> 상세 문서: `BACKEND_AI_PLAN.md`(백엔드·AI·규율) · `PITCH_HANDOFF.md`(PPT, `feat/innerverse-2.0-landing` 브랜치에 있음)

---

## 1. 프로젝트 한 줄
**INNERVERSE 2.0** — 감정을 3D 행성으로 외화하는 멘탈 헬스케어 앱. 5감정(Russell) 기록 → 행성 색 변화 + 모모(AI 동반자) 성장. BM: B2C 구독 + 닥터컨텍(비대면 진료 중개) + C2C 소셜.

## 2. 폴더 · 브랜치 (중요)
- **작업 폴더(유일):** `C:\Users\user\Documents\innerverse-explorer`
  - ⚠️ `C:\Users\user\innerverse-explorer`(옛 클론)는 백업 커밋 후 **삭제 대상** — 건드리지 말 것
  - ⚠️ `my_ai_ux_extension` 폴더는 **다른 프로젝트** (무관)
- **GitHub:** `github.com/yeono1220/innerverse-explorer`
  - `main` = **전체 앱 최신** (full-app-wip 머지 완료, 배포 소스)
  - `full-app-wip` = main과 동일 시점
  - `feat/innerverse-2.0-landing` = 피치 작업 + PITCH_HANDOFF.md

## 3. 로컬 실행 (창 2개)
```powershell
# 창1 — 프론트 (localhost:8080)
cd C:\Users\user\Documents\innerverse-explorer
npm run dev

# 창2 — AI 백엔드 (localhost:8000, 이거 켜야 진짜 Gemini 답장)
cd C:\Users\user\Documents\innerverse-explorer
py -m uvicorn backend.main:app --port 8000
```
- 백엔드 꺼져 있으면 → 채팅은 스크립트 답장으로 자동 폴백 (앱 안 죽음)
- `.env`(레포 루트, git 미추적)에 `GEMINI_API_KEY` 등 있음 — **절대 커밋 금지**

## 4. 라우트 맵
| 경로 | 화면 |
|---|---|
| `/` | 스플래시 → 로그인 |
| `/home` | 홈 (탭: 일기·주간리뷰·설정) |
| `/pitch` | 발표용 랜딩페이지 (체험하기 → `/home`) |
| `/glass` | 디오라마 3D (결정면 행성 + 모모) |
| `/momo/chat` | 모모 AI 챗 (**Gemini 실연결 확인됨**) |
| `/diary/write` `/galaxy` `/friend/:id` `/attendance` … | 전체 앱 30+ 화면 |

## 5. 확정된 것 (재논의 금지 — 근거는 각 문서)
- **5감정 키 불변:** `pos/calm/ten/sad/emp` = 고양`#3ec074` 평온`#46a6e6` 긴장`#d99a4e` 격앙`#e0574e` 침체`#9090c8` (행성 색 블렌딩이 이 키에 묶임)
- **매출 순서:** B2C(검증) → **B2G(공공 시범, 3년차)** → B2B(기업 SaaS, 4년차) · 5년 누적 6.54억 (561 기준, 덱 전체 통일됨)
- **가입/로그인:** Supabase 미연결 시 데모 폴백 → `/home` (이미 구현)
- 데모 성장: `/glass`쪽 감정 기록마다 모모 성장(씨앗→광휘) — 발표 시연용

## 6. 마지막 세션에서 하다 만 것 = **배포** ⏳
설정 파일은 커밋돼 있음: `vercel.json`(프론트 SPA rewrite) · `render.yaml`(백엔드 Blueprint).
남은 건 **계정 연결(사용자만 가능)**:
1. **Render**: New→Blueprint→이 레포(main) → env에 `GEMINI_API_KEY`(로컬 .env 값)·`ALLOWED_ORIGINS=*` 입력 → Deploy → 백엔드 URL 복사
2. **Vercel**: New Project→이 레포(main) → env `VITE_API_URL`=Render URL → Deploy
3. Render의 `ALLOWED_ORIGINS`를 Vercel 도메인으로 좁히고 재배포
- ⚠️ Render 무료는 15분 슬립 → 발표 직전 한 번 열어서 깨우기

## 7. 남은 TODO (우선순위)
1. **배포 마무리** (위 6번 — 사용자가 계정 연결하면 같이 진행)
2. PPT 잔여: 본문 평행 버전 정리(Roadmap 763:635 vs 740:236 등, `PITCH_HANDOFF.md` A-5)
3. 옛 클론(`C:\Users\user\innerverse-explorer`) 삭제 확인
4. (여유 시) React 19 업그레이드는 **하지 말 것** — R3F 호환 이슈, `BACKEND_AI_PLAN.md` 6절 경로 A 유지
5. Supabase 실제 프로젝트 연결(선택) — migrations 5개 준비돼 있음

## 8. 발표 시연 흐름 (30~45초, 검증됨)
`/pitch` 랜딩 → "체험하기" → `/home` → 일기 쓰기/감정 기록 → `/momo/chat`에서 Gemini 실답장 → 행성 색 변화·모모 성장. (백엔드 켜두기!)

## 9. 도구 팁 (다음 Claude에게)
- Figma 수정하려면: **Figma 데스크탑 앱**에서 해당 파일 열고 Dev Mode MCP Server 켜야 함 (fileKey `W3DAaTwgCNJAyVCXZzpfer`). 노드 id는 세션마다 바뀔 수 있으니 **제목 텍스트로 검색**해서 찾을 것.
- 서버는 세션 재시작 시 꺼짐 — 다시 켜야 함 (3절 명령).
