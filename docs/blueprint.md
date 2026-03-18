# 「무제(無題)」— 절차적 탐정 추리 게임

## 기술 아키텍처 청사진 v2.0

### Claude Code 자립 구현 완전판

---

## 0. 이 문서의 위상

이 문서와 `design-bible-v2.md`는 게임의 **유이한 2개 설계 문서**이다. 바이블이 "왜 이렇게 만드는가"를 규정한다면, 이 청사진은 **"정확히 무엇을, 어떤 순서로, 어떤 인터페이스로 만드는가"**를 규정한다.

Claude Code에게 이 문서를 제공하면, 파일별로 독립 구현이 가능해야 한다. 모든 함수 시그니처, 데이터 스키마, 이벤트 계약, 알고리즘 의사코드가 이 문서에 포함되어 있다.

**참조 관계**: 설계 원칙의 근거가 필요하면 바이블의 해당 장을 참조한다. 이 문서 내에서는 `[Bible §4.1]`처럼 표기.

---

## 1. 프로젝트 구조

```
detective-game/
│
├── index.html                  # 진입점 (SPA)
├── README.md                   # 프로젝트 설명
│
├── src/
│   ├── main.js                 # 앱 초기화, 이벤트 버스 구성, 게임 루프
│   │
│   ├── core/                   # ━━ 순수 로직 (UI 무관, DOM 접근 금지) ━━
│   │   ├── case-generator.js   # 케이스 생성 파이프라인 6단계
│   │   ├── misbelief-engine.js # 오판 곡선 생성기
│   │   ├── evidence-graph.js   # 증거 그래프 구축 + 연결성 검증
│   │   ├── testimony-engine.js # 증언 생성 + 모순 감지 + 질문 생성
│   │   ├── accusation.js       # 고발 판정 로직
│   │   └── validator.js        # 케이스 무결성 7기준 검증
│   │
│   ├── data/                   # ━━ 콘텐츠 풀 (순수 JSON, 코드 없음) ━━
│   │   ├── settings.json       # 장소 풀 (5종)
│   │   ├── motives.json        # 동기 풀 (6종)
│   │   ├── methods.json        # 살해 방법 풀 (5종)
│   │   ├── tricks.json         # 트릭 풀 (5종)
│   │   ├── characters.json     # 인물 속성 풀
│   │   ├── evidence-pool.json  # 증거 템플릿 풀
│   │   ├── dialogue.json       # 증언/대화 템플릿
│   │   ├── flavor.json         # 감각 묘사 텍스트 풀
│   │   └── handcrafted/        # 수작업 케이스 (Phase α용)
│   │       └── case-alpha-001.json
│   │
│   ├── state/                  # ━━ 상태 관리 (단일 진실 원천) ━━
│   │   ├── game-state.js       # 전역 게임 상태
│   │   └── notebook-state.js   # 수첩 상태
│   │
│   ├── ui/                     # ━━ UI 렌더링 (state 읽기 전용) ━━
│   │   ├── renderer.js         # 메인 렌더러 (화면 전환)
│   │   ├── screens/
│   │   │   ├── base-screen.js        # 추상 기반 클래스
│   │   │   ├── title-screen.js       # 타이틀
│   │   │   ├── discovery-screen.js   # 사건 발견 연출
│   │   │   ├── scene-screen.js       # 장소 (조사)
│   │   │   ├── examine-screen.js     # 오브젝트 클로즈업
│   │   │   ├── character-screen.js   # 인물 (탐문)
│   │   │   ├── catch-screen.js       # 짚기 연출
│   │   │   ├── notebook-screen.js    # 수첩 (오버레이)
│   │   │   ├── accusation-screen.js  # 고발
│   │   │   └── result-screen.js      # 결과
│   │   ├── components/
│   │   │   ├── choice-panel.js       # 선택지 패널
│   │   │   ├── contradiction-bar.js  # 모순 알림 바
│   │   │   ├── portrait.js           # 인물 초상
│   │   │   ├── map-widget.js         # 방 이동 약도
│   │   │   └── typewriter.js         # 텍스트 타이핑 효과
│   │   └── styles/
│   │       ├── variables.css
│   │       ├── layout.css
│   │       ├── typography.css
│   │       ├── animations.css
│   │       └── screens.css
│   │
│   └── utils/
│       ├── random.js           # 시드 기반 랜덤
│       ├── text-template.js    # 텍스트 템플릿 치환
│       └── events.js           # 이벤트 버스
│
├── tests/
│   ├── case-generator.test.js
│   ├── evidence-graph.test.js
│   ├── testimony-engine.test.js
│   └── playthrough.test.js
│
└── docs/
    ├── blueprint.md            # 이 문서
    └── design-bible.md         # 설계 바이블 v2.0
```

---

## 2. 의존성 규칙

```
    main.js ─────────────────────────────────
       │          │            │             │
       ▼          ▼            ▼             ▼
    core/      state/        ui/         utils/
       │          │            │             │
       ▼          │            ▼             │
    data/    ◄────┘         assets/          │
  (JSON)                   (static)    ◄─────┘
```

**불변 규칙**:
- `core/` → `data/`를 읽지만, `ui/`와 `state/`를 import하지 않는다
- `ui/` → `state/`를 읽고, `core/`의 **결과물**을 받지만, `core/`를 직접 호출하지 않는다
- `state/` → 이벤트를 통해서만 변경된다. 직접 mutation 금지.
- `core/` ↔ `ui/` **직접 의존 금지**. 반드시 이벤트 버스를 경유.

---

## 3. 이벤트 계약 (Event Contract)

모듈 간 통신의 **유일한 경로**. 모든 이벤트는 이벤트 버스를 통한다.

### 3.1 이벤트 버스 구현

```javascript
// src/utils/events.js
export class EventBus {
  constructor() { this.listeners = {}; }
  on(event, callback) {
    (this.listeners[event] ||= []).push(callback);
    return () => this.off(event, callback); // unsubscribe 함수 반환
  }
  off(event, callback) {
    this.listeners[event] = (this.listeners[event] || []).filter(cb => cb !== callback);
  }
  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }
}
```

### 3.2 전체 이벤트 카탈로그

