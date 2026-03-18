/**
 * 선택지 패널 렌더링 (최대 4개, R1 준수)
 * @param {Object[]} choices - { id, text, type?, disabled? }
 * @returns {string} HTML
 */
export function renderChoicePanel(choices) {
  return `<div class="choice-panel">
    ${choices.map(c => {
      let cls = 'btn choice-btn';
      if (c.type === 'catch') cls += ' btn--danger';
      else if (c.type === 'nav') cls += ' btn--accent';
      if (c.disabled) cls += ' btn--disabled';
      return `<button class="${cls}" data-choice-id="${c.id}" ${c.disabled ? 'disabled' : ''}>${c.text}</button>`;
    }).join('')}
  </div>`;
}
