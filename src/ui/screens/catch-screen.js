import { BaseScreen } from './base-screen.js';
import { renderPortrait } from '../components/portrait.js';
import { renderChoicePanel } from '../components/choice-panel.js';

export class CatchScreen extends BaseScreen {
  render(state) {
    const data = state.catchData;
    if (!data) return '<div class="screen"><p>데이터 없음</p></div>';

    const suspect = state.currentCase.suspects.find(s => s.id === data.suspectId);

    // 심화 질문
    const followUpChoices = [];
    if (data.newQuestions) {
      const followUp = state.currentCase.questionRules.followUp || {};
      for (const qId of data.newQuestions) {
        if (followUp[qId] && !state.askedQuestions.has(qId)) {
          followUpChoices.push({ id: `ask_${qId}`, text: followUp[qId].text, type: 'evidence' });
        }
      }
    }
    followUpChoices.push({ id: 'end_catch', text: '더 추궁하지 않는다' });

    return `<div class="screen catch-screen">
      <div class="screen-body">
        ${suspect ? renderPortrait(suspect, data.reaction || 'shaken') : ''}
        <div class="catch-quote">
          <span class="catch-quote-mark">&#10077;</span>
          ${data.catchQuestion || ''}
          <span class="catch-quote-mark">&#10078;</span>
        </div>
        <hr class="divider catch-divider">
        ${data.senseDescription ? `<p class="sense-description">${data.senseDescription}</p>` : ''}
        <div class="catch-response">
          <p class="testimony-text">"${data.text}"</p>
        </div>
        ${data.reveals ? `<p class="evidence-found">&#128161; 기록: ${data.reveals}</p>` : ''}
        <hr class="divider">
        ${renderChoicePanel(followUpChoices)}
      </div>
    </div>`;
  }

  bindEvents(container, state) {
    container.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.choiceId;
        if (id === 'end_catch') {
          this.bus.emit('CATCH_END', {});
        } else if (id.startsWith('ask_')) {
          const questionId = id.replace('ask_', '');
          this.bus.emit('QUESTION_ASK', { suspectId: state.selectedSuspectId, questionId });
          this.bus.emit('CATCH_END', {});
        }
      });
    });
  }
}
