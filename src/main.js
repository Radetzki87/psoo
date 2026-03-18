import { EventBus } from './utils/events.js';
import { GameState } from './state/game-state.js';
import { Renderer } from './ui/renderer.js';
import { detectContradiction } from './core/testimony-engine.js';
import { judgeAccusation } from './core/accusation.js';

const bus = new EventBus();
const state = new GameState();
const renderer = new Renderer(document.getElementById('app'), bus);

// ━━ 게임 시작 ━━
bus.on('GAME_START', async () => {
  const response = await fetch('./src/data/handcrafted/case-alpha-001.json');
  const caseData = await response.json();
  state.loadCase(caseData);
  state.setPhase('DISCOVERY');
  renderer.render(state);
});

// ━━ 게임 재시작 ━━
bus.on('GAME_RESTART', () => {
  Object.assign(state, new GameState());
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
  const room = state.getCurrentRoom();
  const obj = room?.objects.find(o => o.id === objectId);
  if (obj?.evidenceId) {
    const evidence = state.currentCase.evidence.find(e => e.id === obj.evidenceId);
    if (evidence && !state.notebook.hasEvidence(evidence.id)) {
      state.notebook.addEvidence(evidence);
    }
  }
  renderer.render(state);
});

// ━━ 조사 클로즈업 닫기 ━━
bus.on('EXAMINE_CLOSE', () => {
  state.clearExamine();
  renderer.render(state);
});

// ━━ 용의자 선택 ━━
bus.on('SUSPECT_SELECT', ({ suspectId }) => {
  state.selectedSuspectId = suspectId;
  if (suspectId) {
    state.questionedSuspects.add(suspectId);
  }
  renderer.render(state);
});

// ━━ 초기 증언 듣기 ━━
bus.on('INITIAL_TESTIMONY', ({ suspectId }) => {
  const testimonies = state.currentCase.testimonies[suspectId];
  if (!testimonies) return;

  state.heardInitialTestimonies[suspectId] = true;

  for (const t of testimonies.initial) {
    const testimony = { suspectId, id: t.id, topic: t.topic, text: t.text };
    state.notebook.addTestimony(testimony);

    // 모순 감지
    const contradiction = detectContradiction(testimony, state.notebook, state.currentCase.contradictionRules);
    if (contradiction) {
      state.notebook.addContradiction(contradiction);
    }
  }
  renderer.render(state);
});

// ━━ 질문 ━━
bus.on('QUESTION_ASK', ({ suspectId, questionId }) => {
  state.askedQuestions.add(questionId);
  const testimonies = state.currentCase.testimonies[suspectId];
  if (!testimonies) return;

  // 짚기 질문 체크
  const catchRule = state.currentCase.questionRules.contradictionBased.find(r => r.questionId === questionId);
  if (catchRule && testimonies.onContradiction[catchRule.contradictionId]) {
    const response = testimonies.onContradiction[catchRule.contradictionId];
    state.triggeredContradictions.add(catchRule.contradictionId);

    // 용의자 표정 변화
    const suspect = state.currentCase.suspects.find(s => s.id === suspectId);
    if (suspect) suspect.portraitState = response.reaction;

    state.catchData = {
      suspectId,
      catchQuestion: catchRule.text || state.currentCase.questionRules.contradictionBased.find(r => r.questionId === questionId)?.text,
      text: response.text,
      reaction: response.reaction,
      senseDescription: response.senseDescription,
      reveals: response.reveals,
      newQuestions: response.newQuestions
    };
    state.setPhase('CATCH');
    renderer.render(state);
    return;
  }

  // 증거 기반 질문
  const evidenceRule = state.currentCase.questionRules.evidenceBased.find(r => r.questionId === questionId);
  if (evidenceRule && testimonies.onEvidence[evidenceRule.evidenceId]) {
    const response = testimonies.onEvidence[evidenceRule.evidenceId];
    const testimony = { suspectId, id: questionId, text: response.text, reaction: response.reaction };
    state.notebook.addTestimony(testimony);

    // 용의자 표정 변화
    const suspect = state.currentCase.suspects.find(s => s.id === suspectId);
    if (suspect && response.reaction) suspect.portraitState = response.reaction;

    // 모순 감지
    const contradiction = detectContradiction(testimony, state.notebook, state.currentCase.contradictionRules);
    if (contradiction) {
      state.notebook.addContradiction(contradiction);
    }

    // reveals 처리 (B가 약 불일치 밝힘 등)
    if (response.senseDescription) {
      state.catchData = {
        suspectId,
        catchQuestion: evidenceRule.text,
        text: response.text,
        reaction: response.reaction,
        senseDescription: response.senseDescription,
        reveals: response.reveals,
        newQuestions: null
      };
      state.setPhase('CATCH');
      renderer.render(state);
      return;
    }
  }

  // 심화 질문 (followUp)
  const followUp = state.currentCase.questionRules.followUp?.[questionId];
  if (followUp) {
    const testimony = { suspectId, id: questionId, text: '(심화 질문에 대한 답변)', reaction: 'tense' };
    state.notebook.addTestimony(testimony);
  }

  renderer.render(state);
});

// ━━ 짚기 종료 ━━
bus.on('CATCH_END', () => {
  state.catchData = null;
  state.setPhase('QUESTION');
  renderer.render(state);
});

// ━━ 단계 전환 ━━
bus.on('PHASE_READY', ({ nextPhase }) => {
  if (nextPhase === 'QUESTION') {
    state.selectedSuspectId = null;
  }
  state.setPhase(nextPhase);
  renderer.render(state);
});

// ━━ 수첩 열기/닫기 ━━
bus.on('NOTEBOOK_OPEN', () => {
  renderer.showNotebook(state);
});

bus.on('NOTEBOOK_CLOSE', () => {
  renderer.hideNotebook();
});

// ━━ 가설 변경 ━━
bus.on('HYPOTHESIS_SET', ({ suspectId }) => {
  state.notebook.setHypothesis(suspectId);
  renderer.showNotebook(state);
});

// ━━ 고발 ━━
bus.on('ACCUSE', ({ suspectId, evidenceIds }) => {
  const result = judgeAccusation(suspectId, evidenceIds, state.currentCase.solution);
  state.result = result;
  state.setPhase(result.correct ? 'RESULT_WIN' : 'RESULT_LOSE');
  renderer.render(state);
});

// ━━ 앱 시작 ━━
renderer.render(state);
