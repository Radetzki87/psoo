import { NotebookState } from './notebook-state.js';

export class GameState {
  constructor() {
    this.currentCase = null;
    this.phase = 'TITLE';
    this.currentRoom = null;
    this.visitedRooms = new Set();
    this.examinedObjects = new Set();
    this.askedQuestions = new Set();
    this.triggeredContradictions = new Set();
    this.heardInitialTestimonies = {};
    this.notebook = null;
    this.result = null;
    this.selectedSuspectId = null;
    this.examiningObject = null;

    // 용의자별 탐문 상태 추적
    // { suspectId: { askedCount, lastSeenEvidenceCount, hasNewQuestions } }
    this.suspectInteraction = {};
  }

  loadCase(caseData) {
    this.currentCase = caseData;
    this.notebook = new NotebookState();
    this.currentRoom = caseData.setting.map.startRoom;
    this.visitedRooms.add(this.currentRoom);

    // 용의자별 상호작용 상태 초기화
    for (const suspect of caseData.suspects) {
      this.suspectInteraction[suspect.id] = {
        askedCount: 0,
        lastSeenEvidenceCount: 0,
        hasNewQuestions: false
      };
    }
  }

  setPhase(phase) {
    this.phase = phase;
  }

  enterRoom(roomId) {
    this.currentRoom = roomId;
    this.visitedRooms.add(roomId);
    this.examiningObject = null;
  }

  examineObject(objectId) {
    this.examinedObjects.add(objectId);
    this.examiningObject = objectId;
  }

  clearExamine() {
    this.examiningObject = null;
  }

  getCurrentRoom() {
    if (!this.currentCase) return null;
    return this.currentCase.setting.rooms.find(r => r.id === this.currentRoom);
  }

  getAdjacentRooms() {
    const room = this.getCurrentRoom();
    if (!room) return [];
    return room.adjacentRooms.map(id =>
      this.currentCase.setting.rooms.find(r => r.id === id)
    ).filter(Boolean);
  }

  getSuspect(suspectId) {
    return this.currentCase.suspects.find(s => s.id === suspectId);
  }

  canAccuse() {
    return this.notebook && this.notebook.foundEvidence.length >= 2;
  }

  // ━━ 탐문 깊이 추적 ━━

  /** 질문을 물었을 때 호출 */
  recordQuestion(suspectId) {
    const si = this.suspectInteraction[suspectId];
    if (si) {
      si.askedCount++;
      si.lastSeenEvidenceCount = this.notebook.foundEvidence.length;
      si.hasNewQuestions = false;
    }
  }

  /** 새 증거 발견 후, 각 용의자에 새 질문이 열렸는지 갱신 */
  refreshNewQuestionFlags(generateQuestionsFn) {
    if (!this.currentCase) return;
    for (const suspect of this.currentCase.suspects) {
      const si = this.suspectInteraction[suspect.id];
      if (!si || !this.heardInitialTestimonies[suspect.id]) continue;

      const questions = generateQuestionsFn(
        suspect.id, this.notebook, this, this.currentCase.questionRules
      );
      const hadNewQuestions = si.hasNewQuestions;
      si.hasNewQuestions = questions.length > 0 &&
        this.notebook.foundEvidence.length > si.lastSeenEvidenceCount;

      // 모순 감지 후에도 새 질문 플래그 갱신
      if (!hadNewQuestions && questions.some(q => q.type === 'catch' || q.type === 'followup')) {
        si.hasNewQuestions = true;
      }
    }
  }

  /**
   * 용의자의 탐문 상태를 반환
   * @returns {'unvisited'|'heard_initial'|'in_progress'|'new_available'|'exhausted'}
   */
  getSuspectStatus(suspectId, availableQuestionCount) {
    const heardInitial = this.heardInitialTestimonies[suspectId];
    const si = this.suspectInteraction[suspectId];

    if (!heardInitial) return 'unvisited';

    if (si?.hasNewQuestions && availableQuestionCount > 0) return 'new_available';
    if (availableQuestionCount > 0) return 'in_progress';
    if (si?.askedCount > 0) return 'exhausted';

    return 'heard_initial';
  }
}