| 이벤트 | 발신 | 수신 | 페이로드 | 설명 |
|--------|------|------|----------|------|
| `GAME_START` | title-screen | main.js | `{ seed? }` | 새 게임 시작 |
| `CASE_LOADED` | main.js | renderer | `{ caseData }` | 케이스 로드 완료 |
| `PHASE_CHANGE` | main.js | renderer | `{ phase, data? }` | 게임 단계 전환 |
| `ROOM_ENTER` | scene-screen | game-state | `{ roomId }` | 방 이동 |
| `OBJECT_EXAMINE` | scene-screen | main.js | `{ objectId }` | 오브젝트 조사 |
| `EVIDENCE_FOUND` | main.js | notebook-state, ui | `{ evidence }` | 증거 발견 |
| `SUSPECT_SELECT` | scene-screen | main.js | `{ suspectId }` | 탐문 대상 선택 |
| `QUESTION_ASK` | character-screen | main.js | `{ suspectId, questionId }` | 질문 선택 |
| `TESTIMONY_RECEIVED` | main.js | notebook-state, ui | `{ testimony }` | 증언 수신 |
| `CONTRADICTION_FOUND` | testimony-engine | notebook-state, ui | `{ contradiction }` | 모순 감지 |
| `CATCH_TRIGGER` | character-screen | main.js | `{ suspectId, contradictionId }` | 짚기 실행 |
| `CATCH_RESULT` | main.js | catch-screen | `{ reaction, reveals?, newQuestions? }` | 짚기 결과 |
| `NOTEBOOK_OPEN` | any screen | notebook-screen | `{}` | 수첩 열기 |
| `NOTEBOOK_CLOSE` | notebook-screen | renderer | `{}` | 수첩 닫기 |
| `HYPOTHESIS_SET` | notebook-screen | notebook-state | `{ suspectId }` | 가설 변경 |
| `ACCUSE` | accusation-screen | main.js | `{ suspectId, evidenceIds[] }` | 고발 실행 |
| `ACCUSE_RESULT` | main.js | result-screen | `{ correct, solution?, feedback? }` | 고발 결과 |
| `PHASE_READY` | any screen | main.js | `{ nextPhase }` | 다음 단계 준비 |

---

## 4. 핵심 데이터 스키마

### 4.1 Case — 생성된 사건의 완전한 구조

