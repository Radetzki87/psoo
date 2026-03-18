import { BaseScreen } from './base-screen.js';

export class TitleScreen extends BaseScreen {
  render(state) {
    return `<div class="screen title-screen">
      <div class="title-center">
        <h1 class="title-main">無題</h1>
        <p class="title-sub">무제</p>
        <p class="title-desc">절차적 탐정 추리 게임</p>
        <button class="btn btn--accent title-start" data-choice-id="start">새 게임 시작</button>
      </div>
    </div>`;
  }

  bindEvents(container) {
    container.querySelector('.title-start')?.addEventListener('click', () => {
      this.bus.emit('GAME_START', {});
    });
  }
}
