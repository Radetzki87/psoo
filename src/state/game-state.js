import { NotebookState } from './notebook-state.js';

export class GameState {
  constructor() {
    this.currentCase = null;
    this.phase = 'TITLE';
    this.currentRoom = null;
    this.visitedRooms = new Set();
    this.examinedObjects = new Set();
    this.questionedSuspects = new Set();
    this.askedQuestions = new Set();
    this.triggeredContradictions = new Set();
    this.heardInitialTestimonies = {};
    this.notebook = null;
    this.result = null;
    this.selectedSuspectId = null;
    this.examiningObject = null;
  }

  loadCase(caseData) {
    this.currentCase = caseData;
    this.notebook = new NotebookState();
    this.currentRoom = caseData.setting.map.startRoom;
    this.visitedRooms.add(this.currentRoom);
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
}