```javascript
/**
 * @typedef {Object} Case
 * core/case-generator.js가 생성하거나
 * data/handcrafted/case-*.json에서 로드하는 최종 산출물
 */
const Case = {
  id: "case_alpha_001",       // 고유 식별자
  seed: 42,                   // 재현용 시드 (수작업은 null)
  title: "해변 저택의 밤",      // 케이스 제목 (결과 화면용)

  // ━━━ 세계 ━━━
  setting: {
    id: "seaside_mansion",
    name: "해변 저택",
    atmosphere: "폭풍이 몰아치는 밤. 전화선이 끊겼다.",
    rooms: [
      {
        id: "study",
        name: "서재",
        description: "월넛 책상 위에 반쯤 열린 약 케이스. 옆에 위스키 잔, 얼음이 아직 녹지 않았다. 창밖으로 정원의 어둠이 보인다.",
        objects: [
          {
            id: "obj_pill_case",
            name: "약 케이스",
            lookText: "검은 가죽 케이스가 책상 위에 놓여 있다. 반쯤 열려 있다.",
            examineText: "검은 가죽 케이스. 처방전 라벨이 붙어 있으나 이름 부분이 찢겨 나갔다. 안에 세 칸 — 두 칸은 비었고, 한 칸에 흰 알약 두 알.",
            evidenceId: "ev_pills"
          },
          {
            id: "obj_whisky",
            name: "위스키 잔",
            lookText: "위스키 잔이 책상 모서리에 놓여 있다.",
            examineText: "반쯤 남은 위스키. 얼음이 아직 녹지 않았다. 잔 표면에 물방울이 맺혀 있다.",
            evidenceId: "ev_whisky"
          },
          {
            id: "obj_drawer",
            name: "책상 서랍",
            lookText: "서랍이 살짝 열려 있다.",
            examineText: "서랍 안에 접힌 종이 한 장. 차용증이다. '박준혁, 금 삼억원...'",
            evidenceId: "ev_iou"
          }
        ],
        adjacentRooms: ["hallway"]
      },
      {
        id: "hallway",
        name: "복도",
        description: "긴 복도. 벽에 가족 사진이 걸려 있다. 피해자는 웃고 있다. 옆 인물의 얼굴은 잘려 나갔다.",
        objects: [
          {
            id: "obj_photo",
            name: "가족 사진",
            lookText: "벽에 걸린 가족 사진. 누군가의 얼굴이 잘려 나갔다.",
            examineText: "피해자와 두 사람이 찍힌 사진. 오른쪽 인물의 얼굴 부분이 칼로 도려내졌다. 뒷면에 '2019년 가을, 준혁이 생일'이라고 적혀 있다.",
            evidenceId: "ev_photo"
          }
        ],
        adjacentRooms: ["study", "living_room", "garden"]
      },
      {
        id: "living_room",
        name: "거실",
        description: "넓은 거실. TV가 켜져 있고, 소파에 담요가 구겨져 있다. 커피 테이블 위에 와인잔 두 개.",
        objects: [
          {
            id: "obj_wine_glasses",
            name: "와인잔 두 개",
            lookText: "커피 테이블 위에 와인잔이 두 개 놓여 있다. 하나는 비었고 하나에 조금 남아 있다.",
            examineText: "두 잔 모두 적포도주 흔적. 한 잔의 입술 자국은 립스틱이 묻어 있다. 다른 잔은 깨끗하다.",
            evidenceId: "ev_wine"
          },
          {
            id: "obj_blanket",
            name: "구겨진 담요",
            lookText: "소파 위에 담요가 구겨져 있다.",
            examineText: "울 담요. 긴 머리카락 한 올이 붙어 있다. 향수 냄새가 희미하게 남아 있다.",
            evidenceId: null
          }
        ],
        adjacentRooms: ["hallway"]
      },
      {
        id: "garden",
        name: "정원",
        description: "비가 내린다. 현관에서 정원 끝 담장까지 자갈길이 이어진다. 장미 덤불 사이로 무언가 빛난다.",
        objects: [
          {
            id: "obj_footprints",
            name: "진흙 발자국",
            lookText: "자갈길 옆 진흙에 발자국이 찍혀 있다.",
            examineText: "구두 자국. 크기 약 270mm. 자갈길을 피해 장미 덤불 뒤로 이어진다. 담장 쪽으로 가다 사라진다.",
            evidenceId: "ev_footprints"
          },
          {
            id: "obj_shiny",
            name: "장미 덤불 사이 빛나는 것",
            lookText: "장미 덤불 사이에서 무언가 반짝인다.",
            examineText: "약 봉지. 빈 것. 라벨에 '디곡신 0.25mg'이라고 적혀 있다. 피해자의 이름은 없다.",
            evidenceId: "ev_prescription_memo"
          }
        ],
        adjacentRooms: ["hallway"]
      }
    ],
    map: {
      nodes: ["study", "hallway", "living_room", "garden"],
      edges: [
        { from: "study", to: "hallway" },
        { from: "hallway", to: "living_room" },
        { from: "hallway", to: "garden" }
      ],
      startRoom: "study"
    }
  },

  // ━━━ 인물 ━━━
  victim: {
    id: "victim",
    name: "김태호",
    occupation: "사업가",
    age: 68,
    description: "해변 저택의 주인. 최근 유산 전액을 자선단체에 기부하겠다고 선언.",
    causeOfDeath: "심장약이 독성 약물로 교체되어 복용 후 30분 뒤 심장마비"
  },

  suspects: [
    {
      id: "suspect_a",
      name: "박준혁",
      occupation: "피해자의 조카",
      age: 34,
      portrait: "portraits/suspect_a.svg",
      portraitStates: { calm: "default", tense: "frown", shaken: "sweat" },
      color: "var(--suspect-a)",
      motive: {
        type: "inheritance",
        description: "유일한 상속인. 피해자의 기부 계획이 실행되면 상속 제로.",
        visible: false
      },
      secret: {
        text: "도박 빚 3억 원",
        relatedEvidence: "ev_iou"
      },
      isCulprit: true,
      timeline: {
        slot1: { time: "20:00", location: "living_room", action: "거실에서 TV 시청", witnesses: ["suspect_b"] },
        slot2: { time: "21:00", location: "study", action: "서재에서 약 교체 (범행)", witnesses: [] },
        slot3: { time: "21:30", location: "living_room", action: "거실로 돌아와 B와 대화", witnesses: ["suspect_b"] }
      }
    },
    {
      id: "suspect_b",
      name: "한서연",
      occupation: "피해자의 간호사",
      age: 29,
      portrait: "portraits/suspect_b.svg",
      portraitStates: { calm: "default", tense: "look_away", shaken: "hands" },
      color: "var(--suspect-b)",
      motive: {
        type: "secret",
        description: "의료 과실 기록을 피해자가 알고 있었다.",
        visible: true
      },
      secret: {
        text: "이전 병원에서 의료 과실로 해고됨",
        relatedEvidence: "ev_wine"
      },
      isCulprit: false,
      timeline: {
        slot1: { time: "20:00", location: "living_room", action: "거실에서 A와 함께 TV 시청", witnesses: ["suspect_a"] },
        slot2: { time: "21:00", location: "living_room", action: "와인을 마시며 피해자 기다림", witnesses: [] },
        slot3: { time: "21:30", location: "living_room", action: "A가 돌아와 대화", witnesses: ["suspect_a"] }
      }
    },
    {
      id: "suspect_c",
      name: "이도윤",
      occupation: "피해자의 변호사",
      age: 52,
      portrait: "portraits/suspect_c.svg",
      portraitStates: { calm: "default", tense: "adjust_glasses", shaken: "pale" },
      color: "var(--suspect-c)",
      motive: {
        type: "fear",
        description: "피해자의 유산 기부 계획 법률 문서를 작성 중이었다. 기부가 완료되면 대형 고객을 잃는다.",
        visible: false
      },
      secret: {
        text: "기부 계획의 법률 문서를 일부러 지연시키고 있었다",
        relatedEvidence: "ev_footprints"
      },
      isCulprit: false,
      timeline: {
        slot1: { time: "20:00", location: "garden", action: "정원에서 전화 통화", witnesses: [] },
        slot2: { time: "21:00", location: "hallway", action: "복도를 지나 객실로", witnesses: [] },
        slot3: { time: "21:30", location: "guest_room", action: "객실에서 서류 작업", witnesses: [] }
      }
    }
  ],

  culprit: "suspect_a",
  method: "poison",
  trick: "time_trick",

  // ━━━ 증거 ━━━
  evidence: [
    {
      id: "ev_pills",
      name: "약 케이스",
      location: "study",
      foundIn: "obj_pill_case",
      description: "검은 가죽 케이스. 처방전 라벨 훼손. 알약 2알 잔존.",
      interpretations: {
        a: { text: "피해자의 상비약 — 평소 복용하던 심장약", leadsTo: null },
        b: { text: "누군가 약을 교체 — 라벨을 찢어 원래 약명을 숨김", leadsTo: "suspect_a" }
      },
      resolvedBy: ["ev_prescription_memo"],
      phase: 1,
      isKey: true
    },
    {
      id: "ev_whisky",
      name: "위스키 잔",
      location: "study",
      foundIn: "obj_whisky",
      description: "반쯤 남은 위스키. 얼음 미용해.",
      interpretations: {
        a: { text: "사건 직후 누군가 따른 것 — 사건이 최근", leadsTo: null },
        b: { text: "피해자가 약 복용 직후 따른 것 — 사망 시작점 표시", leadsTo: "suspect_a" }
      },
      resolvedBy: ["ev_pills"],
      phase: 1,
      isKey: false
    },
    {
      id: "ev_iou",
      name: "차용증",
      location: "study",
      foundIn: "obj_drawer",
      description: "박준혁 명의 차용증. 금 3억 원.",
      interpretations: {
        a: { text: "A의 경제적 곤란 — 그러나 살인 동기인지는 불명", leadsTo: "suspect_a" },
        b: { text: "피해자가 조카의 빚을 알고 있었다 — 기부 계획과 연결?", leadsTo: "suspect_a" }
      },
      resolvedBy: [],
      phase: 1,
      isKey: true
    },
    {
      id: "ev_photo",
      name: "훼손된 가족 사진",
      location: "hallway",
      foundIn: "obj_photo",
      description: "가족 사진. 한 인물의 얼굴이 도려내짐. 뒷면에 '준혁이 생일'.",
      interpretations: {
        a: { text: "가족 내 갈등 — 도려낸 것은 A?", leadsTo: "suspect_a" },
        b: { text: "피해자가 A와의 관계를 정리하려 했다", leadsTo: null }
      },
      resolvedBy: [],
      phase: 1,
      isKey: false
    },
    {
      id: "ev_wine",
      name: "와인잔의 립스틱",
      location: "living_room",
      foundIn: "obj_wine_glasses",
      description: "두 잔 중 하나에 립스틱 흔적.",
      interpretations: {
        a: { text: "B가 피해자와 와인을 마셨다 — 사건 당시 함께 있었다", leadsTo: "suspect_b" },
        b: { text: "B가 거실에 있었다면 서재에 간 것은 다른 사람", leadsTo: null }
      },
      resolvedBy: ["ev_footprints"],
      phase: 1,
      isKey: true
    },
    {
      id: "ev_footprints",
      name: "정원 발자국",
      location: "garden",
      foundIn: "obj_footprints",
      description: "구두 발자국. 270mm. 담장 쪽으로 사라짐.",
      interpretations: {
        a: { text: "C의 것 — C는 정원에서 전화했다고 증언", leadsTo: "suspect_c" },
        b: { text: "누군가 담장 너머로 도주 — 외부인 가능성?", leadsTo: null }
      },
      resolvedBy: ["ev_wine"],
      phase: 2,
      isKey: false
    },
    {
      id: "ev_prescription_memo",
      name: "빈 약 봉지",
      location: "garden",
      foundIn: "obj_shiny",
      description: "디곡신 0.25mg 빈 봉지. 피해자 이름 없음.",
      interpretations: {
        a: { text: "피해자의 약 — 정원에서 버린 것", leadsTo: null },
        b: { text: "교체용 약의 원래 포장 — 범인이 정원에 버림", leadsTo: "suspect_a" }
      },
      resolvedBy: ["ev_pills"],
      phase: 2,
      isKey: true
    }
  ],

  // ━━━ 증언 ━━━
  testimonies: {
    suspect_a: {
      initial: [
        {
          id: "ta_alibi",
          topic: "alibi",
          text: "그날 밤 저는 거실에서 TV를 보고 있었습니다. 9시쯤 삼촌이 서재에서 약을 드시는 걸 봤어요. 건강해 보였습니다.",
          truthful: false,
          lieDetail: "실제로는 21시에 A가 서재에 가서 약을 교체했음"
        },
        {
          id: "ta_relation",
          topic: "relationship",
          text: "삼촌과는... 사이가 좋았습니다. 어릴 때부터 저를 아들처럼 키워주셨으니까요.",
          truthful: true
        }
      ],
      onEvidence: {
        ev_iou: {
          text: "그 차용증은... 사적인 문제입니다. 삼촌한테 빌린 거예요. 곧 갚을 예정이었습니다.",
          reaction: "tense",
          reveals: null
        },
        ev_pills: {
          text: "약은 삼촌이 늘 드시던 심장약 아닌가요? 전 약에 대해 잘 모릅니다.",
          reaction: "calm",
          reveals: null
        },
        ev_photo: {
          text: "...그 사진은 오래된 거예요. 누가 그랬는진 모르겠습니다.",
          reaction: "tense",
          reveals: null
        }
      },
      onContradiction: {
        time_conflict: {
          text: "아... 9시가 아니라 10시였을 수도 있습니다. 정확히 기억이 나지 않아서...",
          reaction: "shaken",
          senseDescription: "박준혁의 손이 무릎 위에서 움직였다. 시선이 왼쪽 아래로 흘렀다.",
          reveals: "ev_time_correction",
          newQuestions: ["tq_why_time_change", "tq_where_at_nine"]
        }
      }
    },
    suspect_b: {
      initial: [
        {
          id: "tb_alibi",
          topic: "alibi",
          text: "그날 밤이요? 저는 거실에서 책을 읽고 있었습니다. 10시쯤... 피해자분이 서재로 들어가는 걸 봤어요.",
          truthful: true
        },
        {
          id: "tb_medical",
          topic: "medical",
          text: "피해자분의 건강 상태는 양호했습니다. 심장약만 꾸준히 드시면 문제없었어요.",
          truthful: true
        }
      ],
      onEvidence: {
        ev_wine: {
          text: "네, 피해자분과 와인을 한 잔 했습니다. 8시쯤이요. 그 뒤로 전 혼자 거실에 있었고요.",
          reaction: "calm",
          reveals: null
        },
        ev_pills: {
          text: "그 케이스... 이상하네요. 라벨이 왜 찢어져 있죠? 제가 드린 약에는 분명 라벨이 온전했는데.",
          reaction: "tense",
          reveals: null
        },
        ev_prescription_memo: {
          text: "디곡신이요? 피해자분의 약은 디곡신이 아니라 아미오다론이었는데... 이건 피해자분 약이 아닙니다.",
          reaction: "shaken",
          senseDescription: "한서연의 눈이 커졌다. 약 봉지를 다시 한 번 쳐다봤다.",
          reveals: "ev_drug_mismatch"
        }
      },
      onContradiction: {}
    },
    suspect_c: {
      initial: [
        {
          id: "tc_alibi",
          topic: "alibi",
          text: "저는 정원에서 사무실에 전화를 걸고 있었습니다. 비가 와서 일찍 들어왔고요. 8시 반쯤 객실로 갔습니다.",
          truthful: true
        },
        {
          id: "tc_legal",
          topic: "legal",
          text: "김 선생님의 유산 관련 법률 문서를 정리하고 있었습니다. 기부 계획 관련이요.",
          truthful: true
        }
      ],
      onEvidence: {
        ev_footprints: {
          text: "정원 발자국이요? 제 것일 수 있습니다. 제가 정원에서 전화했으니까요. 신발은... 270이 맞습니다.",
          reaction: "tense",
          reveals: null
        }
      },
      onContradiction: {}
    }
  },

  // ━━━ 동적 생성 질문 규칙 ━━━
  questionRules: {
    evidenceBased: [
      { evidenceId: "ev_pills", suspectId: "suspect_a", questionId: "q_pills_a", text: "서재의 약 케이스에 대해 아십니까?" },
      { evidenceId: "ev_pills", suspectId: "suspect_b", questionId: "q_pills_b", text: "피해자의 약을 마지막으로 확인한 게 언제입니까?" },
      { evidenceId: "ev_iou", suspectId: "suspect_a", questionId: "q_iou_a", text: "이 차용증에 대해 설명해주시겠습니까?" },
      { evidenceId: "ev_wine", suspectId: "suspect_b", questionId: "q_wine_b", text: "피해자와 와인을 드셨다고요?" },
      { evidenceId: "ev_footprints", suspectId: "suspect_c", questionId: "q_foot_c", text: "정원의 발자국이 당신 것입니까?" },
      { evidenceId: "ev_prescription_memo", suspectId: "suspect_b", questionId: "q_drug_b", text: "이 약 봉지를 보시겠습니까?" },
      { evidenceId: "ev_photo", suspectId: "suspect_a", questionId: "q_photo_a", text: "복도의 가족 사진에 대해 아십니까?" }
    ],
    contradictionBased: [
      { contradictionId: "time_conflict", suspectId: "suspect_a", questionId: "q_catch_time", text: "10시라 하셨는데, 다른 분은 9시라 했습니다." }
    ],
    followUp: {
      tq_why_time_change: { suspectId: "suspect_a", text: "왜 처음에 9시라고 하셨습니까?" },
      tq_where_at_nine: { suspectId: "suspect_a", text: "9시에 정확히 어디 계셨습니까?" }
    }
  },

  // ━━━ 모순 감지 규칙 ━━━
  contradictionRules: [
    {
      id: "time_conflict",
      description: "A와 B의 시간 증언 불일치",
      condition: {
        requires: ["ta_alibi", "tb_alibi"],
        check: "A는 '9시에 삼촌이 서재에서 약을 드시는 걸 봤다'고 했으나, B는 '10시에 피해자가 서재로 들어가는 걸 봤다'고 함"
      },
      displayText: "A는 \"9시에 삼촌이 서재에서 약을 드셨다\"고 했으나, B는 \"10시에 서재로 들어가는 걸 봤다\"고 증언",
      targetSuspect: "suspect_a"
    }
  ],

  // ━━━ 오판 곡선 ━━━ [Bible §4]
  misbelief: {
    firstSuspect: "suspect_b",
    firstSuspectReason: "간호사 = 약에 접근 가능 + 의료 과실 비밀 + 와인잔 립스틱 = 마지막으로 함께 있었음",
    supportingEvidence: ["ev_wine", "ev_pills"],
    supportingNarrative: "B는 간호사이므로 약에 접근할 수 있고, 과실 비밀이 있으므로 동기가 있어 보인다",
    collapseEvidence: "ev_prescription_memo",
    collapseNarrative: "B가 '피해자의 약은 디곡신이 아니라 아미오다론'이라고 즉시 밝힘 — B가 약을 교체했다면 자기 함정을 스스로 드러내는 셈",
    upperInsight: "약에 대해 가장 잘 아는 사람(간호사)이 약의 불일치를 가장 먼저 알아챈다 — 범인이라면 절대 하지 않을 행동",
    truePathEvidence: ["ev_pills", "ev_iou", "ev_prescription_memo"]
  },

  // ━━━ 정답 판정 ━━━
  solution: {
    culprit: "suspect_a",
    requiredEvidence: ["ev_pills", "ev_iou", "ev_prescription_memo"],
    narrative: "박준혁은 삼촌의 유산 기부 계획을 알고, 도박 빚 3억을 상속으로 갚으려 했다. 삼촌의 심장약(아미오다론)을 독성이 있는 디곡신으로 교체했다. 디곡신은 과량 시 심장마비를 일으키며, 기존 심장약과 외형이 유사하다.",
    trickExplanation: "약효 지연을 이용해 사망 시각을 실제보다 늦게 보이도록 유도. 약 교체는 21시에 했지만, 피해자가 약을 복용한 것은 22시경. A는 21:30부터 거실에서 B와 함께 있었으므로 알리바이가 성립하는 것처럼 보였다.",
    evidenceReinterpretation: {
      ev_whisky: "얼음이 녹지 않은 위스키는 사건 직후가 아니라, 피해자가 약을 복용한 직후(22시) 따른 것이었다 — 사망은 여러분이 생각한 것보다 늦게 시작되었다.",
      ev_pills: "찢긴 라벨은 약 교체 후 원래 약명(아미오다론)이 남아있는 것을 숨기기 위한 것이었다.",
      ev_prescription_memo: "정원의 빈 약 봉지는 A가 교체용 디곡신의 포장을 버린 것이다. 장미 덤불 뒤에 숨겼지만 비에 씻겨 나왔다.",
      ev_footprints: "발자국은 C의 것이 맞았다. C는 실제로 정원에서 전화했다. 미끼 증거.",
      ev_wine: "B가 피해자와 와인을 마신 것은 사실. B는 거실에 있었으므로 서재의 약에 접근할 기회가 없었다."
    },
    wrongAccusationFeedback: {
      suspect_b: {
        text: "한서연은 피해자의 약이 디곡신이 아니라 아미오다론이라는 것을 즉시 알아챘습니다. 범인이라면 왜 자신의 범행을 드러내는 정보를 자발적으로 제공했겠습니까?",
        hint: "약에 대해 모르는 척한 사람이 누구였는지 다시 생각해보십시오."
      },
      suspect_c: {
        text: "이도윤의 정원 발자국은 실제로 전화 통화 때 남긴 것이었습니다. 발자국의 존재만으로는 범행과 연결되지 않습니다.",
        hint: "약 케이스의 라벨이 왜 찢겨 있었는지에 집중하십시오."
      }
    }
  }
};
```

