# CAPTURE-001 Band Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Band Runtime with four literal, append-only human-side witness event types whose semantic effect is none and whose history survives validation, serialization, replay, projection, and stigmergic adaptation unchanged.

**Architecture:** Add the four CAPTURE-001 event interfaces directly to the closed `BandEvent` union. Keep them semantically inert in both the general projection and stigmergic adapter, but fully durable in `EventStore`. Validate their payload shape during deserialization so malformed witness receipts cannot enter replay history. Do not add Storyship, Vault, UI, provider network calls, or graph persistence to Band Runtime.

**Tech Stack:** TypeScript 5.9, Vitest 2, Node 20 types.

**Spec:** `the-static-collective/groove-rooms@docs/capture-001-design:docs/superpowers/specs/2026-08-25-capture-001-design.md`

## Global Constraints

- Event names are exactly `capture.recorded`, `handoff.recorded`, `return.recorded`, and `decision.recorded`.
- These are distinct occurrences, never one generic witness event.
- Capture is not handoff. Handoff is not return. Return is not decision.
- An unknown edge remains unknown until evidence warrants relation.
- All four events have no automatic creative/admission/recognition/projection/stigmergic effect.
- `return.recorded` means provider-side occurrence observed from the human encounter field; it is not Vault admission.
- Delivery status is exactly `DECLARED | WITNESSED | FAILED | UNKNOWN`.
- Return relation status is exactly `WITNESSED | CLAIMED | PARTIAL | UNRESOLVED | REFUTED`.
- Burst decision value is exactly `KEEP | REFUSE | WRONG | INTERESTING`; `PARENT` is excluded.
- A `REFUTED` relation must point at the earlier return receipt it refutes; existing history is never rewritten.
- Failed handoffs and unresolved returns are valid durable events.
- Storyship reconciliation and Vault admission are outside Band Runtime.

---

## File Structure

- `src/events.ts` — canonical CAPTURE-001 event and payload types.
- `src/store.ts` — closed event-type admission plus witness payload validation on replay/deserialization.
- `src/projection.ts` — explicitly no-op the four witness events in semantic projection.
- `src/stigmergic-adapter.ts` — explicitly no-op the four witness events in field adaptation.
- `test/capture-001.test.ts` — focused event-contract, replay, unknown-edge, and decision-vocabulary tests.
- `test/stigmergic-adapter.test.ts` — prove all four witness events emit zero traces.
- `test/hardening.test.ts` — replay/deserialization corruption cases for witness receipts.

---

### Task 1: Define the four literal runtime event contracts

**Files:**
- Modify: `src/events.ts`
- Create: `test/capture-001.test.ts`

**Interfaces:**
- Produces:
  - `CaptureRecordedEvent`
  - `HandoffRecordedEvent`
  - `ReturnRecordedEvent`
  - `DecisionRecordedEvent`
  - `DeliveryStatus`
  - `ReturnRelationStatus`
  - `DecisionValue`
  - `WitnessMaterial`

- [ ] **Step 1: Write the failing type/behavior test**

Create `test/capture-001.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type {
  BandEvent,
  CaptureRecordedEvent,
  DecisionValue,
  HandoffRecordedEvent,
  ReturnRecordedEvent,
} from '../src/events';

describe('CAPTURE-001 event contract', () => {
  const sessionId = 'capture-001';

  it('exposes four literal event types as BandEvent values', () => {
    const events: BandEvent[] = [
      {
        id: 'C1', type: 'capture.recorded', timestamp: 1, sessionId,
        payload: {
          actorId: 'lu',
          material: { kind: 'text', text: 'line one', sha256: 'aaa' },
          intent: 'keep it spare',
          observedAtUtc: '2026-08-25T14:00:00.000Z',
          localObservedAt: '2026-08-25T09:00:00-05:00',
          parentCaptureId: null,
        },
      } satisfies CaptureRecordedEvent,
      {
        id: 'H1', type: 'handoff.recorded', timestamp: 2, sessionId,
        payload: {
          actorId: 'lu',
          sourceCaptureIds: ['C1'],
          destination: 'suno',
          outbound: { completeness: 'EXACT', text: 'line one', sha256: 'aaa' },
          delivery: { status: 'DECLARED', evidence: [] },
          occurredAtUtc: '2026-08-25T14:01:00.000Z',
        },
      } satisfies HandoffRecordedEvent,
      {
        id: 'R1', type: 'return.recorded', timestamp: 3, sessionId,
        payload: {
          actorId: 'lu', provider: 'suno', providerArtifactId: 'abc',
          observedAtUtc: '2026-08-25T14:02:00.000Z',
          relation: { handoffId: 'H1', status: 'PARTIAL', evidence: ['provider id visible'] },
        },
      } satisfies ReturnRecordedEvent,
      {
        id: 'D1', type: 'decision.recorded', timestamp: 4, sessionId,
        payload: {
          actorId: 'lu', returnId: 'R1', decision: 'WRONG',
          occurredAtUtc: '2026-08-25T14:03:00.000Z',
        },
      },
    ];
    expect(events.map((event) => event.type)).toEqual([
      'capture.recorded', 'handoff.recorded', 'return.recorded', 'decision.recorded',
    ]);
  });

  it('keeps PARENT out of decision vocabulary', () => {
    const decisions: DecisionValue[] = ['KEEP', 'REFUSE', 'WRONG', 'INTERESTING'];
    expect(decisions).not.toContain('PARENT');
  });
});
```

