/**
 * 모순 알림 바 렌더링
 * @param {Object[]} contradictions - 현재 용의자 관련 모순 배열
 * @returns {string} HTML (비어있으면 빈 문자열)
 */
export function renderContradictionBar(contradictions) {
  if (!contradictions || contradictions.length === 0) return '';

  return contradictions.map(c =>
    `<div class="contradiction-bar">
      <span class="contradiction-icon">&#9888;</span>
      <span class="contradiction-text">${c.displayText}</span>
    </div>`
  ).join('');
}
