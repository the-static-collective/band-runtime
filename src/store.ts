import { BandEvent } from './events';

export class EventStore {
  private events: BandEvent[] = [];

  constructor(initialEvents: BandEvent[] = []) {
    // We assume initialEvents are already validated and properly sequenced by deserialize
    this.events = [...initialEvents];
  }

  append(event: BandEvent): void {
    // 1. Session binding validation
    if (this.events.length > 0) {
      const activeSessionId = this.events[0].sessionId;
      if (event.sessionId !== activeSessionId) {
        throw new Error('CROSS_SESSION_CONTAMINATION');
      }
    }

    // 2. Strict ID conflict vs idempotent no-op (checked before lifecycle so terminal event retries are handled cleanly)
    const existing = this.events.find((e) => e.id === event.id);
    if (existing) {
      // Check if it's a byte-identical retry (omitting sequence which might not be on the input)
      const { sequence: seq1, ...eventWithoutSeq } = event;
      const { sequence: seq2, ...existingWithoutSeq } = existing;

      if (JSON.stringify(eventWithoutSeq) === JSON.stringify(existingWithoutSeq)) {
        return; // Idempotent no-op
      } else {
        throw new Error('EVENT_ID_CONFLICT');
      }
    }

    // 3. Lifecycle bounds
    if (this.events.length === 0 && event.type !== 'session.opened') {
      throw new Error('EVENT_BEFORE_SESSION_OPENED');
    }
    const hasClosed = this.events.some(e => e.type === 'session.closed');
    if (hasClosed) {
      throw new Error('EVENT_AFTER_SESSION_CLOSED');
    }

    // 4. Sequence assignment
    const sequence = this.events.length;
    this.events.push({ ...event, sequence });
  }

  getAll(): BandEvent[] {
    return [...this.events];
  }

  getUpTo(eventId: string): BandEvent[] {
    const index = this.events.findIndex((e) => e.id === eventId);
    if (index === -1) {
      return this.getAll();
    }
    return this.events.slice(0, index + 1);
  }

  serialize(): string {
    return JSON.stringify(this.events);
  }

  static deserialize(data: string): EventStore {
    let parsed: any;
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      throw new Error('MALFORMED_JSON');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('MALFORMED_JSON');
    }

    const events = parsed as BandEvent[];
    const validTypes = new Set([
      'session.opened', 'participant.joined', 'clip.proposed', 'clip.admitted',
      'clip.rejected', 'recognition.recorded', 'anticipation.proposed',
      'anticipation.contested', 'projection.policy_declared', 'mix.rendered', 'session.closed'
    ]);

    const seenIds = new Set<string>();
    let activeSessionId: string | null = null;

    for (let i = 0; i < events.length; i++) {
      const e = events[i];

      // Missing envelope fields
      if (!e.id || !e.type || typeof e.timestamp !== 'number' || !e.sessionId) {
        throw new Error('MISSING_ENVELOPE_FIELDS');
      }

      // Unknown event type
      if (!validTypes.has(e.type)) {
        throw new Error('UNKNOWN_EVENT_TYPE');
      }

      // Cross-session contamination in history
      if (i === 0) {
        if (e.type !== 'session.opened') throw new Error('EVENT_BEFORE_SESSION_OPENED');
        activeSessionId = e.sessionId;
      } else {
        if (e.sessionId !== activeSessionId) throw new Error('CROSS_SESSION_CONTAMINATION');
      }

      // Conflicting duplicate IDs in history
      if (seenIds.has(e.id)) {
        throw new Error('EVENT_ID_CONFLICT');
      }
      seenIds.add(e.id);
    }

    // Validation pass 2: Events after closure
    const closedIndex = events.findIndex(e => e.type === 'session.closed');
    if (closedIndex !== -1 && closedIndex < events.length - 1) {
       throw new Error('EVENT_AFTER_SESSION_CLOSED');
    }

    // Validation pass 3: Invalid references (basic check for clip existence on admit/reject)
    const proposedClips = new Set(events.filter(e => e.type === 'clip.proposed').map(e => (e.payload as any).clipId));
    for (const e of events) {
       if (e.type === 'clip.admitted' || e.type === 'clip.rejected') {
          if (!proposedClips.has((e.payload as any).clipId)) {
             throw new Error('INVALID_REFERENCE');
          }
       }
    }

    return new EventStore(events);
  }
}