- [ ] **Step 2: Run focused test and verify RED**

```bash
npm test -- test/capture-001.test.ts
```

Expected: FAIL/type failure because the CAPTURE-001 types do not exist.

- [ ] **Step 3: Add exact payload types to `src/events.ts`**

Add to `EventType`:

```ts
| 'capture.recorded'
| 'handoff.recorded'
| 'return.recorded'
| 'decision.recorded'
```

Define:

```ts
export type CaptureMaterialKind = 'text' | 'voice' | 'file' | 'screenshot' | 'url';
export type PayloadCompleteness = 'EXACT' | 'PARTIAL' | 'UNKNOWN';
export type DeliveryStatus = 'DECLARED' | 'WITNESSED' | 'FAILED' | 'UNKNOWN';
export type ReturnRelationStatus = 'WITNESSED' | 'CLAIMED' | 'PARTIAL' | 'UNRESOLVED' | 'REFUTED';
export type DecisionValue = 'KEEP' | 'REFUSE' | 'WRONG' | 'INTERESTING';

export type WitnessMaterial =
  | { kind: 'text'; text: string; sha256: string }
  | { kind: 'url'; url: string; sha256?: string }
  | { kind: 'voice' | 'file' | 'screenshot'; artifactRef: string; sha256: string; mimeType?: string; filename?: string };
```

Define event payloads so intent belongs only to capture, frozen outbound material belongs only to handoff, provider observation belongs only to return, and judgment belongs only to decision.

Use a union for return relation:

```ts
export type ReturnRelation =
  | { handoffId: string; status: 'WITNESSED' | 'CLAIMED' | 'PARTIAL'; evidence: string[]; reason?: string }
  | { handoffId: null; status: 'UNRESOLVED'; evidence: string[]; reason?: string }
  | { handoffId: string; status: 'REFUTED'; evidence: string[]; refutesReturnId: string; reason: string };
```

Add all four interfaces to `BandEvent`.

- [ ] **Step 4: Run focused test and typecheck**

```bash
npm test -- test/capture-001.test.ts
npm run typecheck
```

Expected: PASS after later exhaustive switches are temporarily updated if TypeScript requires it.

- [ ] **Step 5: Commit**

```bash
git add src/events.ts test/capture-001.test.ts
git commit -m "feat: define CAPTURE-001 runtime events"
```

---

### Task 2: Admit and replay witness events without semantic promotion

**Files:**
- Modify: `src/store.ts`
- Modify: `src/projection.ts`
- Modify: `test/capture-001.test.ts`

**Interfaces:**
- Consumes: Task 1 `BandEvent` union.
- Produces durable serialization/deserialization and projection no-op behavior.

- [ ] **Step 1: Add failing replay and projection tests**

Extend `test/capture-001.test.ts`:

```ts
import { EventStore } from '../src/store';
import { reduceProjection } from '../src/projection';

it('round-trips C → H → R → D without becoming clip or recognition state', () => {
  const store = new EventStore();
  store.append({ id: 'S1', type: 'session.opened', timestamp: 0, sessionId, payload: { sessionId } });
  for (const event of witnessSequence) store.append(event);

  const replayed = EventStore.deserialize(store.serialize()).getAll();
  expect(replayed.map((event) => event.type).slice(1)).toEqual([
    'capture.recorded', 'handoff.recorded', 'return.recorded', 'decision.recorded',
  ]);

  const projection = reduceProjection(replayed);
  expect(projection.clips.size).toBe(0);
  expect(projection.recognitions).toEqual([]);
});
```

