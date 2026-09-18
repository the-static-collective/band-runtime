# HELP-SLIP-HOLDING-BASKET-001 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a receiver-local Band Runtime kernel that imports an immutable Nourish `fulfillment-envelope/v0`, records duplicate arrivals without duplicating demand, appends distinct fulfillment-history events, persists them locally, and deterministically reconstructs an honest residual across restart.

**Architecture:** Add a dedicated `src/help-case/` subsystem rather than extending the global `BandEvent` union. The subsystem follows Band Runtime's existing pattern—strict admission, append-only history, pure projection, replay—but remains isolated from media/session projection, retrieval, CAPTURE-001, and stigmergic adaptation. A thin `HoldingBasketRuntime` composes envelope admission, receive-occurrence handling, JSONL persistence, event validation, and residual projection for later NanaSpork/Garden adaptation.

**Tech Stack:** TypeScript 5.9, Node.js 22 built-ins (`node:crypto`, `node:fs`, `node:path`), Vitest 2.1.9. No new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-09-18-help-slip-holding-basket-001-design.md`

## Global Constraints

- Implement help-case events as a dedicated Band Runtime submodule; do not extend the existing global `BandEvent` union.
- Accept only `schema: "fulfillment-envelope/v0"`.
- Imported source payload is immutable after admission.
- Keep `RECEIVE != ADMIT`, `HOLD != OWN`, and `POUR != AUTHORIZE`.
- Keep `DeliveryReported != ReceiptConfirmed`.
- Offers, commitments, attempts, and delivery reports never reduce confirmed residual.
- Only `receipt.confirmed`, `requirement.resolved_elsewhere`, and `requirement.waived` may reduce confirmed residual.
- Recipient-authority events record `authorityBasis: "local_operator_declared_recipient_scope"`; this is not authenticated identity.
- No silent unit conversion. Quantity-bearing consequence requires exact unit equality with the source requirement.
- Positive finite quantities only. Reject zero, negative, `NaN`, and `Infinity`.
- Duplicate payload import records a new receive occurrence but reuses the first held case for the same `payloadHash`.
- Keep both `carrierHash` (exact UTF-8 carrier bytes) and `payloadHash` (validated schema-order serialization).
- V0 commitment withdrawal is whole-commitment only and must reference an existing prior commitment in the same case and requirement.
- Runtime request data is local-only and must never be committed.
- No browser UI, accounts, authentication, networking, automatic forwarding, helper matching, prioritization, reputation, money, Campfire integration, TranchNode integration, ALEX runtime dependency, Dogram runtime dependency, or BODY interface declaration.
- Tests that touch persistence use temporary directories only.
- Do not modify `src/events.ts`, `src/store.ts`, `src/projection.ts`, `src/runtime.ts`, or `src/stigmergic-adapter.ts` unless a test proves an isolation regression that cannot be fixed inside `src/help-case/`.

---

## File Map

Create:

- `src/help-case/envelope.ts` — strict foreign-envelope parsing, schema-order serialization, `carrierHash`, and `payloadHash`.
- `src/help-case/receive.ts` — receive occurrence, duplicate observation, and held-case identity.
- `src/help-case/events.ts` — receiver-local help-case event vocabulary and event validation.
- `src/help-case/projection.ts` — pure residual/commitment/report projection from immutable source + append-only events.
- `src/help-case/ledger.ts` — append-only local JSONL persistence and replay.
- `src/help-case/runtime.ts` — narrow orchestration surface intended for a future NanaSpork/Garden adapter.
- `test/help-slip-envelope.test.ts`
- `test/help-slip-receive.test.ts`
- `test/help-case-projection.test.ts`
- `test/help-case-ledger.test.ts`
- `test/help-slip-handoff-acceptance.test.ts`

Modify:

- `.gitignore` — add `.runtime/help-cases/`.
- `README.md` — document the experimental receiver-side Holding Basket boundary and NanaSpork/Garden as the preferred product embodiment.

Do not modify the existing global event/store/projection/runtime files listed in Global Constraints.

---

### Task 1: Strict Nourish Help Slip Admission and Dual Hashes

**Files:**
- Create: `src/help-case/envelope.ts`
- Test: `test/help-slip-envelope.test.ts`

**Interfaces:**
- Produces:
  - `FulfillmentRequirementV0`
  - `ImportedFulfillmentEnvelopeV0`
  - `AdmittedHelpSlipCarrier`
  - `RefusedHelpSlipCarrier`
  - `HelpSlipCarrierAdmission`
  - `serializeFulfillmentEnvelopeV0(payload): string`
  - `admitHelpSlipCarrier(rawText): HelpSlipCarrierAdmission`
- Consumes: Node `createHash` only.

- [ ] **Step 1: Write the failing admission and hashing tests**

Create `test/help-slip-envelope.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the focused test and witness RED**

