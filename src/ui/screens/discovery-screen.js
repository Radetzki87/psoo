import { BaseScreen } from './base-screen.js';

export class DiscoveryScreen extends BaseScreen {
  render(state) {
    const c = state.currentCase;
    return `<div class="screen discovery-screen">
      <div class="screen-body">
        <p class="discovery-atmosphere">${c.setting.atmosphere}</p>
        <hr class="divider">
        <p class="discovery-location">${c.setting.name}</p>
        <div class="discovery-victim">
          <p class="discovery-label">피해자</p>
          <p class="discovery-name">${c.victim.name} (${c.victim.age}세, ${c.victim.occupation})</p>
          <p class="discovery-desc">${c.victim.description}</p>
          <p class="discovery-cause">${c.victim.causeOfDeath}</p>
        </div>
        <hr class="divider">
        <p class="discovery-suspects-label">용의자 ${c.suspects.length}명이 저택에 있다.</p>
        <div class="discovery-suspects">
          ${c.suspects.map(s =>
            `<div class="discovery-suspect" style="border-left: 3px solid ${s.color}; padding-left: var(--space-md); margin-bottom: var(--space-md);">
              <strong>${s.name}</strong> (${s.age}세, ${s.occupation})
            </div>`
          ).join('')}
        </div>
      </div>
      <div class="screen-nav">
        <button class="btn btn--accent" data-choice-id="begin">조사를 시작한다</button>
      </div>
    </div>`;
  }

  bindEvents(container) {
    container.querySelector('[data-choice-id="begin"]')?.addEventListener('click', () => {
      this.bus.emit('PHASE_READY', { nextPhase: 'INVESTIGATE' });
    });
  }
}