Add a test that a capture may exist with no handoff and a return may be `UNRESOLVED` with `handoffId: null`.

- [ ] **Step 2: Run focused test and verify RED**

```bash
npm test -- test/capture-001.test.ts
```

Expected: FAIL with `UNKNOWN_EVENT_TYPE` during replay and/or exhaustive projection handling.

- [ ] **Step 3: Extend `VALID_EVENT_TYPES` in `src/store.ts`**

Add the exact four literal strings. Do not special-case them as clip lifecycle events.

- [ ] **Step 4: Make the four events explicit no-ops in `reduceProjection`**

Add:

```ts
case 'capture.recorded':
case 'handoff.recorded':
case 'return.recorded':
case 'decision.recorded':
  break;
```

Do not add witness material to `SemanticInput` or `ProjectionState` in CAPTURE-001.

- [ ] **Step 5: Run focused test and typecheck**

```bash
npm test -- test/capture-001.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store.ts src/projection.ts test/capture-001.test.ts
git commit -m "feat: replay CAPTURE-001 events without projection"
```

---

### Task 3: Validate witness receipt shape during deserialization

**Files:**
- Modify: `src/store.ts`
- Modify: `test/hardening.test.ts`
- Modify: `test/capture-001.test.ts`

**Interfaces:**
- Produces `INVALID_WITNESS_RECEIPT` for malformed replay payloads.

- [ ] **Step 1: Add failing malformed-history tests**

Add to `test/hardening.test.ts`:

```ts
it('rejects malformed CAPTURE-001 receipts during replay', () => {
  const base = { id: '1', type: 'session.opened', timestamp: 0, sessionId: 's', payload: { sessionId: 's' } };

  expect(() => EventStore.deserialize(JSON.stringify([
    base,
    { id: '2', type: 'decision.recorded', timestamp: 1, sessionId: 's', payload: { actorId: 'lu', returnId: 'R1', decision: 'PARENT', occurredAtUtc: 'x' } },
  ]))).toThrow('INVALID_WITNESS_RECEIPT');

  expect(() => EventStore.deserialize(JSON.stringify([
    base,
    { id: '2', type: 'return.recorded', timestamp: 1, sessionId: 's', payload: { actorId: 'lu', provider: 'suno', observedAtUtc: 'x', relation: { handoffId: null, status: 'WITNESSED', evidence: [] } } },
  ]))).toThrow('INVALID_WITNESS_RECEIPT');

  expect(() => EventStore.deserialize(JSON.stringify([
    base,
    { id: '2', type: 'return.recorded', timestamp: 1, sessionId: 's', payload: { actorId: 'lu', provider: 'suno', observedAtUtc: 'x', relation: { handoffId: 'H1', status: 'REFUTED', evidence: [], reason: 'wrong edge' } } },
  ]))).toThrow('INVALID_WITNESS_RECEIPT');
});
```

- [ ] **Step 2: Run focused hardening test and verify RED**

```bash
npm test -- test/hardening.test.ts
```

Expected: FAIL because malformed witness payloads are not yet validated.

- [ ] **Step 3: Add small explicit runtime validators in `src/store.ts`**

Keep the validator local and dependency-free. Implement type guards for:

```ts
isNonEmptyString
isStringArray
isDeliveryStatus
isDecisionValue
isReturnRelation
isWitnessPayloadFor(event)
```

Validation rules:

- capture: `actorId`, `material`, `observedAtUtc`; intent may be null/string; parentCaptureId may be null/string.
- handoff: actor, non-empty `sourceCaptureIds` when known (empty allowed for reconstructed/unknown source), destination, outbound completeness, delivery status, occurredAtUtc.
- return: actor, provider, observedAtUtc, structurally valid relation; `UNRESOLVED` requires `handoffId: null`; `WITNESSED|CLAIMED|PARTIAL` require string handoff id; `REFUTED` requires string handoff id + `refutesReturnId` + non-empty reason.
- decision: actor, returnId, occurredAtUtc, exact four-value decision union.

