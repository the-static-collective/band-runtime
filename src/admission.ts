import {
  BandEvent,
  BoundaryRefusalRecordedEvent,
  ParticipantJoinedEvent,
  ProtectedSilenceDeclaredEvent,
} from './events';

export interface ArtifactWriteAttempt {
  id: string;
  timestamp: number;
  sessionId: string;
  actorId: string;
  actorLocalSequence: number;
  causalCutId: string;
  targetArtifactRef: string;
  attemptedEffect: 'artifact.write';
  payloadHash: string;
  /** Ephemeral request body. It is deliberately excluded from every durable refusal residue. */
  payload?: unknown;
}

export interface AdmissionPolicy {
  ref: string;
  version: string;
  inputHash: string;
  evaluatorVersion: string;
  refusalAudience: string[];
}

export type AdmissionValidationCode =
  | 'MISSING_ATTEMPT_FIELDS'
  | 'INVALID_ACTOR_LOCAL_SEQUENCE'
  | 'UNKNOWN_CAUSAL_CUT'
  | 'SESSION_MISMATCH'
  | 'UNATTRIBUTED_ACTOR'
  | 'INVALID_POLICY';

export type AdmissionDecision =
  | {
      disposition: 'admitted';
      attemptId: string;
      causalCutId: string;
    }
  | {
      disposition: 'boundary_refused';
      receipt: BoundaryRefusalRecordedEvent;
    }
  | {
      disposition: 'validation_failed';
      code: AdmissionValidationCode;
    };

function validationFailed(code: AdmissionValidationCode): AdmissionDecision {
  return { disposition: 'validation_failed', code };
}

function isAttributedParticipant(
  event: BandEvent,
  actorId: string,
): event is ParticipantJoinedEvent {
  return event.type === 'participant.joined' && event.payload.participantId === actorId;
}

function isProtectingTarget(
  event: BandEvent,
  artifactRef: string,
): event is ProtectedSilenceDeclaredEvent {
  return event.type === 'protected_silence.declared' && event.payload.artifactRef === artifactRef;
}

/**
 * Pure admission decision for the first hostile-write slice.
 *
 * The decision reads only the supplied causal history and policy. It never mutates
 * history and never stores the attempted payload. A caller may append the returned
 * refusal receipt; an admitted decision merely authorizes a separately defined
 * domain event and does not invent one here.
 */
export function decideArtifactWriteAdmission(
  history: readonly BandEvent[],
  attempt: ArtifactWriteAttempt,
  policy: AdmissionPolicy,
): AdmissionDecision {
  if (
    !attempt.id ||
    !attempt.sessionId ||
    !attempt.actorId ||
    !attempt.causalCutId ||
    !attempt.targetArtifactRef ||
    !attempt.payloadHash ||
    attempt.attemptedEffect !== 'artifact.write' ||
    typeof attempt.timestamp !== 'number'
  ) {
    return validationFailed('MISSING_ATTEMPT_FIELDS');
  }

  if (!Number.isSafeInteger(attempt.actorLocalSequence) || attempt.actorLocalSequence < 0) {
    return validationFailed('INVALID_ACTOR_LOCAL_SEQUENCE');
  }

  if (
    !policy.ref ||
    !policy.version ||
    !policy.inputHash ||
    !policy.evaluatorVersion ||
    !Array.isArray(policy.refusalAudience) ||
    policy.refusalAudience.length === 0
  ) {
    return validationFailed('INVALID_POLICY');
  }

  const cutIndex = history.findIndex((event) => event.id === attempt.causalCutId);
  if (cutIndex === -1) {
    return validationFailed('UNKNOWN_CAUSAL_CUT');
  }

  const atCut = history.slice(0, cutIndex + 1);
  const opened = atCut.find((event) => event.type === 'session.opened');
  if (!opened || opened.sessionId !== attempt.sessionId) {
    return validationFailed('SESSION_MISMATCH');
  }

  if (!atCut.some((event) => isAttributedParticipant(event, attempt.actorId))) {
    return validationFailed('UNATTRIBUTED_ACTOR');
  }

  const protectedSilence = [...atCut]
    .reverse()
    .find((event) => isProtectingTarget(event, attempt.targetArtifactRef));

  if (!protectedSilence) {
    return {
      disposition: 'admitted',
      attemptId: attempt.id,
      causalCutId: attempt.causalCutId,
    };
  }

  const protectedProof = {
    artifactRef: protectedSilence.payload.artifactRef,
    contentHashBefore: protectedSilence.payload.contentHash,
    contentHashAfter: protectedSilence.payload.contentHash,
  } as const;

  return {
    disposition: 'boundary_refused',
    receipt: {
      id: `refusal:${attempt.id}`,
      type: 'boundary.refusal_recorded',
      timestamp: attempt.timestamp,
      sessionId: attempt.sessionId,
      payload: {
        attemptId: attempt.id,
        actorId: attempt.actorId,
        actorLocalSequence: attempt.actorLocalSequence,
        boundary: 'protected_silence',
        reason: 'TARGET_PROTECTED_SILENCE',
        causalCutId: attempt.causalCutId,
        policyRef: policy.ref,
        policyVersion: policy.version,
        policyInputHash: policy.inputHash,
        evaluatorVersion: policy.evaluatorVersion,
        attemptedEffect: attempt.attemptedEffect,
        targetRefs: [protectedSilence.payload.silenceId, attempt.targetArtifactRef],
        attemptedArtifact: {
          artifactRef: attempt.targetArtifactRef,
          payloadHash: attempt.payloadHash,
        },
        protectedArtifacts: [protectedProof],
        semanticEffect: 'none',
        projectionClassification: 'refusal_only',
        disclosureAudience: [...policy.refusalAudience],
        payloadVisibility: 'hash_only',
      },
    },
  };
}