Run:

```bash
npx vitest run test/help-slip-envelope.test.ts
```

Expected: FAIL because `../src/help-case/envelope` does not exist.

- [ ] **Step 3: Implement the strict envelope module**

Create `src/help-case/envelope.ts` with these exact public types:

```ts
import { createHash } from 'node:crypto';

export interface FulfillmentRequirementV0 {
  id: string;
  kind: string;
  description: string;
  quantity?: number;
  unit?: string;
  neededBy?: string;
}

export interface ImportedFulfillmentEnvelopeV0 {
  schema: 'fulfillment-envelope/v0';
  envelopeId: string;
  purpose: string;
  createdAt: string;
  requirements: FulfillmentRequirementV0[];
  source: {
    system: string;
    recipeId?: string;
  };
  disclosure: {
    includesOnlySelectedResiduals: true;
    omittedPrivateContext: true;
  };
  status: 'unmet';
}

export type HelpSlipRefusalReason =
  | 'INVALID_JSON'
  | 'INVALID_SHAPE'
  | 'UNSUPPORTED_SCHEMA'
  | 'MISSING_ENVELOPE_ID'
  | 'EMPTY_REQUIREMENTS'
  | 'INVALID_REQUIREMENT'
  | 'QUANTITY_WITHOUT_UNIT'
  | 'INVALID_QUANTITY'
  | 'INVALID_DISCLOSURE'
  | 'UNSUPPORTED_SOURCE_STATUS';

export interface AdmittedHelpSlipCarrier {
  disposition: 'admitted';
  carrierHash: string;
  payloadHash: string;
  canonicalPayload: string;
  payload: ImportedFulfillmentEnvelopeV0;
}

export interface RefusedHelpSlipCarrier {
  disposition: 'refused';
  carrierHash: string;
  reason: HelpSlipRefusalReason;
}

export type HelpSlipCarrierAdmission =
  | AdmittedHelpSlipCarrier
  | RefusedHelpSlipCarrier;
```

Use these exact helpers:

```ts
function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
```

Implement `serializeFulfillmentEnvelopeV0` by constructing a new object in this exact field order before `JSON.stringify`:

```ts
export function serializeFulfillmentEnvelopeV0(
  payload: ImportedFulfillmentEnvelopeV0,
): string {
  return JSON.stringify({
    schema: payload.schema,
    envelopeId: payload.envelopeId,
    purpose: payload.purpose,
    createdAt: payload.createdAt,
    requirements: payload.requirements.map((requirement) => ({
      id: requirement.id,
      kind: requirement.kind,
      description: requirement.description,
      ...(requirement.quantity === undefined ? {} : { quantity: requirement.quantity }),
      ...(requirement.unit === undefined ? {} : { unit: requirement.unit }),
      ...(requirement.neededBy === undefined ? {} : { neededBy: requirement.neededBy }),
    })),
    source: {
      system: payload.source.system,
      ...(payload.source.recipeId === undefined ? {} : { recipeId: payload.source.recipeId }),
    },
    disclosure: {
      includesOnlySelectedResiduals: payload.disclosure.includesOnlySelectedResiduals,
      omittedPrivateContext: payload.disclosure.omittedPrivateContext,
    },
    status: payload.status,
  });
}
```

