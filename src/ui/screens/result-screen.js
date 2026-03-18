import { BaseScreen } from './base-screen.js';

export class ResultScreen extends BaseScreen {
  render(state) {
    const result = state.result;
    if (!result) return '<div class="screen"><p>결과 없음</p></div>';

    if (result.correct) {
      return this._renderWin(state, result);
    } else {
      return this._renderLose(state, result);
    }
  }

  _renderWin(state, result) {
    const culprit = state.currentCase.suspects.find(s => s.id === state.currentCase.culprit);

    let reinterpretationHtml = '';
    if (result.reinterpretation) {
      reinterpretationHtml = `<div class="reinterpretation">
        <h3>증거의 재해석</h3>
        ${Object.entries(result.reinterpretation).map(([evId, text]) => {
          const ev = state.currentCase.evidence.find(e => e.id === evId);
          return `<div class="reinterpret-item">
            <strong>${ev ? ev.name : evId}</strong>
            <p>${text}</p>
          </div>`;
        }).join('')}
      </div>`;
    }

    return `<div class="screen result-screen result-screen--win">
      <div class="screen-header">
        <h2>사건 해결</h2>
      </div>
      <div class="screen-body">
        <p class="result-verdict">정답입니다.</p>
        <p class="result-culprit">범인: <strong style="color: ${culprit?.color}">${culprit?.name}</strong></p>
        <hr class="divider">
        <div class="result-narrative">
          <h3>사건의 전모</h3>
          <p>${result.narrative}</p>
        </div>
        <hr class="divider">
        <div class="result-trick">
          <h3>트릭</h3>
          <p>${result.trickExplanation}</p>
        </div>
        <hr class="divider">
        ${reinterpretationHtml}
        <hr class="divider">
        <button class="btn btn--accent choice-btn" data-choice-id="restart">타이틀로 돌아간다</button>
      </div>
    </div>`;
  }

  _renderLose(state, result) {
    return `<div class="screen result-screen result-screen--lose">
      <div class="screen-header">
        <h2>오답</h2>
      </div>
      <div class="screen-body">
        <p class="result-verdict result-verdict--wrong">틀렸습니다.</p>
        <hr class="divider">
        <p class="result-feedback">${result.feedback.text}</p>
        <p class="result-hint">${result.feedback.hint}</p>
        <hr class="divider">
        <button class="btn btn--accent choice-btn" data-choice-id="restart">타이틀로 돌아간다</button>
      </div>
    </div>`;
  }

  bindEvents(container) {
    container.querySelector('[data-choice-id="restart"]')?.addEventListener('click', () => {
      this.bus.emit('GAME_RESTART', {});
    });
  }
}