### 4.2 GameState

```javascript
// src/state/game-state.js
export class GameState {
  constructor() {
    this.currentCase = null;
    this.phase = 'TITLE';
    this.currentRoom = null;
    this.visitedRooms = new Set();
    this.examinedObjects = new Set();
    this.questionedSuspects = new Set();
    this.askedQuestions = new Set();
    this.triggeredContradictions = new Set();
    this.notebook = null;
    this.result = null;
  }

  loadCase(caseData) { /* Case 로드, notebook 초기화 */ }
  setPhase(phase) { /* phase 변경 */ }
  enterRoom(roomId) { /* currentRoom 변경, visitedRooms에 추가 */ }
  examineObject(objectId) { /* examinedObjects에 추가 */ }
  getCurrentRoom() { /* 현재 방 객체 반환 */ }
  getAdjacentRooms() { /* 인접 방 목록 반환 */ }
  getAvailableQuestions(suspectId) { /* 미사용 질문 중 조건 충족된 것 반환 */ }
  canAccuse() { /* 고발 가능 여부: 증거 2개 이상 */ }
}
```

### 4.3 NotebookState

```javascript
// src/state/notebook-state.js
export class NotebookState {
  constructor() {
    this.foundEvidence = [];
    this.heardTestimonies = [];
    this.contradictions = [];
    this.currentHypothesis = null;
  }

  addEvidence(evidence) { /* 중복 체크 후 추가 */ }
  addTestimony(testimony) { /* 추가 */ }
  addContradiction(contradiction) { /* 중복 체크 후 추가 */ }
  setHypothesis(suspectId) { /* 가설 변경 */ }
  hasEvidence(evidenceId) { /* boolean */ }
  hasTestimony(testimonyId) { /* boolean */ }
  hasContradiction(contradictionId) { /* boolean */ }
  getEvidenceForSuspect(suspectId) { /* 특정 용의자와 연결된 증거 배열 */ }
  getContradictionsForSuspect(suspectId) { /* 특정 용의자의 모순 배열 */ }
}
```