Implement `admitHelpSlipCarrier` so it:

1. computes `carrierHash` before parsing;
2. parses JSON or returns `INVALID_JSON`;
3. requires an object with exactly the v0 top-level fields;
4. requires `schema === "fulfillment-envelope/v0"`;
5. requires non-empty `envelopeId`, `purpose`, `createdAt`, and `source.system`;
6. requires at least one requirement;
7. requires every requirement to have non-empty `id`, `kind`, and `description`;
8. requires `quantity`, when present, to be positive and finite;
9. requires `unit` whenever `quantity` is present;
10. requires both disclosure flags to be literal `true`;
11. requires `status === "unmet"`;
12. reconstructs a typed v0 payload from validated fields rather than casting the raw object;
13. computes `payloadHash = sha256(serializeFulfillmentEnvelopeV0(payload))`.

Reject unknown top-level fields and unknown requirement/source/disclosure fields in v0 so the canonical payload never silently drops foreign data.

- [ ] **Step 4: Run the focused test and witness GREEN**

Run:

```bash
npx vitest run test/help-slip-envelope.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Run TypeScript on the new seam**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/help-case/envelope.ts test/help-slip-envelope.test.ts
git commit -m "feat: admit immutable Nourish help slips"
```

---

### Task 2: Receive Occurrences, Duplicate Observation, and Held-Case Identity

**Files:**
- Create: `src/help-case/receive.ts`
- Test: `test/help-slip-receive.test.ts`

**Interfaces:**
- Consumes:
  - `admitHelpSlipCarrier(rawText)`
  - `ImportedFulfillmentEnvelopeV0`
- Produces:
  - `ReceivedHelpSlip`
  - `HeldHelpCase`
  - `ReceiveHelpSlipResult`
  - `receiveHelpSlip(rawText, metadata, priorReceives)`

- [ ] **Step 1: Write the failing duplicate-import tests**

Create `test/help-slip-receive.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the focused test and witness RED**

Run:

```bash
npx vitest run test/help-slip-receive.test.ts
```

Expected: FAIL because `receive.ts` does not exist.

- [ ] **Step 3: Implement receive occurrence and held-case identity**

Create `src/help-case/receive.ts`:

```ts
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
```

Use deterministic case identity:

```ts
function caseIdFor(payloadHash: string): string {
  return `help-case:${payloadHash}`;
}
```

Implement:

```ts
export function receiveHelpSlip(
  rawText: string,
  metadata: ReceiveMetadata,
  priorReceives: readonly ReceivedHelpSlip[],
): ReceiveHelpSlipResult
```

Rules:

- Call `admitHelpSlipCarrier(rawText)`.
- A refusal returns a receipt with `carrierHash`, `admission: "refused"`, and `refusalReason`; no case.
- For an admitted payload, find the earliest prior admitted receipt with the same `payloadHash`.
- If found, reuse its `caseId`, set `duplicateOfOccurrenceId` to that first occurrence, and set `caseCreated: false`.
- If not found, create `caseId = help-case:<payloadHash>`, create `HeldHelpCase`, and set `caseCreated: true`.
- Never use `envelopeId` alone as case identity because two different payloads may reuse the same foreign identifier.
- Never mutate `priorReceives`.

- [ ] **Step 4: Run the focused test and witness GREEN**

```bash
npx vitest run test/help-slip-receive.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run all tests and typecheck**

```bash
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/help-case/receive.ts test/help-slip-receive.test.ts
git commit -m "feat: hold duplicate help slip arrivals without duplicate demand"
```

---

### Task 3: Append-Only Help-Case Events and Honest Residual Projection

**Files:**
- Create: `src/help-case/events.ts`
- Create: `src/help-case/projection.ts`
- Test: `test/help-case-projection.test.ts`

