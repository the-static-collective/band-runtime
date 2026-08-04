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
  | 'mix.rendered'
  | 'session.closed';

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
 * Note: clip.rejected is a deterministic clip lifecycle decision.
 * It is distinctly different from recognition.recorded, which is a subjective recognition receipt.
 * Do not conflate lifecycle bounds with subjective recognition just because both influence derived state.
 */
export interface ClipRejectedEvent extends BaseEvent {
  type: 'clip.rejected';
  payload: { clipId: string; reason?: string };
}

export type RecognitionOutcome = 'rings' | 'nearby' | 'projection' | 'no';

/**
 * Note: recognition.recorded is a subjective receipt/intervention.
 * It does not rewrite historical events; it merely appends an influence for future deterministic projections.
 */
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

export interface MixRenderedEvent extends BaseEvent {
  type: 'mix.rendered';
  payload: { causalCutId: string; mixUrl: string };
}

export interface SessionClosedEvent extends BaseEvent {
  type: 'session.closed';
  payload: { sessionId: string };
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
  | MixRenderedEvent
  | SessionClosedEvent;