---

## 5. 핵심 알고리즘

### 5.1 모순 감지 알고리즘

```javascript
// src/core/testimony-engine.js

/**
 * 새 증언이 추가될 때 호출. 기존 증언/증거와 모순이 있는지 검사.
 * @param {Object} newTestimony - 방금 들은 증언
 * @param {NotebookState} notebook - 현재 수첩 상태
 * @param {Object[]} contradictionRules - Case의 contradictionRules
 * @returns {Object|null} 감지된 모순 또는 null
 */
export function detectContradiction(newTestimony, notebook, contradictionRules) {
  for (const rule of contradictionRules) {
    if (notebook.hasContradiction(rule.id)) continue;

    const allRequirementsMet = rule.condition.requires.every(
      testimonyId => notebook.hasTestimony(testimonyId) || newTestimony.id === testimonyId
    );

    if (allRequirementsMet) {
      return {
        id: rule.id,
        description: rule.description,
        displayText: rule.displayText,
        targetSuspect: rule.targetSuspect
      };
    }
  }
  return null;
}
```

### 5.2 질문 생성 알고리즘

```javascript
// src/core/testimony-engine.js

/**
 * 특정 용의자에게 할 수 있는 질문 목록 생성.
 * @param {string} suspectId
 * @param {NotebookState} notebook
 * @param {GameState} gameState
 * @param {Object} questionRules - Case의 questionRules
 * @returns {Object[]} 활성화된 질문 목록 (최대 4개)
 */
export function generateQuestions(suspectId, notebook, gameState, questionRules) {
  const questions = [];

  // 1. 증거 기반 질문
  for (const rule of questionRules.evidenceBased) {
    if (rule.suspectId !== suspectId) continue;
    if (gameState.askedQuestions.has(rule.questionId)) continue;
    if (!notebook.hasEvidence(rule.evidenceId)) continue;
    questions.push({ id: rule.questionId, text: rule.text, type: 'evidence', source: rule.evidenceId });
  }

  // 2. 모순 기반 질문 (짚기)
  for (const rule of questionRules.contradictionBased) {
    if (rule.suspectId !== suspectId) continue;
    if (gameState.askedQuestions.has(rule.questionId)) continue;
    if (!notebook.hasContradiction(rule.contradictionId)) continue;
    questions.push({ id: rule.questionId, text: rule.text, type: 'catch', source: rule.contradictionId });
  }

  // 3. 심화 질문 (짚기 후)
  for (const [qId, rule] of Object.entries(questionRules.followUp || {})) {
    if (rule.suspectId !== suspectId) continue;
    if (gameState.askedQuestions.has(qId)) continue;
    questions.push({ id: qId, text: rule.text, type: 'followup' });
  }

  // 최대 4개로 제한 [Bible R1]
  return questions.slice(0, 4);
}
```

