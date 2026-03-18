export class NotebookState {
  constructor() {
    this.foundEvidence = [];
    this.heardTestimonies = [];
    this.contradictions = [];
    this.currentHypothesis = null;
  }

  addEvidence(evidence) {
    if (!this.hasEvidence(evidence.id)) {
      this.foundEvidence.push(evidence);
    }
  }

  addTestimony(testimony) {
    this.heardTestimonies.push(testimony);
  }

  addContradiction(contradiction) {
    if (!this.hasContradiction(contradiction.id)) {
      this.contradictions.push(contradiction);
    }
  }

  setHypothesis(suspectId) {
    this.currentHypothesis = suspectId;
  }

  hasEvidence(evidenceId) {
    return this.foundEvidence.some(e => e.id === evidenceId);
  }

  hasTestimony(testimonyId) {
    return this.heardTestimonies.some(t => t.id === testimonyId);
  }

  hasContradiction(contradictionId) {
    return this.contradictions.some(c => c.id === contradictionId);
  }

  getEvidenceForSuspect(suspectId) {
    return this.foundEvidence.filter(e => {
      const interps = e.interpretations;
      return (interps.a && interps.a.leadsTo === suspectId) ||
             (interps.b && interps.b.leadsTo === suspectId);
    });
  }

  getContradictionsForSuspect(suspectId) {
    return this.contradictions.filter(c => c.targetSuspect === suspectId);
  }
}