Inside `deserialize`, after event-type validation:

```ts
if (isWitnessEventType(event.type) && !isWitnessPayloadFor(event)) {
  throw new Error('INVALID_WITNESS_RECEIPT');
}
```

Do not require referenced handoff/return/capture IDs to already exist in the same local store; accountable partial/offline evidence is permitted by design.

- [ ] **Step 4: Run hardening, capture, and typecheck**

```bash
npm test -- test/hardening.test.ts test/capture-001.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store.ts test/hardening.test.ts test/capture-001.test.ts
git commit -m "feat: validate CAPTURE-001 replay receipts"
```

---

### Task 4: Prove zero stigmergic effect

**Files:**
- Modify: `src/stigmergic-adapter.ts`
- Modify: `test/stigmergic-adapter.test.ts`

**Interfaces:**
- Produces explicit zero-trace behavior for all four witness types.

- [ ] **Step 1: Add a failing zero-trace test**

In `test/stigmergic-adapter.test.ts`, create a committed sequence containing `session.opened` plus C/H/R/D and assert:

```ts
const adapted = adaptCommittedEventsToStigmergicField(events);
expect(adapted.sourceEvents).toHaveLength(5);
expect(adapted.traces).toEqual([]);
```

Also include a control sequence with `clip.proposed` and assert it still emits `attention`, proving CAPTURE-001 did not disable existing field behavior.

- [ ] **Step 2: Run focused test and verify RED or exhaustive-switch failure**

```bash
npm test -- test/stigmergic-adapter.test.ts
```

- [ ] **Step 3: Add explicit no-op cases**

In the adapter switch add:

```ts
case 'capture.recorded':
case 'handoff.recorded':
case 'return.recorded':
case 'decision.recorded':
  break;
```

Do not create a witness-specific field channel.

- [ ] **Step 4: Run focused test and typecheck**

```bash
npm test -- test/stigmergic-adapter.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stigmergic-adapter.ts test/stigmergic-adapter.test.ts
git commit -m "test: prove CAPTURE-001 has zero field effect"
```

---

### Task 5: Prove append-only ancestry and accountable gaps

**Files:**
- Modify: `test/capture-001.test.ts`
- Modify only if validation reveals a defect: `src/events.ts`, `src/store.ts`

**Interfaces:**
- Produces the canonical runtime specimen for the burst causal spine.

- [ ] **Step 1: Add the full specimen test**

Build:

```text
S1 session.opened
C1 capture.recorded text v1
C2 capture.recorded text v2 parentCaptureId=C1
H1 handoff.recorded source=C2 delivery=DECLARED
Hfail handoff.recorded source=C2 delivery=FAILED
R1 return.recorded providerArtifactId=abc relation=PARTIAL(H1)
R2 return.recorded providerArtifactId=def relation=UNRESOLVED(null)
D1 decision.recorded return=R1 decision=WRONG
```

Assert:

- all IDs and payloads survive serialize → deserialize unchanged except assigned sequence.
- C1 and C2 both remain present.
- H1 contains its own frozen outbound text/hash.
- Hfail remains present.
- R2 remains valid without any handoff edge.
- D1 does not alter R1.
- projection contains no clips/recognitions from these events.

Then append a later refutation occurrence for the same provider return using `relation.status = 'REFUTED'` and `refutesReturnId = 'R1'`; assert R1 itself remains byte-for-byte unchanged in the earlier serialized cut.

- [ ] **Step 2: Run the complete Band Runtime verification suite**

```bash
npm test
npm run typecheck
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add test/capture-001.test.ts src/events.ts src/store.ts
git commit -m "test: seal CAPTURE-001 causal witness specimen"
```

---

## Completion Gate

Band Runtime CAPTURE-001 is ready for Groove Rooms consumption only when:

```bash
npm test
npm run typecheck
```

both pass and the tests prove:

- all four literal events are accepted and replay deterministically.
- none becomes a clip, recognition, admission, or semantic input.
- none emits a stigmergic trace.
- malformed witness receipts fail replay with `INVALID_WITNESS_RECEIPT`.
- failed handoffs remain durable.
- unresolved returns remain valid.
- `PARENT` cannot enter `DecisionValue`.
- a later refutation appends evidence and does not mutate the earlier return.
- no local-reference validation falsely requires Vault, Storyship, or provider systems to be online.
