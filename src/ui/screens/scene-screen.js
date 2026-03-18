import { BaseScreen } from './base-screen.js';
import { renderChoicePanel } from '../components/choice-panel.js';
import { renderMapWidget } from '../components/map-widget.js';

export class SceneScreen extends BaseScreen {
  render(state) {
    const room = state.getCurrentRoom();
    if (!room) return '<div class="screen"><p>방을 찾을 수 없습니다.</p></div>';

    const adjacentRooms = state.getAdjacentRooms();

    // 오브젝트 examine 상태
    let examineHtml = '';
    if (state.examiningObject) {
      const obj = room.objects.find(o => o.id === state.examiningObject);
      if (obj) {
        examineHtml = `<div class="examine-detail">
          <p class="examine-text">${obj.examineText}</p>
          ${this._renderEvidenceFound(obj, state)}
          <button class="btn choice-btn examine-close" data-choice-id="close_examine">돌아간다</button>
        </div>`;
      }
    }

    // 오브젝트 목록
    const objectChoices = room.objects.map(obj => ({
      id: `examine_${obj.id}`,
      text: state.examinedObjects.has(obj.id)
        ? `${obj.name} (조사함)`
        : `${obj.lookText}`,
      type: state.examinedObjects.has(obj.id) ? undefined : 'nav'
    }));

    // 이동 선택지
    const navChoices = adjacentRooms.map(r => ({
      id: `move_${r.id}`,
      text: `${r.name}(으)로 이동한다`,
      type: 'nav'
    }));

    // 탐문 / 고발 버튼
    const actionChoices = [
      { id: 'go_question', text: '용의자를 만난다', type: 'nav' }
    ];
    if (state.canAccuse()) {
      actionChoices.push({ id: 'go_accuse', text: '범인을 지목한다', type: 'catch' });
    }

    return `<div class="screen scene-screen">
      <div class="screen-header">
        <h2>${room.name}</h2>
        <button class="btn btn--notebook" data-choice-id="notebook">수첩</button>
      </div>
      <div class="screen-body">
        <p class="scene-description">${room.description}</p>
        ${examineHtml || `
          <hr class="divider">
          <div class="scene-objects">
            ${renderChoicePanel(objectChoices)}
          </div>
        `}
      </div>
      <div class="screen-nav">
        <hr class="divider">
        ${renderChoicePanel([...navChoices, ...actionChoices])}
        ${renderMapWidget(state.currentCase.setting.map, state.currentRoom, state.currentCase.setting.rooms)}
      </div>
    </div>`;
  }

  _renderEvidenceFound(obj, state) {
    if (!obj.evidenceId) return '';
    const evidence = state.currentCase.evidence.find(e => e.id === obj.evidenceId);
    if (!evidence) return '';
    const alreadyFound = state.notebook.hasEvidence(evidence.id);
    if (alreadyFound) {
      return `<p class="evidence-found evidence-found--old">이미 기록됨: ${evidence.name}</p>`;
    }
    return `<p class="evidence-found">&#128161; 발견: ${evidence.name} — ${evidence.description}</p>`;
  }

  bindEvents(container, state) {
    container.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.choiceId;
        if (id === 'notebook') {
          this.bus.emit('NOTEBOOK_OPEN', {});
        } else if (id === 'close_examine') {
          this.bus.emit('EXAMINE_CLOSE', {});
        } else if (id.startsWith('examine_')) {
          const objectId = id.replace('examine_', '');
          this.bus.emit('OBJECT_EXAMINE', { objectId });
        } else if (id.startsWith('move_')) {
          const roomId = id.replace('move_', '');
          this.bus.emit('ROOM_ENTER', { roomId });
        } else if (id === 'go_question') {
          this.bus.emit('PHASE_READY', { nextPhase: 'QUESTION' });
        } else if (id === 'go_accuse') {
          this.bus.emit('PHASE_READY', { nextPhase: 'ACCUSE' });
        }
      });
    });

    container.querySelector('.btn--notebook')?.addEventListener('click', () => {
      this.bus.emit('NOTEBOOK_OPEN', {});
    });
  }
}
