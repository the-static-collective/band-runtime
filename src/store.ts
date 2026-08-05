import { BandEvent } from './events';

const VALID_EVENT_TYPES = new Set([
  'session.opened',
  'participant.joined',
  'clip.proposed',
  'clip.admitted',
  'clip.rejected',
  'recognition.recorded',
  'anticipation.proposed',
  'anticipation.contested',
  'projection.policy_declared',
  'protected_silence.declared',
  'boundary.refusal_recorded',
  'mix.rendered',
  'session.closed',
]);

export class EventStore {
  private events: BandEvent[] = [];

  constructor(initialEvents: BandEvent[] = []) {
    this.events = [...initialEvents];
  }

  append(event: BandEvent): void {
    if (this.events.length > 0) {
      const activeSessionId = this.events[0].sessionId;
      if (event.sessionId !== activeSessionId) {
        throw new Error('CROSS_SESSION_CONTAMINATION');
      }
    }

    const existing = this.events.find((candidate) => candidate.id === event.id);
    if (existing) {
      const { sequence: ignoredInputSequence, ...eventWithoutSequence } = event;
      const { sequence: ignoredStoredSequence, ...existingWithoutSequence } = existing;
      void ignoredInputSequence;
      void ignoredStoredSequence;

      if (JSON.stringify(eventWithoutSequence) === JSON.stringify(existingWithoutSequence)) {
        return;
      }
      throw new Error('EVENT_ID_CONFLICT');
    }

    if (this.events.length === 0 && event.type !== 'session.opened') {
      throw new Error('EVENT_BEFORE_SESSION_OPENED');
    }
    if (this.events.some((candidate) => candidate.type === 'session.closed')) {
      throw new Error('EVENT_AFTER_SESSION_CLOSED');
    }

    const sequence = this.events.length;
    this.events.push({ ...event, sequence });
  }

  getAll(): BandEvent[] {
    return [...this.events];
  }

  getUpTo(eventId: string): BandEvent[] {
    const index = this.events.findIndex((event) => event.id === eventId);
    if (index === -1) return this.getAll();
    return this.events.slice(0, index + 1);
  }

  serialize(): string {
    return JSON.stringify(this.events);
  }

  serializeUpTo(eventId: string): string {
    return JSON.stringify(this.getUpTo(eventId));
  }

  static deserialize(data: string): EventStore {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      throw new Error('MALFORMED_JSON');
    }

    if (!Array.isArray(parsed)) throw new Error('MALFORMED_JSON');

    const events = parsed as BandEvent[];
    const seenIds = new Set<string>();
    let activeSessionId: string | null = null;

    for (let index = 0; index < events.length; index++) {
      const event = events[index];
      if (!event.id || !event.type || typeof event.timestamp !== 'number' || !event.sessionId) {
        throw new Error('MISSING_ENVELOPE_FIELDS');
      }
      if (!VALID_EVENT_TYPES.has(event.type)) throw new Error('UNKNOWN_EVENT_TYPE');

      if (index === 0) {
        if (event.type !== 'session.opened') throw new Error('EVENT_BEFORE_SESSION_OPENED');
        activeSessionId = event.sessionId;
      } else if (event.sessionId !== activeSessionId) {
        throw new Error('CROSS_SESSION_CONTAMINATION');
      }

      if (seenIds.has(event.id)) throw new Error('EVENT_ID_CONFLICT');
      seenIds.add(event.id);

      if (event.type === 'boundary.refusal_recorded') {
        if (
          event.payload.semanticEffect !== 'none' ||
          event.payload.projectionClassification !== 'refusal_only' ||
          event.payload.payloadVisibility !== 'hash_only' ||
          event.payload.protectedArtifacts.some(
            (proof) => proof.contentHashBefore !== proof.contentHashAfter,
          )
        ) {
          throw new Error('INVALID_REFUSAL_RECEIPT');
        }
      }
    }

    const closedIndex = events.findIndex((event) => event.type === 'session.closed');
    if (closedIndex !== -1 && closedIndex < events.length - 1) {
      throw new Error('EVENT_AFTER_SESSION_CLOSED');
    }

    const proposedClips = new Set(
      events
        .filter((event) => event.type === 'clip.proposed')
        .map((event) => event.payload.clipId),
    );
    for (const event of events) {
      if (event.type === 'clip.admitted' || event.type === 'clip.rejected') {
        if (!proposedClips.has(event.payload.clipId)) throw new Error('INVALID_REFERENCE');
      }
    }

    return new EventStore(events);
  }
}