**Interfaces:**
- Consumes:
  - `HeldHelpCase`
  - immutable admitted source payload
- Produces:
  - `HelpCaseEvent`
  - `validateHelpCaseEvent(event, context)`
  - `projectHelpCase(caseId, receives, events): HelpCaseProjection`

- [ ] **Step 1: Write the failing lifecycle and residual tests**

Create `test/help-case-projection.test.ts` with one reusable admitted receive and these assertions:

```ts
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
    }, context)).toThrow('RECIPIENT_AUTHORITY_BASIS_REQUIRED');
  });
});
```

- [ ] **Step 2: Run the focused test and witness RED**

```bash
npx vitest run test/help-case-projection.test.ts
```

Expected: FAIL because the event/projection modules do not exist.

- [ ] **Step 3: Define the dedicated help-case event vocabulary**

Create `src/help-case/events.ts`.

Use these exact event type strings:

```ts
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
```

Define:

```ts
export interface HelpCaseEventValidationContext {
  caseId: string;
  receives: readonly ReceivedHelpSlip[];
  priorEvents: readonly HelpCaseEvent[];
}

export function validateHelpCaseEvent(
  event: HelpCaseEvent,
  context: HelpCaseEventValidationContext,
): void
```

Validation rules:

- `event.caseId === context.caseId`;
- event ID non-empty and unique inside `priorEvents`;
- source requirement exists in the first admitted receive for the case;
- quantity, if supplied, is positive finite;
- a quantitative event must carry a non-empty unit; unit mismatch is admitted as witnessed history but has zero quantitative consequence and produces a projection warning;
- recipient-authority event types require the literal authority basis;
- `commitment.withdrawn` must reference a prior `commitment.recorded` event from the same case and requirement;
- a commitment may be withdrawn at most once;
- note events must carry a non-empty `note`.

Do not use this validator to infer identity, helper deservingness, request truth, or completion.

- [ ] **Step 4: Implement the pure projection**

Create `src/help-case/projection.ts`.

Public shape:

```ts
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
```

Implement:

```ts
export function projectHelpCase(
  caseId: string,
  receives: readonly ReceivedHelpSlip[],
  events: readonly HelpCaseEvent[],
): HelpCaseProjection
```

Rules:

1. Select the earliest admitted receive for `caseId` as immutable source.
2. Preserve every event in `events` in original append order.
3. Build a set of withdrawn commitment event IDs.
4. Sum offers, non-withdrawn commitments, attempts, and reported deliveries independently.
5. Sum only exact-unit `receipt.confirmed`, `requirement.resolved_elsewhere`, and `requirement.waived` into residual consequence.
6. For a quantity-bearing requirement:
   ```ts
   const resolved = confirmedReceived + resolvedElsewhere + waived;
   confirmedResidual = Math.max(requested - resolved, 0);
   excessResolved = Math.max(resolved - requested, 0);
   ```
7. Wrong-unit quantitative events append `UNIT_MISMATCH:<eventId>` and contribute zero.
8. For a requirement without a source quantity, do not invent arithmetic. Set `qualitativeResolved = true` only after one of the three recipient-authority resolution event classes occurs without quantity.
9. Do not assign helper-specific fulfillment credit in the projection.

- [ ] **Step 5: Run the focused tests and witness GREEN**

```bash
npx vitest run test/help-case-projection.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run the existing projection-isolation tests**

```bash
npx vitest run test/acceptance.test.ts test/capture-001.test.ts
```

Expected: PASS with no changes to global Band Runtime projection behavior.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/help-case/events.ts src/help-case/projection.ts test/help-case-projection.test.ts
git commit -m "feat: project honest help-case residuals"
```

---

### Task 4: Append-Only JSONL Persistence and Replay

**Files:**
- Create: `src/help-case/ledger.ts`
- Modify: `.gitignore`
- Test: `test/help-case-ledger.test.ts`

**Interfaces:**
- Consumes:
  - `ReceivedHelpSlip`
  - `HelpCaseEvent`
