import {
  AdmissionDecision,
  AdmissionPolicy,
  ArtifactWriteAttempt,
  decideArtifactWriteAdmission,
} from './admission';
import { BandEvent } from './events';
import {
  buildSemanticInputs,
  cloneState,
  ProjectionState,
  reduceProjection,
  reduceRefusalProjection,
  RefusalView,
  SemanticInput,
} from './projection';
import { EventStore } from './store';

export class BandRuntime {
  private store: EventStore;

  constructor(store?: EventStore) {
    this.store = store || new EventStore();
  }

  dispatch(event: BandEvent): void {
    this.store.append(event);
  }

  /**
   * Evaluates the pure gate, then appends refusal residue before any projection can observe it.
   * The refused request body is not part of the receipt and is never stored.
   */
  admitArtifactWriteAttempt(
    attempt: ArtifactWriteAttempt,
    policy: AdmissionPolicy,
  ): AdmissionDecision {
    const decision = decideArtifactWriteAdmission(this.store.getAll(), attempt, policy);
    if (decision.disposition === 'boundary_refused') {
      this.store.append(decision.receipt);
    }
    return decision;
  }

  getProjection(): ProjectionState {
    return cloneState(reduceProjection(this.store.getAll()));
  }

  getProjectionAt(eventId: string): ProjectionState {
    return cloneState(reduceProjection(this.store.getUpTo(eventId)));
  }

  getRefusalProjection(audience: string): RefusalView[] {
    return structuredClone(reduceRefusalProjection(this.store.getAll(), audience));
  }

  getSemanticInputs(): SemanticInput[] {
    return structuredClone(buildSemanticInputs(this.store.getAll()));
  }

  getStore(): EventStore {
    return this.store;
  }
}
