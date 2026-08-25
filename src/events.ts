export type EventType =
  | 'session.opened'
  | 'participant.joined'
  | 'clip.proposed'
  | 'clip.admitted'
  | 'clip.rejected'
  | 'recognition.recorded'
  | 'anticipation.proposed'
  | 'anticipation.contested'
  | 'projection.policy_declared'
  | 'protected_silence.declared'
  | 'boundary.refusal_recorded'
  | 'mix.rendered'
  | 'session.closed'
  | 'capture.recorded'
  | 'handoff.recorded'
  | 'return.recorded'
  | 'decision.recorded';

export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: number;
  /** Minimum thread/session binding required to prevent cross-session contamination. */
  sessionId: string;
  /** Deterministic append position assigned by the store. Not required on input, assigned on admission. */
  sequence?: number;
}

export interface SessionOpenedEvent extends BaseEvent {
  type: 'session.opened';
  payload: { sessionId: string };
}

export interface ParticipantJoinedEvent extends BaseEvent {
  type: 'participant.joined';
  payload: { participantId: string; role: string };
}

export interface ClipProposedEvent extends BaseEvent {
  type: 'clip.proposed';
  payload: { participantId: string; clipId: string; mediaType: string; content: any };
}

export interface ClipAdmittedEvent extends BaseEvent {
  type: 'clip.admitted';
  payload: { clipId: string };
}

/**
 * clip.rejected is a deterministic clip lifecycle decision. It is distinct from
 * recognition.recorded, which is a subjective recognition receipt.
 */
export interface ClipRejectedEvent extends BaseEvent {
  type: 'clip.rejected';
  payload: { clipId: string; reason?: string };
}

export type RecognitionOutcome = 'rings' | 'nearby' | 'projection' | 'no';

export interface RecognitionRecordedEvent extends BaseEvent {
  type: 'recognition.recorded';
  payload: { participantId: string; targetId: string; outcome: RecognitionOutcome };
}

export interface AnticipationProposedEvent extends BaseEvent {
  type: 'anticipation.proposed';
  payload: { participantId: string; anticipationId: string; content: any };
}

export interface AnticipationContestedEvent extends BaseEvent {
  type: 'anticipation.contested';
  payload: { participantId: string; anticipationId: string };
}

export interface ProjectionPolicyDeclaredEvent extends BaseEvent {
  type: 'projection.policy_declared';
  payload: { policyId: string; rules: any };
}

export interface ProtectedSilenceDeclaredEvent extends BaseEvent {
  type: 'protected_silence.declared';
  payload: {
    silenceId: string;
    participantId: string;
    artifactRef: string;
    contentHash: string;
    causalCutId: string;
  };
}

export interface ProtectedArtifactProof {
  artifactRef: string;
  contentHashBefore: string;
  contentHashAfter: string;
}

export interface BoundaryRefusalRecordedEvent extends BaseEvent {
  type: 'boundary.refusal_recorded';
  payload: {
    attemptId: string;
    actorId: string;
    actorLocalSequence: number;
    boundary: 'protected_silence';
    reason: 'TARGET_PROTECTED_SILENCE';
    causalCutId: string;
    policyRef: string;
    policyVersion: string;
    policyInputHash: string;
    evaluatorVersion: string;
    attemptedEffect: 'artifact.write';
    targetRefs: string[];
    attemptedArtifact: {
      artifactRef: string;
      payloadHash: string;
    };
    protectedArtifacts: ProtectedArtifactProof[];
    semanticEffect: 'none';
    projectionClassification: 'refusal_only';
    disclosureAudience: string[];
    payloadVisibility: 'hash_only';
  };
}

export interface MixRenderedEvent extends BaseEvent {
  type: 'mix.rendered';
  payload: { causalCutId: string; mixUrl: string };
}

export interface SessionClosedEvent extends BaseEvent {
  type: 'session.closed';
  payload: { sessionId: string };
}

export type CaptureMaterialKind = 'text' | 'voice' | 'file' | 'screenshot' | 'url';
export type PayloadCompleteness = 'EXACT' | 'PARTIAL' | 'UNKNOWN';
export type DeliveryStatus = 'DECLARED' | 'WITNESSED' | 'FAILED' | 'UNKNOWN';
export type ReturnRelationStatus = 'WITNESSED' | 'CLAIMED' | 'PARTIAL' | 'UNRESOLVED' | 'REFUTED';
export type DecisionValue = 'KEEP' | 'REFUSE' | 'WRONG' | 'INTERESTING';

export type WitnessMaterial =
  | { kind: 'text'; text: string; sha256: string }
  | { kind: 'url'; url: string; sha256?: string }
  | {
      kind: 'voice' | 'file' | 'screenshot';
      artifactRef: string;
      sha256: string;
      mimeType?: string;
      filename?: string;
    };

export type OutboundSnapshot = {
  completeness: PayloadCompleteness;
  text?: string;
  artifactRef?: string;
  sha256?: string;
  metadata?: Record<string, unknown>;
};

export type DeliveryEvidence = {
  status: DeliveryStatus;
  evidence: string[];
  reason?: string;
};

export type ObservedReturn = {
  text?: string;
  artifactRef?: string;
  metadata?: Record<string, unknown>;
};

export type ReturnRelation =
  | {
      handoffId: string;
      status: 'WITNESSED' | 'CLAIMED' | 'PARTIAL';
      evidence: string[];
      reason?: string;
    }
  | { handoffId: null; status: 'UNRESOLVED'; evidence: string[]; reason?: string }
  | {
      handoffId: string;
      status: 'REFUTED';
      evidence: string[];
      refutesReturnId: string;
      reason: string;
    };

export interface CaptureRecordedEvent extends BaseEvent {
  type: 'capture.recorded';
  payload: {
    actorId: string;
    material: WitnessMaterial;
    intent: string | null;
    localObservedAt: string | null;
    parentCaptureId: string | null;
  };
}

export interface HandoffRecordedEvent extends BaseEvent {
  type: 'handoff.recorded';
  payload: {
    actorId: string;
    sourceCaptureIds: string[];
    destination: string;
    outbound: OutboundSnapshot;
    delivery: DeliveryEvidence;
  };
}

export interface ReturnRecordedEvent extends BaseEvent {
  type: 'return.recorded';
  payload: {
    actorId: string;
    provider: string;
    providerArtifactId: string | null;
    observed: ObservedReturn;
    relation: ReturnRelation;
  };
}

export interface DecisionRecordedEvent extends BaseEvent {
  type: 'decision.recorded';
  payload: {
    actorId: string;
    returnId: string;
    decision: DecisionValue;
    note: string | null;
  };
}

export type BandEvent =
  | SessionOpenedEvent
  | ParticipantJoinedEvent
  | ClipProposedEvent
  | ClipAdmittedEvent
  | ClipRejectedEvent
  | RecognitionRecordedEvent
  | AnticipationProposedEvent
  | AnticipationContestedEvent
  | ProjectionPolicyDeclaredEvent
  | ProtectedSilenceDeclaredEvent
  | BoundaryRefusalRecordedEvent
  | MixRenderedEvent
  | SessionClosedEvent
  | CaptureRecordedEvent
  | HandoffRecordedEvent
  | ReturnRecordedEvent
  | DecisionRecordedEvent;
