/**
 * 새 증언이 추가될 때 기존 증언/증거와 모순이 있는지 검사.
 * @param {Object} newTestimony - 방금 들은 증언
 * @param {import('../state/notebook-state.js').NotebookState} notebook
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

/**
 * 특정 용의자에게 할 수 있는 질문 목록 생성.
 * @param {string} suspectId
 * @param {import('../state/notebook-state.js').NotebookState} notebook
 * @param {import('../state/game-state.js').GameState} gameState
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
    const hasRelatedCatch = gameState.triggeredContradictions.size > 0;
    if (!hasRelatedCatch) continue;
    questions.push({ id: qId, text: rule.text, type: 'followup' });
  }

  return questions.slice(0, 4);
}
