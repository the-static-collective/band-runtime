import { describe, expect, it } from 'vitest';
import type { HelpCaseEvent } from '../src/help-case/events';
import { projectHelpCase } from '../src/help-case/projection';
import { receiveHelpSlip } from '../src/help-case/receive';
import { buildHelpCaseStatusPacket } from '../src/help-case/statusPacket';

const raw = JSON.stringify({
  schema: 'fulfillment-envelope/v0',
  envelopeId: 'env-return-1',
  purpose: 'Soup',
  createdAt: '2026-09-18T16:20:00.000Z',
  requirements: [{
    id: 'ingredient:beans',
    kind: 'ingredient',
    description: 'Beans',
    quantity: 4,
    unit: 'can',
  }],
  source: { system: 'Nourish-Kids' },
  disclosure: {
    includesOnlySelectedResiduals: true,
    omittedPrivateContext: true,
  },
  status: 'unmet',
});

const received = receiveHelpSlip(raw, {
  occurrenceId: 'receive-return-1',
  receivedAt: '2026-09-18T16:21:00.000Z',
  carrier: 'pasted_json',
}, []);

if (!received.heldCase) throw new Error('expected held case');

const caseId = received.heldCase.caseId;
const requirementId = 'ingredient:beans';

describe('RETURN-OF-THE-HELP-SLIP-001 status packet', () => {
  it('returns an attributable projection without letting activity erase demand', () => {
    const events: HelpCaseEvent[] = [
      {
        eventId: 'offer-1',
        type: 'offer.recorded',
        caseId,
        requirementId,
        occurredAt: '2026-09-18T16:22:00.000Z',
        actorRef: 'helper',
        quantity: 3,
        unit: 'can',
      },
      {
        eventId: 'report-1',
        type: 'delivery.reported',
        caseId,
        requirementId,
        occurredAt: '2026-09-18T16:23:00.000Z',
        actorRef: 'helper',
        quantity: 3,
        unit: 'can',
      },
      {
        eventId: 'confirm-1',
        type: 'receipt.confirmed',
        caseId,
        requirementId,
        occurredAt: '2026-09-18T16:24:00.000Z',
        actorRef: 'recipient',
        authorityBasis: 'local_operator_declared_recipient_scope',
        quantity: 1,
        unit: 'can',
      },
      {
        eventId: 'elsewhere-1',
        type: 'requirement.resolved_elsewhere',
        caseId,
        requirementId,
        occurredAt: '2026-09-18T16:25:00.000Z',
        actorRef: 'recipient',
        authorityBasis: 'local_operator_declared_recipient_scope',
        quantity: 1,
        unit: 'can',
      },
    ];

    const projection = projectHelpCase(caseId, [received.receipt], events);
    const packet = buildHelpCaseStatusPacket(
      projection,
      '2026-09-18T16:26:00.000Z',
    );

    expect(packet.schema).toBe('help-case-status/v0');
    expect(packet.sourcePayloadHash).toBe(received.receipt.payloadHash);
    expect(packet.projectionCut.eventRefs).toEqual([
      'offer-1',
      'report-1',
      'confirm-1',
      'elsewhere-1',
    ]);

    const item = packet.requirements[0];
    expect(item.confirmedReceivedQuantity).toBe(1);
    expect(item.resolvedElsewhereQuantity).toBe(1);
    expect(item.confirmedResidualQuantity).toBe(2);
    expect(item.conservation).toEqual({
      requestedPlusExcess: 4,
      consequencePlusResidual: 4,
      holds: true,
    });
  });

  it('keeps over-resolution visible as excess while preserving conservation', () => {
    const events: HelpCaseEvent[] = [{
      eventId: 'confirm-over',
      type: 'receipt.confirmed',
      caseId,
      requirementId,
      occurredAt: '2026-09-18T16:30:00.000Z',
      actorRef: 'recipient',
      authorityBasis: 'local_operator_declared_recipient_scope',
      quantity: 5,
      unit: 'can',
    }];

    const packet = buildHelpCaseStatusPacket(
      projectHelpCase(caseId, [received.receipt], events),
      '2026-09-18T16:31:00.000Z',
    );

    expect(packet.requirements[0].confirmedResidualQuantity).toBe(0);
    expect(packet.requirements[0].excessResolvedQuantity).toBe(1);
    expect(packet.requirements[0].conservation).toEqual({
      requestedPlusExcess: 5,
      consequencePlusResidual: 5,
      holds: true,
    });
  });

  it('refuses an unattributed projection cut', () => {
    const projection = projectHelpCase(caseId, [received.receipt], []);
    expect(() => buildHelpCaseStatusPacket(projection, '   ')).toThrow(
      'HELP_CASE_STATUS_PROJECTED_AT_REQUIRED',
    );
  });
});
