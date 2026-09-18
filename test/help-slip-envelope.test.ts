import { describe, expect, it } from 'vitest';
import {
  admitHelpSlipCarrier,
  serializeFulfillmentEnvelopeV0,
  type ImportedFulfillmentEnvelopeV0,
} from '../src/help-case/envelope';

const validPayload: ImportedFulfillmentEnvelopeV0 = {
  schema: 'fulfillment-envelope/v0',
  envelopeId: 'env-1',
  purpose: 'Help me make dinner',
  createdAt: '2026-09-18T14:00:00.000Z',
  requirements: [
    {
      id: 'ingredient:tomatoes',
      kind: 'ingredient',
      description: 'Canned tomatoes',
      quantity: 2,
      unit: 'can',
      neededBy: '2026-09-18T20:00:00-05:00',
    },
  ],
  source: {
    system: 'Nourish-Kids',
    recipeId: 'staple-1-tomato-bean-rice-bowl',
  },
  disclosure: {
    includesOnlySelectedResiduals: true,
    omittedPrivateContext: true,
  },
  status: 'unmet',
};

describe('fulfillment-envelope/v0 admission', () => {
  it('admits the exact supported shape and returns both hashes', () => {
    const raw = JSON.stringify(validPayload);
    const admitted = admitHelpSlipCarrier(raw);

    expect(admitted.disposition).toBe('admitted');
    if (admitted.disposition !== 'admitted') throw new Error('expected admitted');

    expect(admitted.payload).toEqual(validPayload);
    expect(admitted.canonicalPayload).toBe(serializeFulfillmentEnvelopeV0(validPayload));
    expect(admitted.carrierHash).toMatch(/^[a-f0-9]{64}$/);
    expect(admitted.payloadHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('distinguishes carrier whitespace from validated payload identity', () => {
    const compact = admitHelpSlipCarrier(JSON.stringify(validPayload));
    const spaced = admitHelpSlipCarrier(JSON.stringify(validPayload, null, 2));

    expect(compact.disposition).toBe('admitted');
    expect(spaced.disposition).toBe('admitted');
    if (compact.disposition !== 'admitted' || spaced.disposition !== 'admitted') {
      throw new Error('expected admitted');
    }

    expect(compact.carrierHash).not.toBe(spaced.carrierHash);
    expect(compact.payloadHash).toBe(spaced.payloadHash);
  });

  it.each([
    [{ ...validPayload, schema: 'fulfillment-envelope/v1' }, 'UNSUPPORTED_SCHEMA'],
    [{ ...validPayload, status: 'fulfilled' }, 'UNSUPPORTED_SOURCE_STATUS'],
    [{
      ...validPayload,
      disclosure: { includesOnlySelectedResiduals: false, omittedPrivateContext: true },
    }, 'INVALID_DISCLOSURE'],
    [{ ...validPayload, requirements: [] }, 'EMPTY_REQUIREMENTS'],
    [{
      ...validPayload,
      requirements: [{ id: 'x', kind: 'ingredient', description: 'x', quantity: 1 }],
    }, 'QUANTITY_WITHOUT_UNIT'],
    [{
      ...validPayload,
      requirements: [{ id: 'x', kind: 'ingredient', description: 'x', quantity: 0, unit: 'each' }],
    }, 'INVALID_QUANTITY'],
  ])('refuses malformed or unsupported payload %#', (payload, reason) => {
    const result = admitHelpSlipCarrier(JSON.stringify(payload));
    expect(result).toMatchObject({ disposition: 'refused', reason });
  });

  it('refuses invalid JSON while still hashing the exact carrier', () => {
    const result = admitHelpSlipCarrier('{bad json');
    expect(result.disposition).toBe('refused');
    expect(result.carrierHash).toMatch(/^[a-f0-9]{64}$/);
    if (result.disposition !== 'refused') throw new Error('expected refused');
    expect(result.reason).toBe('INVALID_JSON');
  });
});
