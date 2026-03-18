/**
 * @param {string} suspectId - 지목한 용의자
 * @param {string[]} evidenceIds - 제시한 증거 id 배열
 * @param {Object} solution - Case의 solution
 * @returns {Object} { correct, narrative?, trickExplanation?, reinterpretation?, feedback? }
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