### 5.3 고발 판정 알고리즘

```javascript
// src/core/accusation.js

/**
 * @param {string} suspectId - 지목한 용의자
 * @param {string[]} evidenceIds - 제시한 증거 id 배열
 * @param {Object} solution - Case의 solution
 * @returns {Object} { correct: boolean, narrative?, feedback?, reinterpretation? }
 */
export function judgeAccusation(suspectId, evidenceIds, solution) {
  const correctCulprit = suspectId === solution.culprit;
  const matchingEvidence = evidenceIds.filter(id => solution.requiredEvidence.includes(id));
  const correct = correctCulprit && matchingEvidence.length >= 2;

  if (correct) {
    return {
      correct: true,
      narrative: solution.narrative,
      trickExplanation: solution.trickExplanation,
      reinterpretation: solution.evidenceReinterpretation
    };
  } else {
    const feedback = solution.wrongAccusationFeedback[suspectId] || {
      text: "증거가 충분하지 않습니다.",
      hint: "다시 한 번 증거를 검토해보십시오."
    };
    return { correct: false, feedback };
  }
}
```

---

## 6. main.js — 게임 오케스트레이터

```javascript
// src/main.js
import { EventBus } from './utils/events.js';
import { GameState } from './state/game-state.js';
import { NotebookState } from './state/notebook-state.js';
import { Renderer } from './ui/renderer.js';
import { detectContradiction, generateQuestions } from './core/testimony-engine.js';
import { judgeAccusation } from './core/accusation.js';
import CASE_DATA from './data/handcrafted/case-alpha-001.json' assert { type: 'json' };

const bus = new EventBus();
const state = new GameState();
const renderer = new Renderer(document.getElementById('app'), bus);

// ━━ 게임 시작 ━━
bus.on('GAME_START', () => {
  state.loadCase(CASE_DATA);
  state.notebook = new NotebookState();
  state.setPhase('DISCOVERY');
  renderer.render(state);
});

// ━━ 방 이동 ━━
bus.on('ROOM_ENTER', ({ roomId }) => {
  state.enterRoom(roomId);
  renderer.render(state);
});

// ━━ 오브젝트 조사 ━━
bus.on('OBJECT_EXAMINE', ({ objectId }) => {
  state.examineObject(objectId);
  const obj = state.getCurrentRoom().objects.find(o => o.id === objectId);
  if (obj?.evidenceId) {
    const evidence = state.currentCase.evidence.find(e => e.id === obj.evidenceId);
    if (evidence && !state.notebook.hasEvidence(evidence.id)) {
      state.notebook.addEvidence(evidence);
      bus.emit('EVIDENCE_FOUND', { evidence });
    }
  }
  renderer.render(state);
});

// ━━ 질문 ━━
bus.on('QUESTION_ASK', ({ suspectId, questionId }) => {
  state.askedQuestions.add(questionId);
  const testimonies = state.currentCase.testimonies[suspectId];

  let response = null;
  const qRule = state.currentCase.questionRules.evidenceBased.find(r => r.questionId === questionId);
  if (qRule && testimonies.onEvidence[qRule.evidenceId]) {
    response = testimonies.onEvidence[qRule.evidenceId];
  }

  const catchRule = state.currentCase.questionRules.contradictionBased.find(r => r.questionId === questionId);
  if (catchRule && testimonies.onContradiction[catchRule.contradictionId]) {
    response = testimonies.onContradiction[catchRule.contradictionId];
    state.triggeredContradictions.add(catchRule.contradictionId);
    bus.emit('CATCH_RESULT', {
      suspectId,
      reaction: response.reaction,
      senseDescription: response.senseDescription,
      reveals: response.reveals,
      newQuestions: response.newQuestions
    });
    renderer.render(state);
    return;
  }

  if (response) {
    const testimony = { suspectId, id: questionId, text: response.text, reaction: response.reaction };
    state.notebook.addTestimony(testimony);
    bus.emit('TESTIMONY_RECEIVED', { testimony });

    const contradiction = detectContradiction(testimony, state.notebook, state.currentCase.contradictionRules);
    if (contradiction) {
      state.notebook.addContradiction(contradiction);
      bus.emit('CONTRADICTION_FOUND', { contradiction });
    }
  }
  renderer.render(state);
});

// ━━ 단계 전환 ━━
bus.on('PHASE_READY', ({ nextPhase }) => {
  state.setPhase(nextPhase);
  renderer.render(state);
});

// ━━ 가설 변경 ━━
bus.on('HYPOTHESIS_SET', ({ suspectId }) => {
  state.notebook.setHypothesis(suspectId);
  renderer.render(state);
});

// ━━ 고발 ━━
bus.on('ACCUSE', ({ suspectId, evidenceIds }) => {
  const result = judgeAccusation(suspectId, evidenceIds, state.currentCase.solution);
  state.result = result;
  state.setPhase(result.correct ? 'RESULT_WIN' : 'RESULT_LOSE');
  renderer.render(state);
});

// 앱 시작
renderer.render(state);
```

