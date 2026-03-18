import { BaseScreen } from './base-screen.js';

export class AccusationScreen extends BaseScreen {
  constructor(bus) {
    super(bus);
    this.selectedSuspect = null;
    this.selectedEvidence = new Set();
  }

  render(state) {
    const suspects = state.currentCase.suspects;
    const evidence = state.notebook.foundEvidence;

    return `<div class="screen accusation-screen">
      <div class="screen-header">
        <h2>고발</h2>
      </div>
      <div class="screen-body">
        <p class="accusation-label">범인으로 지목합니다:</p>
        <div class="suspect-cards">
          ${suspects.map(s =>
            `<button class="btn suspect-card-select ${this.selectedSuspect === s.id ? 'suspect-card--selected' : ''}"
                     data-suspect-id="${s.id}" style="border-left: 3px solid ${s.color}">
              <strong>${s.name}</strong><br>
              <span class="text-secondary">${s.occupation}</span>
            </button>`
          ).join('')}
        </div>

        <hr class="divider">
        <p class="accusation-label">근거 증거를 선택하십시오 (2~3개):</p>
        <div class="evidence-checklist">
          ${evidence.map(e =>
            `<label class="evidence-check">
              <input type="checkbox" data-evidence-id="${e.id}"
                     ${this.selectedEvidence.has(e.id) ? 'checked' : ''}>
              <span>${e.name}</span>
            </label>`
          ).join('')}
        </div>

        <hr class="divider">
        <button class="btn btn--danger accuse-btn ${this.selectedSuspect && this.selectedEvidence.size >= 2 ? '' : 'btn--disabled'}"
                data-choice-id="accuse"
                ${this.selectedSuspect && this.selectedEvidence.size >= 2 ? '' : 'disabled'}>
          고발하기
        </button>
        <p class="accusation-warning">이 결정은 되돌릴 수 없습니다.</p>
        <button class="btn choice-btn" data-choice-id="back">돌아간다</button>
      </div>
    </div>`;
  }

  bindEvents(container, state) {
    container.querySelectorAll('.suspect-card-select').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedSuspect = btn.dataset.suspectId;
        this.update(state);
      });
    });

    container.querySelectorAll('.evidence-check input').forEach(cb => {
      cb.addEventListener('change', () => {
        const evId = cb.dataset.evidenceId;
        if (cb.checked) {
          this.selectedEvidence.add(evId);
        } else {
          this.selectedEvidence.delete(evId);
        }
        this.update(state);
      });
    });

    container.querySelector('.accuse-btn')?.addEventListener('click', () => {
      if (this.selectedSuspect && this.selectedEvidence.size >= 2) {
        this.bus.emit('ACCUSE', {
          suspectId: this.selectedSuspect,
          evidenceIds: [...this.selectedEvidence]
        });
      }
    });

    container.querySelector('[data-choice-id="back"]')?.addEventListener('click', () => {
      this.bus.emit('PHASE_READY', { nextPhase: 'INVESTIGATE' });
    });
  }
}
