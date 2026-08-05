import { BandEvent, RecognitionOutcome } from './events';

export interface Participant {
  id: string;
  role: string;
}

export interface Clip {
  id: string;
  participantId: string;
  mediaType: string;
  content: any;
  status: 'proposed' | 'admitted' | 'rejected';
}

export interface Recognition {
  participantId: string;
  targetId: string;
  outcome: RecognitionOutcome;
}

export interface ProjectionState {
  sessionId: string | null;
  participants: Map<string, Participant>;
  clips: Map<string, Clip>;
  recognitions: Recognition[];
  isClosed: boolean;
  policy: any | null;
}

export interface RefusalView {
  receiptId: string;
  attemptId: string;
  actorId: string;
  actorLocalSequence: number;
  boundary: 'protected_silence';
  reason: 'TARGET_PROTECTED_SILENCE';
  causalCutId: string;
  policyRef: string;
  attemptedArtifact: {
    artifactRef: string;
    payloadHash: string;
  };
  protectedArtifacts: Array<{
    artifactRef: string;
    contentHashBefore: string;
    contentHashAfter: string;
  }>;
  semanticEffect: 'none';
  projectionClassification: 'refusal_only';
  payloadVisibility: 'hash_only';
}

export interface SemanticInput {
  kind: 'admitted_clip' | 'recognition';
  sourceId: string;
  content?: unknown;
  participantId?: string;
  targetId?: string;
  outcome?: RecognitionOutcome;
}

export function createEmptyState(): ProjectionState {
  return {
    sessionId: null,
    participants: new Map(),
    clips: new Map(),
    recognitions: [],
    isClosed: false,
    policy: null,
  };
}

/** General semantic projection. Refusal receipts are intentionally non-participating. */
export function reduceProjection(events: readonly BandEvent[]): ProjectionState {
  const state = createEmptyState();

  for (const event of events) {
    switch (event.type) {
      case 'session.opened':
        state.sessionId = event.payload.sessionId;
        break;
      case 'participant.joined':
        state.participants.set(event.payload.participantId, {
          id: event.payload.participantId,
          role: event.payload.role,
        });
        break;
      case 'clip.proposed':
        state.clips.set(event.payload.clipId, {
          id: event.payload.clipId,
          participantId: event.payload.participantId,
          mediaType: event.payload.mediaType,
          content: event.payload.content,
          status: 'proposed',
        });
        break;
      case 'clip.admitted': {
        const clip = state.clips.get(event.payload.clipId);
        if (clip) clip.status = 'admitted';
        break;
      }
      case 'clip.rejected': {
        const clip = state.clips.get(event.payload.clipId);
        if (clip) clip.status = 'rejected';
        break;
      }
      case 'recognition.recorded':
        state.recognitions.push({
          participantId: event.payload.participantId,
          targetId: event.payload.targetId,
          outcome: event.payload.outcome,
        });
        break;
      case 'projection.policy_declared':
        state.policy = event.payload.rules;
        break;
      case 'session.closed':
        state.isClosed = true;
        break;
      case 'protected_silence.declared':
      case 'boundary.refusal_recorded':
      case 'anticipation.proposed':
      case 'anticipation.contested':
      case 'mix.rendered':
        break;
    }
  }

  return state;
}

/** Authorized refusal-only view. It cannot emit the refused request body. */
export function reduceRefusalProjection(
  events: readonly BandEvent[],
  audience: string,
): RefusalView[] {
  return events.flatMap((event): RefusalView[] => {
    if (event.type !== 'boundary.refusal_recorded') return [];
    if (!event.payload.disclosureAudience.includes(audience)) return [];

    return [{
      receiptId: event.id,
      attemptId: event.payload.attemptId,
      actorId: event.payload.actorId,
      actorLocalSequence: event.payload.actorLocalSequence,
      boundary: event.payload.boundary,
      reason: event.payload.reason,
      causalCutId: event.payload.causalCutId,
      policyRef: event.payload.policyRef,
      attemptedArtifact: structuredClone(event.payload.attemptedArtifact),
      protectedArtifacts: structuredClone(event.payload.protectedArtifacts),
      semanticEffect: 'none',
      projectionClassification: 'refusal_only',
      payloadVisibility: 'hash_only',
    }];
  });
}

/**
 * Inputs eligible for retrieval, indexing, relevance, or inference. Refusal and
 * protected-silence events have no code path into this list.
 */
export function buildSemanticInputs(events: readonly BandEvent[]): SemanticInput[] {
  const state = reduceProjection(events);
  const inputs: SemanticInput[] = [];

  for (const clip of state.clips.values()) {
    if (clip.status !== 'admitted') continue;
    inputs.push({
      kind: 'admitted_clip',
      sourceId: clip.id,
      content: structuredClone(clip.content),
      participantId: clip.participantId,
    });
  }

  for (const recognition of state.recognitions) {
    inputs.push({
      kind: 'recognition',
      sourceId: `${recognition.participantId}:${recognition.targetId}`,
      participantId: recognition.participantId,
      targetId: recognition.targetId,
      outcome: recognition.outcome,
    });
  }

  return inputs;
}

export function cloneState(state: ProjectionState): ProjectionState {
  const participants = new Map<string, Participant>();
  state.participants.forEach((value, key) => participants.set(key, structuredClone(value)));

  const clips = new Map<string, Clip>();
  state.clips.forEach((value, key) => clips.set(key, structuredClone(value)));

  return {
    sessionId: state.sessionId,
    participants,
    clips,
    recognitions: structuredClone(state.recognitions),
    isClosed: state.isClosed,
    policy: state.policy ? structuredClone(state.policy) : null,
  };
}