---

## 7. UI 화면별 구현 명세

### 7.1 BaseScreen

```javascript
// src/ui/screens/base-screen.js
export class BaseScreen {
  constructor(bus) { this.bus = bus; this.container = null; }
  mount(container, state) {
    this.container = container;
    container.innerHTML = this.render(state);
    this.bindEvents(container, state);
  }
  update(state) { this.mount(this.container, state); }
  render(state) { return ''; }
  bindEvents(container, state) {}
  destroy() { this.container = null; }
}
```

### 7.2 SceneScreen (장소 화면) — 핵심 화면

```
┌──────────────────────────────────────────────────┐
│  header: 방 이름                     [수첩] 📓    │
│──────────────────────────────────────────────────│
│  .scene-body                                     │
│    .scene-description                            │
│      감각 중심 묘사 텍스트 (typewriter 효과)       │
│                                                  │
│    .scene-objects                                 │
│      ▸ 오브젝트 1                                │
│      ▸ 오브젝트 2                                │
│      ▸ 오브젝트 3                                │
│                                                  │
│  .scene-nav                                      │
│    [← 복도로] [→ 거실로]                          │
│    [용의자를 만난다] (QUESTION 전환 버튼)          │
│    [범인을 지목한다] (ACCUSE 전환, 조건부)          │
│──────────────────────────────────────────────────│
│  .map-widget: 약도 (현재 위치 하이라이트)           │
└──────────────────────────────────────────────────┘
```

### 7.3 CharacterScreen (인물 화면)

```
┌──────────────────────────────────────────────────┐
│  header: "탐문: [인물명]"              [수첩] 📓  │
│──────────────────────────────────────────────────│
│  .character-body                                 │
│    .portrait (초상, 표정 상태에 따라 변경)          │
│    .testimony-text (증언 텍스트, 대화체)           │
│                                                  │
│  .contradiction-bar (조건부 표시)                  │
│    ⚠ "A는 9시라 했으나 B는 10시라 증언"            │
│                                                  │
│  .question-choices (최대 4개)                     │
│    ▸ 질문 1 (증거 기반)                           │
│    ▸ 질문 2 (증거 기반)                           │
│    ▸ 질문 3 (짚기 — 적갈색 강조)                  │
│    ▸ 대화를 끝낸다                                │
│──────────────────────────────────────────────────│
```

