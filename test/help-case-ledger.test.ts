import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { HelpCaseLedger } from '../src/help-case/ledger';
import type { ReceivedHelpSlip } from '../src/help-case/receive';
import type { HelpCaseEvent } from '../src/help-case/events';

const roots: string[] = [];
const tempRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'band-runtime-help-case-'));
  roots.push(root);
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('HelpCaseLedger', () => {
  it('appends receive and event records without rewriting prior lines', () => {
    const root = tempRoot();
    const ledger = new HelpCaseLedger(root);

    const receive = {
      occurrenceId: 'r1',
      receivedAt: 't1',
      carrier: 'pasted_json',
      carrierHash: 'a'.repeat(64),
      payloadHash: 'b'.repeat(64),
      payload: {
        schema: 'fulfillment-envelope/v0',
        envelopeId: 'env',
        purpose: 'Dinner',
        createdAt: 't0',
        requirements: [{ id: 'x', kind: 'ingredient', description: 'x', quantity: 1, unit: 'each' }],
        source: { system: 'Nourish-Kids' },
        disclosure: { includesOnlySelectedResiduals: true, omittedPrivateContext: true },
        status: 'unmet',
      },
      admission: 'admitted',
      caseId: `help-case:${'b'.repeat(64)}`,
    } satisfies ReceivedHelpSlip;

    const event = {
      eventId: 'e1',
      type: 'offer.recorded',
      caseId: receive.caseId,
      requirementId: 'x',
      occurredAt: 't2',
      actorRef: 'alice',
      quantity: 1,
      unit: 'each',
    } satisfies HelpCaseEvent;

    ledger.appendReceive(receive);
    const receivesBefore = readFileSync(join(root, 'receives.jsonl'), 'utf8');
    ledger.appendEvent(event);
    const receivesAfter = readFileSync(join(root, 'receives.jsonl'), 'utf8');

    expect(receivesAfter).toBe(receivesBefore);
    expect(ledger.loadReceives()).toEqual([receive]);
    expect(ledger.loadEvents()).toEqual([event]);
  });

  it('fails closed on malformed ledger JSON', () => {
    const root = tempRoot();
    const ledger = new HelpCaseLedger(root);
    appendFileSync(join(root, 'receives.jsonl'), '{bad\n', 'utf8');

    expect(() => ledger.loadReceives()).toThrow('MALFORMED_HELP_CASE_LEDGER');
  });
});
