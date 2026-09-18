import type { FulfillmentRequirementV0 } from './envelope';
import type { HelpCaseEvent } from './events';
import type { ReceivedHelpSlip } from './receive';

export interface HelpRequirementProjection {
  requirementId: string;
  description: string;
  unit?: string;
  requestedQuantity?: number;
  offeredQuantity: number;
  activeCommittedQuantity: number;
  attemptedQuantity: number;
  reportedDeliveredQuantity: number;
  confirmedReceivedQuantity: number;
  resolvedElsewhereQuantity: number;
  waivedQuantity: number;
  confirmedResidualQuantity?: number;
  excessResolvedQuantity: number;
  qualitativeResolved: boolean;
  warnings: string[];
}

export interface HelpCaseProjection {
  caseId: string;
  sourceEnvelopeId: string;
  sourcePayloadHash: string;
  requirements: HelpRequirementProjection[];
  events: HelpCaseEvent[];
}

function sourceReceiptForCase(
  caseId: string,
  receives: readonly ReceivedHelpSlip[],
): ReceivedHelpSlip {
  const receipt = receives.find(
    (candidate) =>
      candidate.caseId === caseId &&
      candidate.admission === 'admitted' &&
      candidate.payload !== undefined &&
      candidate.payloadHash !== undefined,
  );
  if (!receipt?.payload || !receipt.payloadHash) {
    throw new Error('HELP_CASE_SOURCE_NOT_FOUND');
  }
  return receipt;
}

function amountForEvent(
  requirement: FulfillmentRequirementV0,
  event: HelpCaseEvent,
  warnings: string[],
): number {
  if (event.quantity === undefined) return 0;

  if (requirement.quantity === undefined) {
    warnings.push(`SOURCE_QUANTITY_UNKNOWN:${event.eventId}`);
    return 0;
  }

  if (event.unit !== requirement.unit) {
    warnings.push(`UNIT_MISMATCH:${event.eventId}`);
    return 0;
  }

  return event.quantity;
}

export function projectHelpCase(
  caseId: string,
  receives: readonly ReceivedHelpSlip[],
  events: readonly HelpCaseEvent[],
): HelpCaseProjection {
  const sourceReceipt = sourceReceiptForCase(caseId, receives);
  const source = sourceReceipt.payload!;
  const sourcePayloadHash = sourceReceipt.payloadHash!;

  const caseEvents = events.filter((event) => event.caseId === caseId);
  const withdrawnCommitments = new Set(
    caseEvents
      .filter((event) => event.type === 'commitment.withdrawn')
      .map((event) => event.commitmentEventId),
  );

  const requirements = source.requirements.map(
    (requirement): HelpRequirementProjection => {
      const requirementEvents = caseEvents.filter(
        (event) => event.requirementId === requirement.id,
      );
      const warnings: string[] = [];

      let offeredQuantity = 0;
      let activeCommittedQuantity = 0;
      let attemptedQuantity = 0;
      let reportedDeliveredQuantity = 0;
      let confirmedReceivedQuantity = 0;
      let resolvedElsewhereQuantity = 0;
      let waivedQuantity = 0;
      let qualitativeResolved = false;

      for (const event of requirementEvents) {
        if (event.type === 'commitment.withdrawn' || event.type === 'case.note_recorded') {
          continue;
        }

        const amount = amountForEvent(requirement, event, warnings);

        switch (event.type) {
          case 'offer.recorded':
            offeredQuantity += amount;
            break;
          case 'commitment.recorded':
            if (!withdrawnCommitments.has(event.eventId)) {
              activeCommittedQuantity += amount;
            }
            break;
          case 'attempt.recorded':
            attemptedQuantity += amount;
            break;
          case 'delivery.reported':
            reportedDeliveredQuantity += amount;
            break;
          case 'receipt.confirmed':
            if (requirement.quantity === undefined && event.quantity === undefined) {
              qualitativeResolved = true;
            } else {
              confirmedReceivedQuantity += amount;
            }
            break;
          case 'requirement.resolved_elsewhere':
            if (requirement.quantity === undefined && event.quantity === undefined) {
              qualitativeResolved = true;
            } else {
              resolvedElsewhereQuantity += amount;
            }
            break;
          case 'requirement.waived':
            if (requirement.quantity === undefined && event.quantity === undefined) {
              qualitativeResolved = true;
            } else {
              waivedQuantity += amount;
            }
            break;
        }
      }

      const resolvedQuantity =
        confirmedReceivedQuantity + resolvedElsewhereQuantity + waivedQuantity;
      const confirmedResidualQuantity =
        requirement.quantity === undefined
          ? undefined
          : Math.max(requirement.quantity - resolvedQuantity, 0);
      const excessResolvedQuantity =
        requirement.quantity === undefined
          ? 0
          : Math.max(resolvedQuantity - requirement.quantity, 0);

      return {
        requirementId: requirement.id,
        description: requirement.description,
        ...(requirement.unit === undefined ? {} : { unit: requirement.unit }),
        ...(requirement.quantity === undefined
          ? {}
          : { requestedQuantity: requirement.quantity }),
        offeredQuantity,
        activeCommittedQuantity,
        attemptedQuantity,
        reportedDeliveredQuantity,
        confirmedReceivedQuantity,
        resolvedElsewhereQuantity,
        waivedQuantity,
        ...(confirmedResidualQuantity === undefined
          ? {}
          : { confirmedResidualQuantity }),
        excessResolvedQuantity,
        qualitativeResolved,
        warnings,
      };
    },
  );

  return {
    caseId,
    sourceEnvelopeId: source.envelopeId,
    sourcePayloadHash,
    requirements,
    events: [...caseEvents],
  };
}
