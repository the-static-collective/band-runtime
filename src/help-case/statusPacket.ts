import type { HelpCaseProjection } from './projection';

export interface HelpCaseStatusConservationV0 {
  requestedPlusExcess: number;
  consequencePlusResidual: number;
  holds: true;
}

export interface HelpCaseStatusRequirementV0 {
  requirementId: string;
  description: string;
  unit?: string;
  requestedQuantity?: number;
  confirmedReceivedQuantity: number;
  resolvedElsewhereQuantity: number;
  waivedQuantity: number;
  confirmedResidualQuantity?: number;
  excessResolvedQuantity: number;
  qualitativeResolved: boolean;
  warnings: string[];
  conservation?: HelpCaseStatusConservationV0;
}

export interface HelpCaseStatusPacketV0 {
  schema: 'help-case-status/v0';
  caseId: string;
  sourceEnvelopeId: string;
  sourcePayloadHash: string;
  projectedAt: string;
  projectionCut: {
    eventRefs: string[];
    occurrences: Array<{
      eventRef: string;
      type: string;
      occurredAt: string;
    }>;
  };
  requirements: HelpCaseStatusRequirementV0[];
  claims: {
    projectionOnly: true;
    residualChangesOnlyThroughRecipientConsequence: true;
    quantitativeConservationChecked: true;
  };
  doesNotClaim: [
    'status packet != authority',
    'delivery reported != receipt confirmed',
    'projection != source request',
    'status packet != Book of Acts entry'
  ];
}

function nearlyEqual(left: number, right: number): boolean {
  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  return Math.abs(left - right) <= Number.EPSILON * scale * 8;
}

export function buildHelpCaseStatusPacket(
  projection: HelpCaseProjection,
  projectedAt: string,
): HelpCaseStatusPacketV0 {
  if (!projectedAt.trim()) {
    throw new Error('HELP_CASE_STATUS_PROJECTED_AT_REQUIRED');
  }

  const requirements = projection.requirements.map(
    (requirement): HelpCaseStatusRequirementV0 => {
      const base = {
        requirementId: requirement.requirementId,
        description: requirement.description,
        ...(requirement.unit === undefined ? {} : { unit: requirement.unit }),
        ...(requirement.requestedQuantity === undefined
          ? {}
          : { requestedQuantity: requirement.requestedQuantity }),
        confirmedReceivedQuantity: requirement.confirmedReceivedQuantity,
        resolvedElsewhereQuantity: requirement.resolvedElsewhereQuantity,
        waivedQuantity: requirement.waivedQuantity,
        ...(requirement.confirmedResidualQuantity === undefined
          ? {}
          : { confirmedResidualQuantity: requirement.confirmedResidualQuantity }),
        excessResolvedQuantity: requirement.excessResolvedQuantity,
        qualitativeResolved: requirement.qualitativeResolved,
        warnings: [...requirement.warnings],
      };

      if (
        requirement.requestedQuantity === undefined ||
        requirement.confirmedResidualQuantity === undefined
      ) {
        return base;
      }

      const requestedPlusExcess =
        requirement.requestedQuantity + requirement.excessResolvedQuantity;
      const consequencePlusResidual =
        requirement.confirmedReceivedQuantity +
        requirement.resolvedElsewhereQuantity +
        requirement.waivedQuantity +
        requirement.confirmedResidualQuantity;

      if (!nearlyEqual(requestedPlusExcess, consequencePlusResidual)) {
        throw new Error(
          `HELP_CASE_CONSERVATION_BREACH:${requirement.requirementId}`,
        );
      }

      return {
        ...base,
        conservation: {
          requestedPlusExcess,
          consequencePlusResidual,
          holds: true,
        },
      };
    },
  );

  return {
    schema: 'help-case-status/v0',
    caseId: projection.caseId,
    sourceEnvelopeId: projection.sourceEnvelopeId,
    sourcePayloadHash: projection.sourcePayloadHash,
    projectedAt,
    projectionCut: {
      eventRefs: projection.events.map((event) => event.eventId),
      occurrences: projection.events.map((event) => ({
        eventRef: event.eventId,
        type: event.type,
        occurredAt: event.occurredAt,
      })),
    },
    requirements,
    claims: {
      projectionOnly: true,
      residualChangesOnlyThroughRecipientConsequence: true,
      quantitativeConservationChecked: true,
    },
    doesNotClaim: [
      'status packet != authority',
      'delivery reported != receipt confirmed',
      'projection != source request',
      'status packet != Book of Acts entry',
    ],
  };
}
