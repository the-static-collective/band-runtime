import { BandEvent } from './events';
import { EventStore } from './store';
import { reduceProjection, ProjectionState, cloneState } from './projection';

export class BandRuntime {
  private store: EventStore;

  constructor(store?: EventStore) {
    this.store = store || new EventStore();
  }

  dispatch(event: BandEvent): void {
    this.store.append(event);
  }

  getProjection(): ProjectionState {
    const events = this.store.getAll();
    return cloneState(reduceProjection(events));
  }

  getProjectionAt(eventId: string): ProjectionState {
    const events = this.store.getUpTo(eventId);
    return cloneState(reduceProjection(events));
  }

  getStore(): EventStore {
    return this.store;
  }
}