- Produces:
  - `HelpCaseLedger`
  - `appendReceive`
  - `appendEvent`
  - `loadReceives`
  - `loadEvents`

- [ ] **Step 1: Write the failing persistence tests**

Create `test/help-case-ledger.test.ts`:

```ts
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
    ledger.appendRawForTest('receives', '{bad\n');

    expect(() => ledger.loadReceives()).toThrow('MALFORMED_HELP_CASE_LEDGER');
  });
});
```

If exposing a test-only raw append method is undesirable, replace `appendRawForTest` in the test with Node `appendFileSync(join(root, 'receives.jsonl'), '{bad\n')`. Do not add test-only behavior to production code.

- [ ] **Step 2: Run the focused test and witness RED**

```bash
npx vitest run test/help-case-ledger.test.ts
```

Expected: FAIL because `ledger.ts` does not exist.

- [ ] **Step 3: Implement the append-only JSONL ledger**

Create `src/help-case/ledger.ts`:

```ts
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { HelpCaseEvent } from './events';
import type { ReceivedHelpSlip } from './receive';

export class HelpCaseLedger {
  private readonly receivesPath: string;
  private readonly eventsPath: string;

  constructor(rootDir: string) {
    mkdirSync(rootDir, { recursive: true });
    this.receivesPath = join(rootDir, 'receives.jsonl');
    this.eventsPath = join(rootDir, 'events.jsonl');
  }

  appendReceive(receipt: ReceivedHelpSlip): void {
    appendFileSync(this.receivesPath, `${JSON.stringify(receipt)}\n`, 'utf8');
  }

  appendEvent(event: HelpCaseEvent): void {
    appendFileSync(this.eventsPath, `${JSON.stringify(event)}\n`, 'utf8');
  }

  loadReceives(): ReceivedHelpSlip[] {
    return this.readJsonLines<ReceivedHelpSlip>(this.receivesPath);
  }

  loadEvents(): HelpCaseEvent[] {
    return this.readJsonLines<HelpCaseEvent>(this.eventsPath);
  }

  private readJsonLines<T>(path: string): T[] {
    if (!existsSync(path)) return [];
    const text = readFileSync(path, 'utf8');
    if (text.length === 0) return [];

    try {
      return text
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as T);
    } catch {
      throw new Error('MALFORMED_HELP_CASE_LEDGER');
    }
  }
}
```

The ledger is intentionally simple for this proof. It appends whole JSON records and never rewrites prior lines.

- [ ] **Step 4: Ignore local runtime request data**

Append to `.gitignore`:

```gitignore
.runtime/help-cases/
```

- [ ] **Step 5: Run the focused test and witness GREEN**

```bash
npx vitest run test/help-case-ledger.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run full tests and typecheck**

```bash
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/help-case/ledger.ts test/help-case-ledger.test.ts .gitignore
git commit -m "feat: persist help-case history as append-only local ledger"
```

---

### Task 5: HoldingBasketRuntime Orchestration and Restart-Safe Case API

**Files:**
- Create: `src/help-case/runtime.ts`
- Test: `test/help-slip-handoff-acceptance.test.ts`

**Interfaces:**
- Consumes:
  - `HelpCaseLedger`
  - `receiveHelpSlip`
  - `validateHelpCaseEvent`
  - `projectHelpCase`
- Produces:
  - `HoldingBasketRuntime`
  - `receive(rawText, metadata)`
  - `record(event)`
  - `getProjection(caseId)`
  - `getReceives(caseId?)`
  - `getEvents(caseId?)`

- [ ] **Step 1: Write the failing end-to-end acceptance specimen**

Create `test/help-slip-handoff-acceptance.test.ts`:

```ts
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

    // Process restart: new object, same append-only ledger.
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
```

- [ ] **Step 2: Run the acceptance test and witness RED**

```bash
npx vitest run test/help-slip-handoff-acceptance.test.ts
```

Expected: FAIL because `HoldingBasketRuntime` does not exist.

- [ ] **Step 3: Implement the orchestration wrapper**

Create `src/help-case/runtime.ts`:

```ts
import type { HelpCaseEvent } from './events';
import { validateHelpCaseEvent } from './events';
import { HelpCaseLedger } from './ledger';
import { projectHelpCase, type HelpCaseProjection } from './projection';
import {
  receiveHelpSlip,
  type ReceiveHelpSlipResult,
  type ReceiveMetadata,
  type ReceivedHelpSlip,
} from './receive';

