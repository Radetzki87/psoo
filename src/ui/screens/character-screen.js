import { BaseScreen } from './base-screen.js';
import { renderPortrait } from '../components/portrait.js';
import { renderContradictionBar } from '../components/contradiction-bar.js';
import { renderChoicePanel } from '../components/choice-panel.js';
import { generateQuestions, getSuspectStatusLabel } from '../../core/testimony-engine.js';

export class CharacterScreen extends BaseScreen {
  render(state) {
    const suspect = state.currentCase.suspects.find(s => s.id === state.selectedSuspectId);
    if (!suspect) {
      return this._renderSuspectSelection(state);
    }

    const contradictions = state.notebook.getContradictionsForSuspect(suspect.id);
    const questions = generateQuestions(suspect.id, state.notebook, state, state.currentCase.questionRules);
    const hasHeardInitial = state.heardInitialTestimonies[suspect.id];

    // 질문 선택지 구성
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
            ? this._renderFirstMeeting(suspect)
            : this._renderConversation(state, suspect, contradictions, questions, questionChoices)
          }
        </div>
      </div>
    </div>`;
  }

  /** 처음 만나는 인물 */
  _renderFirstMeeting(suspect) {
    return `<p class="testimony-prompt">처음 만나는 인물이다. 이야기를 들어본다.</p>
      <button class="btn btn--accent choice-btn" data-choice-id="hear_initial">이야기를 듣는다</button>`;
  }

  /** 재방문 포함 대화 화면 */
  _renderConversation(state, suspect, contradictions, questions, questionChoices) {
    const pastTestimonies = state.notebook.heardTestimonies.filter(t => t.suspectId === suspect.id);
    const si = state.suspectInteraction[suspect.id];

    // 이전 대화 기록 (재방문 시 맥락 보존)
    let historyHtml = '';
    if (pastTestimonies.length > 0) {
      historyHtml = `<div class="testimony-history">
        <p class="testimony-history__label">이전 대화</p>
        ${pastTestimonies.map(t =>
          `<p class="testimony-history__item">"${t.text}"</p>`
        ).join('')}
      </div>`;
    }

    // 질문 소진 시 안내
    let questionAreaHtml;
    if (questions.length === 0) {
      questionAreaHtml = `
        <p class="testimony-exhausted">더 물을 것이 없다.</p>
        ${renderChoicePanel([{ id: 'end_talk', text: '대화를 끝낸다' }])}`;
    } else {
      // 새 질문이 있을 때 알림
      const hasNew = si?.hasNewQuestions && questions.some(q => q.type === 'evidence');
      const newBadge = hasNew
        ? '<p class="testimony-new-hint">새로운 증거를 바탕으로 물어볼 수 있는 것이 생겼다.</p>'
        : '';

      questionAreaHtml = `
        ${newBadge}
        ${renderChoicePanel(questionChoices)}`;
    }

    return `
      ${historyHtml}
      ${renderContradictionBar(contradictions)}
      <hr class="divider">
      ${questionAreaHtml}`;
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
          ${suspects.map(s => this._renderSuspectCard(state, s)).join('')}
        </div>
        <hr class="divider">
        <button class="btn btn--accent choice-btn" data-choice-id="back_investigate">조사로 돌아간다</button>
      </div>
    </div>`;
  }

  /** 용의자 카드: 다층 상태 라벨 표시 */
  _renderSuspectCard(state, suspect) {
    const questions = generateQuestions(suspect.id, state.notebook, state, state.currentCase.questionRules);
    const si = state.suspectInteraction[suspect.id];
    const status = state.getSuspectStatus(suspect.id, questions.length);
    const label = getSuspectStatusLabel(status, questions.length, si?.askedCount || 0);

    const statusHtml = label.text
      ? `<span class="suspect-status ${label.cssClass}">${label.text}</span>`
      : '';

    return `<button class="btn suspect-card choice-btn" data-choice-id="select_${suspect.id}" style="border-left: 3px solid ${suspect.color}">
      <strong>${suspect.name}</strong><br>
      <span class="text-secondary">${suspect.occupation}, ${suspect.age}세</span>
      ${statusHtml}
    </button>`;
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
