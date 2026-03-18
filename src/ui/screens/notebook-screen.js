import { BaseScreen } from './base-screen.js';

export class NotebookScreen extends BaseScreen {
  constructor(bus) {
    super(bus);
    this.activeTab = 'evidence';
  }

  render(state) {
    const nb = state.notebook;
    if (!nb) return '';

    const tabs = [
      { id: 'evidence', label: `증거 (${nb.foundEvidence.length})` },
      { id: 'testimony', label: `증언 (${nb.heardTestimonies.length})` },
      { id: 'contradiction', label: `모순 (${nb.contradictions.length})` },
      { id: 'hypothesis', label: '가설' }
    ];

    return `<div class="notebook-overlay">
      <div class="notebook">
        <div class="notebook-header">
          <h2>수첩</h2>
          <button class="btn btn--notebook notebook-close" data-choice-id="close">닫기</button>
        </div>
        <div class="notebook-tabs">
          ${tabs.map(t =>
            `<button class="notebook-tab ${this.activeTab === t.id ? 'notebook-tab--active' : ''}"
                     data-tab="${t.id}">${t.label}</button>`
          ).join('')}
        </div>
        <div class="notebook-content">
          ${this._renderTab(state)}
        </div>
      </div>
    </div>`;
  }

  _renderTab(state) {
    const nb = state.notebook;
    switch (this.activeTab) {
      case 'evidence':
        if (nb.foundEvidence.length === 0) return '<p class="text-muted">아직 발견한 증거가 없습니다.</p>';
        return nb.foundEvidence.map(e =>
          `<div class="notebook-item">
            <strong>${e.name}</strong>
            <p>${e.description}</p>
          </div>`
        ).join('');

      case 'testimony':
        if (nb.heardTestimonies.length === 0) return '<p class="text-muted">아직 들은 증언이 없습니다.</p>';
        return nb.heardTestimonies.map(t => {
          const suspect = state.currentCase.suspects.find(s => s.id === t.suspectId);
          return `<div class="notebook-item" style="border-left: 3px solid ${suspect?.color || 'var(--border-subtle)'}">
            <strong>${suspect?.name || t.suspectId}</strong>
            <p>"${t.text}"</p>
          </div>`;
        }).join('');

      case 'contradiction':
        if (nb.contradictions.length === 0) return '<p class="text-muted">감지된 모순이 없습니다.</p>';
        return nb.contradictions.map(c =>
          `<div class="notebook-item notebook-item--contradiction">
            <span class="contradiction-icon">&#9888;</span>
            <p>${c.displayText}</p>
          </div>`
        ).join('');

      case 'hypothesis':
        const suspects = state.currentCase.suspects;
        return `<p class="hypothesis-label">현재 의심 대상:</p>
          <div class="hypothesis-list">
            ${suspects.map(s =>
              `<button class="btn hypothesis-btn ${nb.currentHypothesis === s.id ? 'hypothesis-btn--active' : ''}"
                       data-suspect-id="${s.id}" style="border-left: 3px solid ${s.color}">
                ${s.name} (${s.occupation})
              </button>`
            ).join('')}
            <button class="btn hypothesis-btn ${nb.currentHypothesis === null ? 'hypothesis-btn--active' : ''}"
                     data-suspect-id="none">
              아직 모르겠다
            </button>
          </div>`;

      default:
        return '';
    }
  }

  bindEvents(container, state) {
    container.querySelector('.notebook-close')?.addEventListener('click', () => {
      this.bus.emit('NOTEBOOK_CLOSE', {});
    });

    container.querySelectorAll('.notebook-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab;
        this.update(state);
      });
    });

    container.querySelectorAll('.hypothesis-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const suspectId = btn.dataset.suspectId === 'none' ? null : btn.dataset.suspectId;
        this.bus.emit('HYPOTHESIS_SET', { suspectId });
      });
    });

    container.addEventListener('click', (e) => {
      if (e.target === container.querySelector('.notebook-overlay')) {
        this.bus.emit('NOTEBOOK_CLOSE', {});
      }
    });
  }
}
