import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { HoldingBasketRuntime } from '../src/help-case/runtime';

const roots: string[] = [];
const tempRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'holding-basket-'));
  roots.push(root);
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const helpSlip = JSON.stringify({
  schema: 'fulfillment-envelope/v0',
  envelopeId: 'env-real-1',
  purpose: 'Dinner for three',
  createdAt: '2026-09-18T15:00:00.000Z',
  requirements: [{
    id: 'ingredient:tomatoes',
    kind: 'ingredient',
    description: 'Canned tomatoes',
    quantity: 2,
    unit: 'can',
    neededBy: '2026-09-18T20:00:00-05:00',
  }],
  source: {
    system: 'Nourish-Kids',
    recipeId: 'staple-1-tomato-bean-rice-bowl',
  },
  disclosure: {
    includesOnlySelectedResiduals: true,
    omittedPrivateContext: true,
  },
  status: 'unmet',
});

describe('HELP-SLIP-HOLDING-BASKET-001 acceptance', () => {
  it('survives duplicate receive, partial confirmation, restart, and outside resolution', () => {
    const root = tempRoot();
    const firstRuntime = new HoldingBasketRuntime(root);

    const first = firstRuntime.receive(helpSlip, {
      occurrenceId: 'receive-1',
      receivedAt: '2026-09-18T15:01:00.000Z',
      carrier: 'pasted_json',
    });
    if (!first.heldCase) throw new Error('expected held case');

    const caseId = first.heldCase.caseId;
    const payloadHash = first.receipt.payloadHash;
    const carrierHash = first.receipt.carrierHash;

    const second = firstRuntime.receive(JSON.stringify(JSON.parse(helpSlip), null, 2), {
      occurrenceId: 'receive-2',
      receivedAt: '2026-09-18T15:02:00.000Z',
      carrier: 'pasted_json',
    });

    expect(second.caseCreated).toBe(false);
    expect(second.heldCase?.caseId).toBe(caseId);
    expect(firstRuntime.getReceives(caseId)).toHaveLength(2);

    firstRuntime.record({
      eventId: 'commit-1',
      type: 'commitment.recorded',
      caseId,
      requirementId: 'ingredient:tomatoes',
      occurredAt: '2026-09-18T15:05:00.000Z',
      actorRef: 'helper-a',
      quantity: 2,
      unit: 'can',
    });

    firstRuntime.record({
      eventId: 'report-1',
      type: 'delivery.reported',
      caseId,
      requirementId: 'ingredient:tomatoes',
      occurredAt: '2026-09-18T15:10:00.000Z',
      actorRef: 'helper-a',
      quantity: 2,
      unit: 'can',
    });

    expect(
      firstRuntime.getProjection(caseId).requirements[0].confirmedResidualQuantity,
    ).toBe(2);

    firstRuntime.record({
      eventId: 'confirm-1',
      type: 'receipt.confirmed',
      caseId,
      requirementId: 'ingredient:tomatoes',
      occurredAt: '2026-09-18T15:15:00.000Z',
      actorRef: 'recipient',
      authorityBasis: 'local_operator_declared_recipient_scope',
      quantity: 1,
      unit: 'can',
    });

    expect(
      firstRuntime.getProjection(caseId).requirements[0].confirmedResidualQuantity,
    ).toBe(1);

    const restoredRuntime = new HoldingBasketRuntime(root);
    const restored = restoredRuntime.getProjection(caseId);

    expect(restored.sourcePayloadHash).toBe(payloadHash);
    expect(restored.requirements[0].confirmedResidualQuantity).toBe(1);
    expect(restoredRuntime.getReceives(caseId)[0].carrierHash).toBe(carrierHash);

    restoredRuntime.record({
      eventId: 'elsewhere-1',
      type: 'requirement.resolved_elsewhere',
      caseId,
      requirementId: 'ingredient:tomatoes',
      occurredAt: '2026-09-18T15:20:00.000Z',
      actorRef: 'recipient',
      authorityBasis: 'local_operator_declared_recipient_scope',
      quantity: 1,
      unit: 'can',
    });

    const final = restoredRuntime.getProjection(caseId);
    expect(final.requirements[0].confirmedResidualQuantity).toBe(0);
    expect(final.requirements[0].confirmedReceivedQuantity).toBe(1);
    expect(final.requirements[0].resolvedElsewhereQuantity).toBe(1);
    expect(final.requirements[0].reportedDeliveredQuantity).toBe(2);
  });
});
