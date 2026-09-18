import { describe, expect, it } from 'vitest';
import { receiveHelpSlip } from '../src/help-case/receive';
import {
  validateHelpCaseEvent,
  type HelpCaseEvent,
} from '../src/help-case/events';
import { projectHelpCase } from '../src/help-case/projection';

const raw = JSON.stringify({
  schema: 'fulfillment-envelope/v0',
  envelopeId: 'env-4',
  purpose: 'Dinner',
  createdAt: '2026-09-18T14:00:00.000Z',
  requirements: [{
    id: 'ingredient:tomatoes',
    kind: 'ingredient',
    description: 'Canned tomatoes',
    quantity: 4,
    unit: 'can',
  }],
  source: { system: 'Nourish-Kids' },
  disclosure: { includesOnlySelectedResiduals: true, omittedPrivateContext: true },
  status: 'unmet',
});

const received = receiveHelpSlip(raw, {
  occurrenceId: 'receive-1',
  receivedAt: '2026-09-18T14:01:00.000Z',
  carrier: 'pasted_json',
}, []);

if (!received.heldCase) throw new Error('expected held case');
const caseId = received.heldCase.caseId;
const req = 'ingredient:tomatoes';

const base = {
  caseId,
  requirementId: req,
  unit: 'can',
};

describe('help-case projection', () => {
  it('does not reduce confirmed residual for offers, commitments, attempts, or reports', () => {
    const events: HelpCaseEvent[] = [
      { eventId: 'o1', type: 'offer.recorded', occurredAt: 't1', actorRef: 'alice', quantity: 2, ...base },
      { eventId: 'c1', type: 'commitment.recorded', occurredAt: 't2', actorRef: 'alice', quantity: 2, ...base },
      { eventId: 'a1', type: 'attempt.recorded', occurredAt: 't3', actorRef: 'alice', quantity: 2, ...base },
      { eventId: 'd1', type: 'delivery.reported', occurredAt: 't4', actorRef: 'alice', quantity: 2, ...base },
    ];

    const projection = projectHelpCase(caseId, [received.receipt], events);
    const item = projection.requirements[0];

    expect(item.offeredQuantity).toBe(2);
    expect(item.activeCommittedQuantity).toBe(2);
    expect(item.reportedDeliveredQuantity).toBe(2);
    expect(item.confirmedReceivedQuantity).toBe(0);
    expect(item.confirmedResidualQuantity).toBe(4);
  });

  it('reduces residual only through confirmation, outside resolution, or waiver', () => {
    const events: HelpCaseEvent[] = [
      {
        eventId: 'r1',
        type: 'receipt.confirmed',
        occurredAt: 't1',
        actorRef: 'recipient',
        authorityBasis: 'local_operator_declared_recipient_scope',
        quantity: 1,
        ...base,
      },
      {
        eventId: 'x1',
        type: 'requirement.resolved_elsewhere',
        occurredAt: 't2',
        actorRef: 'recipient',
        authorityBasis: 'local_operator_declared_recipient_scope',
        quantity: 2,
        ...base,
      },
      {
        eventId: 'w1',
        type: 'requirement.waived',
        occurredAt: 't3',
        actorRef: 'recipient',
        authorityBasis: 'local_operator_declared_recipient_scope',
        quantity: 1,
        ...base,
      },
    ];

    const projection = projectHelpCase(caseId, [received.receipt], events);
    const item = projection.requirements[0];

    expect(item.confirmedReceivedQuantity).toBe(1);
    expect(item.resolvedElsewhereQuantity).toBe(2);
    expect(item.waivedQuantity).toBe(1);
    expect(item.confirmedResidualQuantity).toBe(0);
  });

  it('withdraws an entire referenced commitment without erasing history', () => {
    const events: HelpCaseEvent[] = [
      { eventId: 'c1', type: 'commitment.recorded', occurredAt: 't1', actorRef: 'bob', quantity: 2, ...base },
      {
        eventId: 'cw1',
        type: 'commitment.withdrawn',
        occurredAt: 't2',
        actorRef: 'bob',
        commitmentEventId: 'c1',
        caseId,
        requirementId: req,
      },
    ];

    const projection = projectHelpCase(caseId, [received.receipt], events);
    expect(projection.requirements[0].activeCommittedQuantity).toBe(0);
    expect(projection.events).toHaveLength(2);
  });

  it('keeps unit mismatch visible without decrementing residual', () => {
    const events: HelpCaseEvent[] = [{
      eventId: 'r1',
      type: 'receipt.confirmed',
      occurredAt: 't1',
      actorRef: 'recipient',
      authorityBasis: 'local_operator_declared_recipient_scope',
      quantity: 2,
      unit: 'oz',
      caseId,
      requirementId: req,
    }];

    const projection = projectHelpCase(caseId, [received.receipt], events);
    expect(projection.requirements[0].confirmedResidualQuantity).toBe(4);
    expect(projection.requirements[0].warnings).toContain('UNIT_MISMATCH:r1');
  });

  it('floors residual at zero and exposes over-resolution as excess', () => {
    const events: HelpCaseEvent[] = [{
      eventId: 'r1',
      type: 'receipt.confirmed',
      occurredAt: 't1',
      actorRef: 'recipient',
      authorityBasis: 'local_operator_declared_recipient_scope',
      quantity: 5,
      ...base,
    }];

    const projection = projectHelpCase(caseId, [received.receipt], events);
    expect(projection.requirements[0].confirmedResidualQuantity).toBe(0);
    expect(projection.requirements[0].excessResolvedQuantity).toBe(1);
  });

  it('rejects malformed consequence events before append', () => {
    const context = {
      caseId,
      receives: [received.receipt],
      priorEvents: [] as HelpCaseEvent[],
    };

    expect(() => validateHelpCaseEvent({
      eventId: 'bad-quantity',
      type: 'receipt.confirmed',
      occurredAt: 't',
      actorRef: 'recipient',
      authorityBasis: 'local_operator_declared_recipient_scope',
      quantity: 0,
      ...base,
    }, context)).toThrow('INVALID_HELP_CASE_QUANTITY');

    expect(() => validateHelpCaseEvent({
      eventId: 'missing-authority',
      type: 'receipt.confirmed',
      occurredAt: 't',
      actorRef: 'recipient',
      quantity: 1,
      ...base,
    } as HelpCaseEvent, context)).toThrow('RECIPIENT_AUTHORITY_BASIS_REQUIRED');
  });
});
