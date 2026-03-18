import { BaseScreen } from './base-screen.js';
import { renderPortrait } from '../components/portrait.js';
import { renderContradictionBar } from '../components/contradiction-bar.js';
import { renderChoicePanel } from '../components/choice-panel.js';
import { generateQuestions } from '../../core/testimony-engine.js';

export class CharacterScreen extends BaseScreen {
  render(state) {
    const suspect = state.currentCase.suspects.find(s => s.id === state.selectedSuspectId);
    if (!suspect) {
      return this._renderSuspectSelection(state);
    }

    const contradictions = state.notebook.getContradictionsForSuspect(suspect.id);
    const questions = generateQuestions(suspect.id, state.notebook, state, state.currentCase.questionRules);

    // 최근 증언 표시
    const recentTestimony = this._getRecentTestimony(state, suspect.id);

    // 초기 증언 (아직 듣지 않은 경우)
    const hasHeardInitial = state.heardInitialTestimonies[suspect.id];

    const questionChoices = questions.map(q => ({
      id: `ask_${q.id}`,
      text: q.text,
      type: q.type
    }));
    questionChoices.push({ id: 'end_talk', text: '대화를 끝낸다' });

    return `<div class="screen character-screen">
      <div class="screen-header">
        <h2>탐문: ${suspect.name}</h2>
        <button class="btn btn--notebook" data-choice-id="notebook">수첩</button>
      </div>
      <div class="screen-body">
        ${renderPortrait(suspect, suspect.portraitState || 'calm')}
        <div class="testimony-area">
          ${!hasHeardInitial
            ? `<p class="testimony-prompt">처음 만나는 인물이다. 이야기를 들어본다.</p>
               <button class="btn btn--accent choice-btn" data-choice-id="hear_initial">이야기를 듣는다</button>`
            : `${recentTestimony ? `<p class="testimony-text">"${recentTestimony.text}"</p>` : ''}
               ${renderContradictionBar(contradictions)}
               <hr class="divider">
               ${renderChoicePanel(questionChoices)}`
          }
        </div>
      </div>
    </div>`;
  }

  _renderSuspectSelection(state) {
    const suspects = state.currentCase.suspects;
    return `<div class="screen character-screen">
      <div class="screen-header">
        <h2>탐문</h2>
        <button class="btn btn--notebook" data-choice-id="notebook">수첩</button>
      </div>
      <div class="screen-body">
        <p class="suspect-prompt">누구를 만나겠습니까?</p>
        <div class="suspect-list">
          ${suspects.map(s =>
            `<button class="btn suspect-card choice-btn" data-choice-id="select_${s.id}" style="border-left: 3px solid ${s.color}">
              <strong>${s.name}</strong><br>
              <span class="text-secondary">${s.occupation}, ${s.age}세</span>
              ${state.questionedSuspects.has(s.id) ? '<span class="text-muted"> (탐문함)</span>' : ''}
            </button>`
          ).join('')}
        </div>
        <hr class="divider">
        <button class="btn btn--accent choice-btn" data-choice-id="back_investigate">조사로 돌아간다</button>
      </div>
    </div>`;
  }

  _getRecentTestimony(state, suspectId) {
    const testimonies = state.notebook.heardTestimonies.filter(t => t.suspectId === suspectId);
    return testimonies.length > 0 ? testimonies[testimonies.length - 1] : null;
  }

  bindEvents(container, state) {
    container.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.choiceId;
        if (id === 'notebook') {
          this.bus.emit('NOTEBOOK_OPEN', {});
        } else if (id.startsWith('select_')) {
          const suspectId = id.replace('select_', '');
          this.bus.emit('SUSPECT_SELECT', { suspectId });
        } else if (id === 'hear_initial') {
          this.bus.emit('INITIAL_TESTIMONY', { suspectId: state.selectedSuspectId });
        } else if (id.startsWith('ask_')) {
          const questionId = id.replace('ask_', '');
          this.bus.emit('QUESTION_ASK', { suspectId: state.selectedSuspectId, questionId });
        } else if (id === 'end_talk') {
          this.bus.emit('SUSPECT_SELECT', { suspectId: null });
        } else if (id === 'back_investigate') {
          this.bus.emit('PHASE_READY', { nextPhase: 'INVESTIGATE' });
        }
      });
    });

    container.querySelector('.btn--notebook')?.addEventListener('click', () => {
      this.bus.emit('NOTEBOOK_OPEN', {});
    });
  }
}