export class HoldingBasketRuntime {
  private readonly ledger: HelpCaseLedger;

  constructor(rootDir: string) {
    this.ledger = new HelpCaseLedger(rootDir);
  }

  receive(rawText: string, metadata: ReceiveMetadata): ReceiveHelpSlipResult {
    const prior = this.ledger.loadReceives();
    const result = receiveHelpSlip(rawText, metadata, prior);
    this.ledger.appendReceive(result.receipt);
    return result;
  }

  record(event: HelpCaseEvent): void {
    const receives = this.getReceives(event.caseId);
    const priorEvents = this.getEvents(event.caseId);
    validateHelpCaseEvent(event, {
      caseId: event.caseId,
      receives,
      priorEvents,
    });
    this.ledger.appendEvent(event);
  }

  getProjection(caseId: string): HelpCaseProjection {
    return projectHelpCase(
      caseId,
      this.getReceives(caseId),
      this.getEvents(caseId),
    );
  }

  getReceives(caseId?: string): ReceivedHelpSlip[] {
    const all = this.ledger.loadReceives();
    return caseId === undefined
      ? all
      : all.filter((receipt) => receipt.caseId === caseId);
  }

  getEvents(caseId?: string): HelpCaseEvent[] {
    const all = this.ledger.loadEvents();
    return caseId === undefined
      ? all
      : all.filter((event) => event.caseId === caseId);
  }
}
```

Do not add transport, HTTP, MCP, Supabase, or browser dependencies in this task.

- [ ] **Step 4: Run the end-to-end specimen and witness GREEN**

```bash
npx vitest run test/help-slip-handoff-acceptance.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run the entire repository verification**

```bash
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit Task 5**

```bash
git add src/help-case/runtime.ts test/help-slip-handoff-acceptance.test.ts
git commit -m "feat: prove restart-safe Holding Basket handoff"
```

---

### Task 6: Documentation, Isolation Receipt, and Final Verification

**Files:**
- Modify: `README.md`
- Test: existing full test suite

**Interfaces:**
- Consumes: all Task 1–5 public interfaces.
- Produces: durable repository documentation and final proof receipt; no new runtime API.

- [ ] **Step 1: Add the Holding Basket status section to README**

Add a section after the current runtime status/contract material:

```markdown
## HELP-SLIP-HOLDING-BASKET-001

Band Runtime contains an experimental receiver-side kernel for one bounded
community-help crossing.

A Nourish `fulfillment-envelope/v0` may be received as immutable foreign
evidence, admitted into one local held case, surrounded by append-only
fulfillment-history events, and replayed into an honest residual.

The kernel keeps these distinctions explicit:

```
request != history
offer != commitment
commitment != attempt
delivery reported != receipt confirmed
waived != fulfilled
resolved elsewhere != helper fulfilled
```

Duplicate payload imports remain separate receive occurrences but do not create
duplicate demand by default.

This kernel does not provide a browser community desk. NanaSpork/Garden is the
preferred existing product embodiment because it already owns the human-facing
Garden/Campfire need lifecycle. Any future adapter must explicitly map lifecycle
semantics rather than collapsing states by similar names.

