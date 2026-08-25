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
  'capture.recorded',
  'handoff.recorded',
  'return.recorded',
  'decision.recorded',
]);

const WITNESS_EVENT_TYPES = new Set([
  'capture.recorded',
  'handoff.recorded',
  'return.recorded',
  'decision.recorded',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isWitnessMaterial(value: unknown): boolean {
  if (!isRecord(value) || typeof value.kind !== 'string') return false;

  if (value.kind === 'text') {
    return typeof value.text === 'string' && isNonEmptyString(value.sha256);
  }

  if (value.kind === 'url') {
    return (
      isNonEmptyString(value.url) &&
      (value.sha256 === undefined || typeof value.sha256 === 'string')
    );
  }

  if (value.kind === 'voice' || value.kind === 'file' || value.kind === 'screenshot') {
    return (
      isNonEmptyString(value.artifactRef) &&
      isNonEmptyString(value.sha256) &&
      (value.mimeType === undefined || typeof value.mimeType === 'string') &&
      (value.filename === undefined || typeof value.filename === 'string')
    );
  }

  return false;
}

function isOutboundSnapshot(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (
    value.completeness !== 'EXACT' &&
    value.completeness !== 'PARTIAL' &&
    value.completeness !== 'UNKNOWN'
  ) {
    return false;
  }
  if (value.text !== undefined && typeof value.text !== 'string') return false;
  if (value.artifactRef !== undefined && typeof value.artifactRef !== 'string') return false;
  if (value.sha256 !== undefined && typeof value.sha256 !== 'string') return false;
  if (value.metadata !== undefined && !isRecord(value.metadata)) return false;

  if (value.completeness === 'EXACT') {
    return [value.text, value.artifactRef, value.sha256].some((candidate) =>
      isNonEmptyString(candidate),
    );
  }

  return true;
}

function isDeliveryEvidence(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!['DECLARED', 'WITNESSED', 'FAILED', 'UNKNOWN'].includes(String(value.status))) {
    return false;
  }
  if (!isStringArray(value.evidence)) return false;
  return value.reason === undefined || typeof value.reason === 'string';
}

function isObservedReturn(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.text !== undefined && typeof value.text !== 'string') return false;
  if (value.artifactRef !== undefined && typeof value.artifactRef !== 'string') return false;
  return value.metadata === undefined || isRecord(value.metadata);
}

function isReturnRelation(value: unknown): boolean {
  if (!isRecord(value) || !isStringArray(value.evidence) || typeof value.status !== 'string') {
    return false;
  }
  if (value.reason !== undefined && typeof value.reason !== 'string') return false;

  switch (value.status) {
    case 'WITNESSED':
    case 'CLAIMED':
    case 'PARTIAL':
      return isNonEmptyString(value.handoffId);
    case 'UNRESOLVED':
      return value.handoffId === null;
    case 'REFUTED':
      return (
        isNonEmptyString(value.handoffId) &&
        isNonEmptyString(value.refutesReturnId) &&
        isNonEmptyString(value.reason)
      );
    default:
      return false;
  }
}

function isWitnessPayloadFor(event: { type: string; payload?: unknown }): boolean {
  if (!isRecord(event.payload)) return false;
  const payload = event.payload;

  switch (event.type) {
    case 'capture.recorded':
      return (
        isNonEmptyString(payload.actorId) &&
        isWitnessMaterial(payload.material) &&
        isNullableString(payload.intent) &&
        isNullableString(payload.localObservedAt) &&
        isNullableString(payload.parentCaptureId)
      );
    case 'handoff.recorded':
      return (
        isNonEmptyString(payload.actorId) &&
        isStringArray(payload.sourceCaptureIds) &&
        isNonEmptyString(payload.destination) &&
        isOutboundSnapshot(payload.outbound) &&
        isDeliveryEvidence(payload.delivery)
      );
    case 'return.recorded':
      return (
        isNonEmptyString(payload.actorId) &&
        isNonEmptyString(payload.provider) &&
        isNullableString(payload.providerArtifactId) &&
        isObservedReturn(payload.observed) &&
        isReturnRelation(payload.relation)
      );
    case 'decision.recorded':
      return (
        isNonEmptyString(payload.actorId) &&
        isNonEmptyString(payload.returnId) &&
        ['KEEP', 'REFUSE', 'WRONG', 'INTERESTING'].includes(String(payload.decision)) &&
        isNullableString(payload.note)
      );
    default:
      return false;
  }
}

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
      if (WITNESS_EVENT_TYPES.has(event.type) && !isWitnessPayloadFor(event)) {
        throw new Error('INVALID_WITNESS_RECEIPT');
      }

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