### 7.4 CatchScreen (짚기 연출)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  .portrait (표정 변화 애니메이션: calm → shaken)    │
│                                                  │
│  .catch-quote                                    │
│    ❝ 10시라 하셨는데, 다른 분은 9시라 했습니다. ❞  │
│                                                  │
│  ┈┈┈┈┈┈┈ (구분선) ┈┈┈┈┈┈┈                       │
│                                                  │
│  .sense-description (감각 묘사, 이탤릭)            │
│    "박준혁의 손이 무릎 위에서 움직였다."            │
│                                                  │
│  .catch-response (용의자 반응)                     │
│    "아... 9시가 아니라 10시였을 수도 있습니다."     │
│                                                  │
│  💡 기록: B의 시간 증언 동요                       │
│                                                  │
│  .followup-questions (심화 질문)                   │
│    ▸ "왜 처음에 9시라고 하셨습니까?"               │
│    ▸ "9시에 정확히 어디 계셨습니까?"               │
│    ▸ (더 추궁하지 않는다)                          │
│──────────────────────────────────────────────────│
```

### 7.5 AccusationScreen (고발 화면)

```
┌──────────────────────────────────────────────────┐
│              고발                                 │
│──────────────────────────────────────────────────│
│                                                  │
│  "범인으로 지목합니다:"                            │
│                                                  │
│  .suspect-cards (인물 카드 나란히)                  │
│    [A 박준혁] [B 한서연] [C 이도윤]                │
│      ↑ 선택됨 (테두리 강조)                        │
│                                                  │
│  "근거 증거를 선택하십시오 (2~3개):"               │
│    ☑ 약 케이스                                    │
│    ☑ 차용증                                       │
│    ☐ 위스키 잔                                    │
│    ☐ 정원 발자국                                  │
│    ...                                           │
│                                                  │
│  [ 고발하기 ] (2개 이상 선택 시 활성화)             │
│  "이 결정은 되돌릴 수 없습니다."                    │
│──────────────────────────────────────────────────│
```

### 7.6 ResultScreen (결과 화면)

정답: `solution.narrative` + `trickExplanation` + 증거별 `reinterpretation` 순서로 표시.
오답: `feedback.text` + `feedback.hint` 표시. "다음 사건으로" 버튼.

---

## 8. CSS 설계 토큰

```css
/* src/ui/styles/variables.css — 전체 디자인 시스템 */
:root {
  /* 색상 */
  --bg-primary: #0a0e17;
  --bg-secondary: #111827;
  --bg-card: #1a2235;
  --bg-overlay: rgba(10, 14, 23, 0.92);

  --text-primary: #e8e0d4;
  --text-secondary: #8b9bb4;
  --text-muted: #4a5568;

  --accent-gold: #d4a857;
  --accent-red: #c45c4a;
  --accent-green: #5b8a72;

  --suspect-a: #4a9ea8;
  --suspect-b: #8b5ca8;
  --suspect-c: #7a8a4a;

  --border-subtle: #1e2a3a;
  --border-highlight: #2a3a4a;

  /* 서체 */
  --font-narrative: 'Noto Serif KR', 'Nanum Myeongjo', serif;
  --font-dialogue: 'Pretendard', 'Apple SD Gothic Neo', sans-serif;
  --font-system: 'JetBrains Mono', 'D2Coding', monospace;

  /* 간격 */
  --space-xs: 4px;  --space-sm: 8px;  --space-md: 16px;
  --space-lg: 24px; --space-xl: 40px; --space-2xl: 64px;

  /* 전환 */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --transition-fast: 150ms var(--ease-out);
  --transition-normal: 300ms var(--ease-out);
  --transition-slow: 600ms var(--ease-out);

  /* 레이아웃 */
  --max-width: 720px;
  --border-radius: 4px;
  --border-radius-lg: 8px;
}
```

---

## 9. Phase α 구현 지시서

### 이것만 먼저 만든다. 나머지는 이것이 재미있을 때만.

**Phase α 목표**: 하드코딩 케이스 1개(`case-alpha-001.json`)로 "조사 → 탐문 → 고발"이 작동하는가 검증.

### 구현 순서 (Claude Code 작업 단위)

```
Step 1: 기반 구조
  - index.html + main.js + events.js
  - variables.css + layout.css
  - GameState + NotebookState 클래스 (빈 구현)

Step 2: 데이터 로드
  - case-alpha-001.json (이 문서 §4.1의 전체 내용)
  - main.js에서 JSON import

Step 3: 장소 화면
  - base-screen.js + scene-screen.js + examine-screen.js
  - 방 이동 + 오브젝트 조사 + 증거 발견
  - choice-panel.js + map-widget.js 컴포넌트

Step 4: 인물 화면
  - character-screen.js
  - 질문 표시 + 증언 수신 + testimony-engine.js 연동
  - portrait.js 컴포넌트

Step 5: 모순 감지 + 짚기
  - contradiction-bar.js
  - catch-screen.js
  - detectContradiction 함수 구현

Step 6: 고발 + 결과
  - accusation-screen.js + result-screen.js
  - accusation.js의 judgeAccusation 구현

Step 7: 수첩
  - notebook-screen.js (오버레이)
  - 4구획: 증거/증언/모순/가설

Step 8: 연결 + 폴리시
  - 전체 게임 플로우 연결
  - 화면 전환 애니메이션
  - typography.css + animations.css + screens.css
  - title-screen.js + discovery-screen.js
```

### Phase α에서 구현하지 않는 것

- 케이스 생성기 (case-generator.js, misbelief-engine.js)
- evidence-graph.js, validator.js
- 시드 기반 랜덤 (random.js)
- 텍스트 템플릿 치환 (text-template.js)
- 타이핑 효과 (typewriter.js)
- 삽화/이미지

---

## 10. Phase β~δ 로드맵 요약

| Phase | 추가 구현 | 검증 질문 |
|-------|-----------|-----------|
| **β** (2~3주) | 모순 알림 바 연출 강화, 짚기 3요소 완성, 수첩 4구획, 질문 동적 생성 | "짚는 순간 '잡았다'가 느껴지는가?" |
| **γ** (3~4주) | 완전한 5스텝, 오판 곡선 전체 체험, 결과 화면 증거 재해석, 오답 피드백 | "오판→재구성의 쾌감이 자연스러운가?" |
| **δ** (5~6주) | case-generator.js, misbelief-engine.js, evidence-graph.js, validator.js, 콘텐츠 풀 5종×5종, 삽화 | "10케이스 연속 플레이 시 각각 다른 재미?" |

---

## 11. Claude Code 작업 패턴

각 파일을 독립적으로 구현 의뢰할 때의 프롬프트 템플릿:

```bash
# 패턴: 파일명 + 역할 + 입출력 + 참조 문서
claude "src/core/testimony-engine.js를 구현해줘.

역할: 증언 엔진. 모순 감지 + 질문 생성.

export 함수:
1. detectContradiction(newTestimony, notebook, contradictionRules) → Object|null
2. generateQuestions(suspectId, notebook, gameState, questionRules) → Object[]

알고리즘은 blueprint.md §5.1, §5.2 참조.
데이터 스키마는 blueprint.md §4.1의 contradictionRules, questionRules 참조.
질문 최대 4개 제한 (design-bible.md 제한 R1)."
```

---

## 12. 설계 원칙 ↔ 코드 매핑

| Bible 원칙 | 코드 위치 | 구현 방법 |
|---|---|---|
| 오판이 범행보다 먼저 [§4] | case-generator Step 1 | misbelief-engine.js가 첫 단계 |
| 증거 2해석 [§5.1] | Case.evidence[].interpretations | 모든 evidence에 a/b 필수 |
| 조사→탐문 순환 [§3.2] | questionRules.evidenceBased | 발견 증거가 질문을 생성 |
| 짚기의 정점 [§6.1] | catch-screen.js | 별도 화면 + 3요소 연출 |
| 고발 비가역성 [§8] | accusation.js | 1회 판정, 되돌림 없음 |
| 한 화면 한 판단 [§12.1] | screens/*.js | 화면당 1가지 행위 모드 |
| 모순 알림 바 조건부 [§12.4] | contradiction-bar.js | notebook.contradictions 검사 |
| core↔ui 분리 | events.js | 이벤트 버스 경유만 허용 |
