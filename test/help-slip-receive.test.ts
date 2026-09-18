import { describe, expect, it } from 'vitest';
import { receiveHelpSlip } from '../src/help-case/receive';

const raw = JSON.stringify({
  schema: 'fulfillment-envelope/v0',
  envelopeId: 'env-1',
  purpose: 'Dinner',
  createdAt: '2026-09-18T14:00:00.000Z',
  requirements: [
    {
      id: 'ingredient:tomatoes',
      kind: 'ingredient',
      description: 'Canned tomatoes',
      quantity: 2,
      unit: 'can',
    },
  ],
  source: { system: 'Nourish-Kids' },
  disclosure: {
    includesOnlySelectedResiduals: true,
    omittedPrivateContext: true,
  },
  status: 'unmet',
});

describe('help slip RECEIVE/HOLD', () => {
  it('creates one held case on first admitted receive', () => {
    const first = receiveHelpSlip(raw, {
      occurrenceId: 'receive-1',
      receivedAt: '2026-09-18T14:01:00.000Z',
      carrier: 'pasted_json',
    }, []);

    expect(first.receipt.admission).toBe('admitted');
    expect(first.caseCreated).toBe(true);
    expect(first.heldCase?.caseId).toMatch(/^help-case:/);
  });

  it('records a second receive occurrence without creating duplicate demand', () => {
    const first = receiveHelpSlip(raw, {
      occurrenceId: 'receive-1',
      receivedAt: '2026-09-18T14:01:00.000Z',
      carrier: 'pasted_json',
    }, []);

    const second = receiveHelpSlip(JSON.stringify(JSON.parse(raw), null, 2), {
      occurrenceId: 'receive-2',
      receivedAt: '2026-09-18T14:02:00.000Z',
      carrier: 'pasted_json',
    }, [first.receipt]);

    expect(second.receipt.admission).toBe('admitted');
    expect(second.caseCreated).toBe(false);
    expect(second.heldCase?.caseId).toBe(first.heldCase?.caseId);
    expect(second.receipt.duplicateOfOccurrenceId).toBe('receive-1');
    expect(second.receipt.carrierHash).not.toBe(first.receipt.carrierHash);
    expect(second.receipt.payloadHash).toBe(first.receipt.payloadHash);
  });

  it('records refusal without creating a held case', () => {
    const refused = receiveHelpSlip('{bad', {
      occurrenceId: 'receive-bad',
      receivedAt: '2026-09-18T14:03:00.000Z',
      carrier: 'pasted_json',
    }, []);

    expect(refused.receipt.admission).toBe('refused');
    expect(refused.caseCreated).toBe(false);
    expect(refused.heldCase).toBeUndefined();
    expect(refused.receipt.caseId).toBeUndefined();
  });
});
