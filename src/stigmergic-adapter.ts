import type { BandEvent } from './events';

export const BAND_STIGMERGIC_ADAPTER = {
  id: 'band-runtime/stigmergic-adapter',
  version: '0.1',
} as const;

export const BAND_STIGMERGIC_POLICY_VERSION = 'band-runtime-field-policy/v0.1' as const;

export type FieldChannel =
  | 'attention'
  | 'receptivity'
  | 'saturation'
  | 'inhibition'
  | 'tension'
  | 'return';

export interface FieldSourceEvent {
  eventId: string;
  scopeId: string;
  sequence: number;
}

export interface FieldTrace {
  sourceEventId: string;
  sourceSequence: number;
  scopeId: string;
  subjectRef: string;
  channel: FieldChannel;
  magnitude: number;
  decayWindowEvents: number;
}

export interface BandStigmergicAdaptation {
  schemaVersion: 'stigmergic-field/v0.1';
  scopeId: string;
  policyVersion: typeof BAND_STIGMERGIC_POLICY_VERSION;
  adapter: typeof BAND_STIGMERGIC_ADAPTER;
  sourceEvents: FieldSourceEvent[];
  traces: FieldTrace[];
}

function runtimeSequence(event: BandEvent): number {
  if (!Number.isSafeInteger(event.sequence) || (event.sequence as number) < 0) {
    throw new Error('UNCOMMITTED_EVENT');
  }
  return event.sequence as number;
}

function fieldSequence(event: BandEvent): number {
  const sequence = runtimeSequence(event) + 1;
  if (!Number.isSafeInteger(sequence) || sequence <= 0) throw new Error('UNCOMMITTED_EVENT');
  return sequence;
}

function trace(
  event: BandEvent,
  scopeId: string,
  subjectRef: string,
  channel: FieldChannel,
  magnitude: number,
  decayWindowEvents: number,
): FieldTrace {
  return {
    sourceEventId: event.id,
    sourceSequence: fieldSequence(event),
    scopeId,
    subjectRef,
    channel,
    magnitude,
    decayWindowEvents,
  };
}

export function adaptCommittedEventsToStigmergicField(
  events: readonly BandEvent[],
): BandStigmergicAdaptation {
  if (events.length === 0) throw new Error('EMPTY_EVENT_SEQUENCE');

  const scopeId = events[0]!.sessionId;
  const sourceEvents: FieldSourceEvent[] = [];
  const traces: FieldTrace[] = [];
  const ringsWitnessesByTarget = new Map<string, Set<string>>();
  const ringsPairs = new Set<string>();

  for (const [index, event] of events.entries()) {
    if (event.sessionId !== scopeId) throw new Error('CROSS_SESSION_CONTAMINATION');
    if (runtimeSequence(event) !== index) throw new Error('UNCOMMITTED_EVENT');

    const sequence = fieldSequence(event);
    sourceEvents.push({ eventId: event.id, scopeId, sequence });

    switch (event.type) {
      case 'clip.proposed':
        traces.push(trace(event, scopeId, event.payload.clipId, 'attention', 500, 6));
        break;
      case 'clip.rejected':
        traces.push(trace(event, scopeId, event.payload.clipId, 'inhibition', 700, 5));
        break;
      case 'recognition.recorded': {
        const pairKey = JSON.stringify([event.payload.participantId, event.payload.targetId]);
        const isReturn = event.payload.outcome === 'rings' && ringsPairs.has(pairKey);

        if (event.payload.outcome === 'rings') {
          traces.push(trace(event, scopeId, event.payload.targetId, 'receptivity', 400, 5));
          const witnesses = ringsWitnessesByTarget.get(event.payload.targetId) ?? new Set<string>();
          const isNewWitness = !witnesses.has(event.payload.participantId);
          witnesses.add(event.payload.participantId);
          ringsWitnessesByTarget.set(event.payload.targetId, witnesses);
          if (isNewWitness && witnesses.size >= 3) {
            traces.push(trace(event, scopeId, event.payload.targetId, 'saturation', 600, 4));
          }
        } else if (event.payload.outcome === 'no') {
          traces.push(trace(event, scopeId, event.payload.targetId, 'tension', 350, 5));
        }

        if (isReturn) {
          traces.push(trace(event, scopeId, event.payload.targetId, 'return', 300, 6));
        }
        if (event.payload.outcome === 'rings') ringsPairs.add(pairKey);
        break;
      }
      case 'session.opened':
      case 'participant.joined':
      case 'clip.admitted':
      case 'anticipation.proposed':
      case 'anticipation.contested':
      case 'projection.policy_declared':
      case 'protected_silence.declared':
      case 'boundary.refusal_recorded':
      case 'mix.rendered':
      case 'session.closed':
      case 'capture.recorded':
      case 'handoff.recorded':
      case 'return.recorded':
      case 'decision.recorded':
        break;
    }
  }

  return {
    schemaVersion: 'stigmergic-field/v0.1',
    scopeId,
    policyVersion: BAND_STIGMERGIC_POLICY_VERSION,
    adapter: BAND_STIGMERGIC_ADAPTER,
    sourceEvents,
    traces,
  };
}
