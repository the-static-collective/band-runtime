import type { ReceivedHelpSlip } from './receive';

export type HelpCaseEventType =
  | 'offer.recorded'
  | 'commitment.recorded'
  | 'commitment.withdrawn'
  | 'attempt.recorded'
  | 'delivery.reported'
  | 'receipt.confirmed'
  | 'requirement.resolved_elsewhere'
  | 'requirement.waived'
  | 'case.note_recorded';

export type RecipientAuthorityBasis =
  'local_operator_declared_recipient_scope';

export interface HelpCaseEventBase {
  eventId: string;
  type: HelpCaseEventType;
  caseId: string;
  requirementId: string;
  occurredAt: string;
  actorRef?: string;
  authorityBasis?: RecipientAuthorityBasis;
  quantity?: number;
  unit?: string;
  note?: string;
}

export type HelpCaseEvent =
  | (HelpCaseEventBase & { type: 'offer.recorded' })
  | (HelpCaseEventBase & { type: 'commitment.recorded' })
  | (HelpCaseEventBase & {
      type: 'commitment.withdrawn';
      commitmentEventId: string;
      quantity?: never;
      unit?: never;
    })
  | (HelpCaseEventBase & { type: 'attempt.recorded' })
  | (HelpCaseEventBase & { type: 'delivery.reported' })
  | (HelpCaseEventBase & {
      type: 'receipt.confirmed';
      authorityBasis: RecipientAuthorityBasis;
    })
  | (HelpCaseEventBase & {
      type: 'requirement.resolved_elsewhere';
      authorityBasis: RecipientAuthorityBasis;
    })
  | (HelpCaseEventBase & {
      type: 'requirement.waived';
      authorityBasis: RecipientAuthorityBasis;
    })
  | (HelpCaseEventBase & {
      type: 'case.note_recorded';
      quantity?: never;
      unit?: never;
    });

export interface HelpCaseEventValidationContext {
  caseId: string;
  receives: readonly ReceivedHelpSlip[];
  priorEvents: readonly HelpCaseEvent[];
}

const RECIPIENT_AUTHORITY_EVENTS = new Set<HelpCaseEventType>([
  'receipt.confirmed',
  'requirement.resolved_elsewhere',
  'requirement.waived',
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function sourcePayloadForCase(
  caseId: string,
  receives: readonly ReceivedHelpSlip[],
) {
  const receipt = receives.find(
    (candidate) =>
      candidate.caseId === caseId &&
      candidate.admission === 'admitted' &&
      candidate.payload !== undefined,
  );

  if (!receipt?.payload) throw new Error('HELP_CASE_SOURCE_NOT_FOUND');
  return receipt.payload;
}

export function validateHelpCaseEvent(
  event: HelpCaseEvent,
  context: HelpCaseEventValidationContext,
): void {
  if (event.caseId !== context.caseId) {
    throw new Error('HELP_CASE_ID_MISMATCH');
  }

  if (
    !isNonEmptyString(event.eventId) ||
    !isNonEmptyString(event.requirementId) ||
    !isNonEmptyString(event.occurredAt)
  ) {
    throw new Error('INVALID_HELP_CASE_EVENT');
  }

  if (context.priorEvents.some((candidate) => candidate.eventId === event.eventId)) {
    throw new Error('HELP_CASE_EVENT_ID_CONFLICT');
  }

  const payload = sourcePayloadForCase(context.caseId, context.receives);
  const requirement = payload.requirements.find(
    (candidate) => candidate.id === event.requirementId,
  );
  if (!requirement) throw new Error('INVALID_HELP_CASE_REQUIREMENT');

  if (event.quantity !== undefined) {
    if (!isPositiveFiniteNumber(event.quantity)) {
      throw new Error('INVALID_HELP_CASE_QUANTITY');
    }
    if (!isNonEmptyString(event.unit)) {
      throw new Error('HELP_CASE_UNIT_REQUIRED');
    }
  }

  if (
    RECIPIENT_AUTHORITY_EVENTS.has(event.type) &&
    event.authorityBasis !== 'local_operator_declared_recipient_scope'
  ) {
    throw new Error('RECIPIENT_AUTHORITY_BASIS_REQUIRED');
  }

  if (event.type === 'case.note_recorded' && !isNonEmptyString(event.note)) {
    throw new Error('HELP_CASE_NOTE_REQUIRED');
  }

  if (event.type === 'commitment.withdrawn') {
    if (!isNonEmptyString(event.commitmentEventId)) {
      throw new Error('COMMITMENT_REFERENCE_REQUIRED');
    }

    const commitment = context.priorEvents.find(
      (candidate) =>
        candidate.eventId === event.commitmentEventId &&
        candidate.type === 'commitment.recorded' &&
        candidate.caseId === event.caseId &&
        candidate.requirementId === event.requirementId,
    );

    if (!commitment) throw new Error('INVALID_COMMITMENT_REFERENCE');

    const alreadyWithdrawn = context.priorEvents.some(
      (candidate) =>
        candidate.type === 'commitment.withdrawn' &&
        candidate.commitmentEventId === event.commitmentEventId,
    );

    if (alreadyWithdrawn) throw new Error('COMMITMENT_ALREADY_WITHDRAWN');
  }
}
