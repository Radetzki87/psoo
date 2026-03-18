/**
 * 인물 초상 렌더링 (CSS 기반 표정 상태)
 * @param {Object} suspect - 용의자 객체
 * @param {string} state - calm | tense | shaken
 * @returns {string} HTML
 */
export function renderPortrait(suspect, state = 'calm') {
  const stateEmoji = { calm: '', tense: '...', shaken: '!!' };
  const initial = suspect.name.charAt(0);

  return `<div class="portrait portrait--${state}" style="border-color: ${suspect.color}">
    <div class="portrait-initial" style="color: ${suspect.color}">${initial}</div>
    <div class="portrait-name">${suspect.name}</div>
    <div class="portrait-role">${suspect.occupation}</div>
    ${state !== 'calm' ? `<div class="portrait-state">${stateEmoji[state]}</div>` : ''}
  </div>`;
}
