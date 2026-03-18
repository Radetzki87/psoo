# CLAUDE.md

## 프로젝트 개요

**「무제(無題)」** — 절차적 탐정 추리 게임. 순수 JavaScript + CSS SPA로 구현.
15~20분 안에 "조사 → 탐문 → 고발"을 체험하는 단편 추리 게임.

## 실행 방법

```bash
python3 -m http.server 8080
# 브라우저에서 http://localhost:8080 접속
```

빌드 도구, 외부 라이브러리 없음. ES modules (`type="module"`) 사용.

## 디렉토리 구조

```
psoo/
├── index.html                  # SPA 진입점
├── src/
│   ├── main.js                 # 앱 초기화, 이벤트 버스, 게임 오케스트레이터
│   ├── core/                   # 순수 로직 (UI/DOM 접근 금지)
│   │   ├── testimony-engine.js # 모순 감지 + 질문 생성
│   │   └── accusation.js       # 고발 판정
│   ├── data/handcrafted/       # JSON 케이스 데이터
│   │   └── case-alpha-001.json
│   ├── state/                  # 상태 관리
│   │   ├── game-state.js
│   │   └── notebook-state.js
│   ├── ui/                     # UI 렌더링 (state 읽기 전용)
│   │   ├── renderer.js
│   │   ├── screens/            # 화면별 클래스 (BaseScreen 상속)
│   │   ├── components/         # 재사용 UI 컴포넌트
│   │   └── styles/             # CSS (variables, layout, typography, animations, screens)
│   └── utils/
│       └── events.js           # EventBus
├── docs/
│   ├── blueprint.md            # 기술 아키텍처 청사진
│   └── design-bible.md         # 설계 바이블
└── CLAUDE.md
```

## 핵심 설계 규칙

1. **의존성 규칙**: `core/` → `data/`만 읽음. `core/` ↔ `ui/` 직접 의존 금지 — 이벤트 버스(`EventBus`) 경유만 허용
2. **이벤트 계약**: 모듈 간 통신은 `src/utils/events.js`의 EventBus만 사용
3. **R1**: 질문 선택지 최대 4개
4. **R6**: S₁(범인, 범행) 불변 — 플레이 도중 변경 금지
5. **색상**: 발견=호박색(`#d4a857`), 모순=적갈색(`#c45c4a`), 배경=남색(`#0a0e17`)

## 게임 흐름 (Phase)

`TITLE → DISCOVERY → INVESTIGATE → QUESTION → (CATCH) → ACCUSE → RESULT_WIN/RESULT_LOSE`

## 설계 문서 참조

- `docs/blueprint.md` — "정확히 무엇을, 어떤 순서로 만드는가"
- `docs/design-bible.md` — "왜 이렇게 만드는가"

## AI 어시스턴트 주의사항

- `core/` 파일에서 DOM이나 `ui/` 모듈을 import하지 말 것
- 새 이벤트 추가 시 `main.js`에 핸들러 등록 필요
- 새 화면 추가 시 `renderer.js`의 `screens` 맵에 등록 필요
- CSS 변수는 `variables.css`에서 관리
