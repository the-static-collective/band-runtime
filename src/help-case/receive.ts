import {
  admitHelpSlipCarrier,
  type HelpSlipRefusalReason,
  type ImportedFulfillmentEnvelopeV0,
} from './envelope';

export interface ReceiveMetadata {
  occurrenceId: string;
  receivedAt: string;
  carrier: 'pasted_json';
}

export interface ReceivedHelpSlip {
  occurrenceId: string;
  receivedAt: string;
  carrier: 'pasted_json';
  carrierHash: string;
  payloadHash?: string;
  payload?: ImportedFulfillmentEnvelopeV0;
  admission: 'admitted' | 'refused' | 'quarantined';
  refusalReason?: HelpSlipRefusalReason;
  caseId?: string;
  duplicateOfOccurrenceId?: string;
}

export interface HeldHelpCase {
  caseId: string;
  sourceOccurrenceId: string;
  sourceEnvelopeId: string;
  sourcePayloadHash: string;
  admittedAt: string;
}

export interface ReceiveHelpSlipResult {
  receipt: ReceivedHelpSlip;
  heldCase?: HeldHelpCase;
  caseCreated: boolean;
}

function caseIdFor(payloadHash: string): string {
  return `help-case:${payloadHash}`;
}

export function receiveHelpSlip(
  rawText: string,
  metadata: ReceiveMetadata,
  priorReceives: readonly ReceivedHelpSlip[],
): ReceiveHelpSlipResult {
  const admission = admitHelpSlipCarrier(rawText);

  if (admission.disposition === 'refused') {
    return {
      receipt: {
        occurrenceId: metadata.occurrenceId,
        receivedAt: metadata.receivedAt,
        carrier: metadata.carrier,
        carrierHash: admission.carrierHash,
        admission: 'refused',
        refusalReason: admission.reason,
      },
      caseCreated: false,
    };
  }

  const firstMatchingReceive = priorReceives.find(
    (receipt) =>
      receipt.admission === 'admitted' &&
      receipt.payloadHash === admission.payloadHash &&
      receipt.caseId !== undefined,
  );

  const caseId = firstMatchingReceive?.caseId ?? caseIdFor(admission.payloadHash);
  const receipt: ReceivedHelpSlip = {
    occurrenceId: metadata.occurrenceId,
    receivedAt: metadata.receivedAt,
    carrier: metadata.carrier,
    carrierHash: admission.carrierHash,
    payloadHash: admission.payloadHash,
    payload: admission.payload,
    admission: 'admitted',
    caseId,
    ...(firstMatchingReceive === undefined
      ? {}
      : { duplicateOfOccurrenceId: firstMatchingReceive.occurrenceId }),
  };

  if (firstMatchingReceive !== undefined) {
    return {
      receipt,
      heldCase: {
        caseId,
        sourceOccurrenceId: firstMatchingReceive.occurrenceId,
        sourceEnvelopeId:
          firstMatchingReceive.payload?.envelopeId ?? admission.payload.envelopeId,
        sourcePayloadHash: admission.payloadHash,
        admittedAt: firstMatchingReceive.receivedAt,
      },
      caseCreated: false,
    };
  }

  return {
    receipt,
    heldCase: {
      caseId,
      sourceOccurrenceId: metadata.occurrenceId,
      sourceEnvelopeId: admission.payload.envelopeId,
      sourcePayloadHash: admission.payloadHash,
      admittedAt: metadata.receivedAt,
    },
    caseCreated: true,
  };
}