The local specimen stores experimental runtime data under
`.runtime/help-cases/`, which is intentionally gitignored.
```

- [ ] **Step 2: Prove global Band Runtime semantics stayed isolated**

Run:

```bash
git diff docs/receive-hold-pour-node-boundary...HEAD -- src/events.ts src/store.ts src/projection.ts src/runtime.ts src/stigmergic-adapter.ts
```

Expected: no diff in those files.

If there is a diff, stop and review it. The approved design does not require changes there.

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Run TypeScript verification and preserve the pre-existing MCP baseline**

First run:

```bash
npm run typecheck
```

Current repository baseline may fail in `src/mcp/server.ts` with the known MCP SDK/Zod type-instantiation drift. If the only failures are the existing MCP-server errors, do not modify that unrelated subsystem in this PR.

Then run the feature-scoped gate:

```bash
npx tsc --noEmit --strict --target ES2022 --module commonjs \
  --moduleResolution node --esModuleInterop --skipLibCheck \
  src/help-case/*.ts
```

Expected: PASS for the help-case subsystem. Record the full-repository MCP failure separately in the PR receipt rather than claiming a full typecheck pass.

- [ ] **Step 5: Run diff hygiene**

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 6: Inspect the final changed-file set**

Run:

```bash
git diff --name-only docs/receive-hold-pour-node-boundary...HEAD
```

Expected implementation files:

```text
.gitignore
README.md
docs/superpowers/plans/2026-09-18-help-slip-holding-basket-001.md
docs/superpowers/specs/2026-09-18-help-slip-holding-basket-001-design.md
src/help-case/envelope.ts
src/help-case/events.ts
src/help-case/ledger.ts
src/help-case/projection.ts
src/help-case/receive.ts
src/help-case/runtime.ts
test/help-case-ledger.test.ts
test/help-case-projection.test.ts
test/help-slip-envelope.test.ts
test/help-slip-handoff-acceptance.test.ts
test/help-slip-receive.test.ts
```

The spec/plan files are already on the design branch and may not appear in the implementation-only diff depending on execution branch strategy. No global Band Runtime event/projection files should appear.

- [ ] **Step 7: Commit documentation and final receipt**

```bash
git add README.md
git commit -m "docs: record Holding Basket receiver boundary"
```

- [ ] **Step 8: Record the verification receipt in the implementation PR**

The PR body must state the exact commands actually run and their real results:

```text
npm test
npm run typecheck  # record existing MCP baseline if still present
npx tsc --noEmit --strict --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck src/help-case/*.ts
git diff --check
```

Do not claim browser, Android, Supabase, Campfire, NanaSpork, network, or real-world human handoff verification from this Band Runtime specimen.

---

## Spec Coverage Self-Review

- Immutable imported request: Task 1 + Task 2.
- Exact carrier hash and deterministic payload hash: Task 1.
- Strict v0 schema/version admission: Task 1.
- Receive occurrence distinct from admission: Task 2.
- Duplicate receive without duplicate demand: Task 2.
- Held-case identity without ownership claim: Task 2.
- Dedicated non-global help-case vocabulary: Task 3.
- Offer/commitment/withdrawal/attempt/report/confirm/outside-resolution/waiver distinctions: Task 3.
- Whole-commitment withdrawal by explicit reference: Task 3.
- Recipient authority basis without identity authentication claim: Task 3.
- Exact-unit-only quantitative consequence: Task 3.
- Over-confirmation/excess visibility: Task 3.
- Qualitative no-invented-arithmetic behavior: Task 3.
- Append-only local persistence: Task 4.
- Runtime data excluded from Git: Task 4.
- Restart/replay proof: Task 5.
- Required acceptance specimen: Task 5.
- NanaSpork/Garden product-boundary documentation: Task 6.
- No global Band Runtime ontology/projection contamination: Task 6.
- No networking/Campfire/TranchNode/ALEX/Dogram/BODY runtime dependency: enforced in Global Constraints and final diff inspection.

No placeholders remain. Public type and function names are consistent across tasks.


CI note: the PR workflow runs the scoped help-case TypeScript gate because the repository-wide typecheck currently has a pre-existing MCP SDK/Zod compatibility failure outside this feature boundary.
