# Band Runtime Stigmergic Adapter + Specimen v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt committed Band Runtime events into the frozen TranchNode Stigmergic Field v0.1 trace contract and prove coordinatorless redistribution across two candidate directions without reimplementing TranchNode field math.

**Architecture:** Band Runtime owns event interpretation only. It copies the finalized TranchNode fixture byte-for-byte, proves its adapter emits the fixture's generic source envelopes and trace bodies, and consumes the fixture's precomputed per-cut field projections as the behavioral oracle. Decay, aggregation, canonical ordering, trace hashes, and field fingerprints remain TranchNode-owned.

**Tech Stack:** TypeScript 5.9, Vitest 2.1, existing `EventStore`, existing Band Runtime event/projection law, pinned JSON conformance fixture.

## Global Constraints

- Adapter identity is exactly `band-runtime/stigmergic-adapter@0.1`.
- Policy is exactly `band-runtime-field-policy/v0.1`.
- Field schema is exactly `stigmergic-field/v0.1`.
- No TranchNode npm dependency in v0.1.
- No copied decay formula, aggregate math, JCS addressing, trace hashing, or field fingerprint implementation.
- Only committed events with numeric store-assigned sequence enter the adapter.
- Existing Band Runtime sequence is zero-based; generic field sequence is exactly `runtimeSequence + 1`.
- Timestamps never affect adaptation.
- No future event, hidden UI state, model confidence, scheduler, ranking service, or global chooser is read.
- `boundary.refusal_recorded` and `protected_silence.declared` emit no stigmergic trace in v0.1.
- Existing refusal-only semantic isolation remains intact.
- No new assignment, scheduler, quorum, or generic field-signal event type.
- The local choice rule exists only in the specimen test and has no write authority.
- All existing tests remain green.

---

## File Structure

- Create `src/stigmergic-adapter.ts` — frozen boundary types, adapter identity, committed-event validation, source-envelope conversion, deterministic six-channel event interpretation.
- Create `test/stigmergic-adapter.test.ts` — mapping, time-independence, protected-silence/refusal boundary, and canonical fixture parity.
- Create `test/stigmergic-specimen.test.ts` — coordinatorless redistribution, anti-cheat, return residue, replay proof.
- Create `fixtures/stigmergic-field-v0.1.json` — exact raw-byte copy of finalized TranchNode fixture.
- Leave `src/events.ts` and `src/projection.ts` unchanged.

## Frozen Adapter Interface

```ts
export const BAND_STIGMERGIC_ADAPTER = {
  id: "band-runtime/stigmergic-adapter",
  version: "0.1",
} as const;

export const BAND_STIGMERGIC_POLICY_VERSION = "band-runtime-field-policy/v0.1" as const;

export type FieldChannel =
  | "attention"
  | "receptivity"
  | "saturation"
  | "inhibition"
  | "tension"
  | "return";

export interface FieldSourceEvent {
  eventId: string;
  scopeId: string;
  sequence: number;
}

export interface FieldTrace {
  sourceEventId: string;
  sourceSequence: number;
  scopeId: string;
  subjectRef: string;
  channel: FieldChannel;
  magnitude: number;
  decayWindowEvents: number;
}

export interface BandStigmergicAdaptation {
  schemaVersion: "stigmergic-field/v0.1";
  scopeId: string;
  policyVersion: typeof BAND_STIGMERGIC_POLICY_VERSION;
  adapter: typeof BAND_STIGMERGIC_ADAPTER;
  sourceEvents: FieldSourceEvent[];
  traces: FieldTrace[];
}

export function adaptCommittedEventsToStigmergicField(
  events: readonly BandEvent[],
): BandStigmergicAdaptation;
```

---

### Task 1: Implement committed-event adaptation and all six channel relations

**Files:**
- Create: `src/stigmergic-adapter.ts`
- Create: `test/stigmergic-adapter.test.ts`

**Interfaces:**
- Consumes: committed `BandEvent[]` from `EventStore.getAll()`.
- Produces: one-based generic source envelopes and deterministic v0.1 trace bodies.

**Frozen event mapping:**

```text
clip.proposed                         -> attention 500 / window 6
recognition.recorded outcome=rings   -> receptivity 400 / window 5
third-or-later rings on same target  -> saturation 600 / window 4
clip.rejected                         -> inhibition 700 / window 5
recognition.recorded outcome=no      -> tension 350 / window 5
repeat recognition by same participant + target -> return 300 / window 6
```

`nearby`, `projection`, `protected_silence.declared`, and `boundary.refusal_recorded` emit no v0.1 trace. Return records revisitation regardless of recognition outcome.

- [ ] **Step 1: Write failing sequence/boundary tests**

```ts
import { describe, expect, it } from "vitest";
import { EventStore } from "../src/store";
import {
  BAND_STIGMERGIC_ADAPTER,
  adaptCommittedEventsToStigmergicField,
} from "../src/stigmergic-adapter";

const sessionId = "session-linked-vertical";

function sessionOpened() {
  return {
    id: "event-1-session-opened",
    type: "session.opened" as const,
    timestamp: 1,
    sessionId,
    payload: { sessionId },
  };
}

describe("stigmergic adapter", () => {
  it("maps committed zero-based sequence to one-based field sequence", () => {
    const store = new EventStore();
    store.append(sessionOpened());
    store.append({
      id: "event-2-participant-a",
      type: "participant.joined",
      timestamp: 2,
      sessionId,
      payload: { participantId: "a", role: "guitar" },
    });
    const adapted = adaptCommittedEventsToStigmergicField(store.getAll());
    expect(adapted.adapter).toEqual(BAND_STIGMERGIC_ADAPTER);
    expect(adapted.sourceEvents).toEqual([
      { eventId: "event-1-session-opened", scopeId: sessionId, sequence: 1 },
      { eventId: "event-2-participant-a", scopeId: sessionId, sequence: 2 },
    ]);
  });

  it("rejects an uncommitted event", () => {
    expect(() => adaptCommittedEventsToStigmergicField([sessionOpened()])).toThrow("UNCOMMITTED_EVENT");
  });
});
```

- [ ] **Step 2: Verify the focused test fails because the module is absent**

```bash
npx vitest run test/stigmergic-adapter.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement boundary types and committed-sequence validation**

In `src/stigmergic-adapter.ts`, define the frozen interface above plus:

```ts
function runtimeSequence(event: BandEvent): number {
  if (!Number.isSafeInteger(event.sequence) || (event.sequence as number) < 0) {
    throw new Error("UNCOMMITTED_EVENT");
  }
  return event.sequence as number;
}

function fieldSequence(event: BandEvent): number {
  return runtimeSequence(event) + 1;
}
```

Reject an empty event list with `EMPTY_EVENT_SEQUENCE`. Require every event's `sessionId` to equal the first event's session id; throw `CROSS_SESSION_CONTAMINATION` otherwise.

- [ ] **Step 4: Add failing tests for the complete mapping**

Build committed mini-sequences that assert exact attention, receptivity, third-rings saturation, clip-rejection inhibition, `no` tension, and repeat-recognition return bodies. Use the exact magnitudes/windows from the mapping table.

Include this protected-boundary test:

```ts
it("protected silence and refusal-only events emit no field trace", () => {
  const store = new EventStore();
  store.append(sessionOpened());
  store.append({
    id: "silence-1",
    type: "protected_silence.declared",
    timestamp: 2,
    sessionId,
    payload: {
      silenceId: "s1",
      participantId: "a",
      artifactRef: "artifact-1",
      contentHash: "same",
      causalCutId: "cut-1",
    },
  });
  store.append({
    id: "refusal-1",
    type: "boundary.refusal_recorded",
    timestamp: 3,
    sessionId,
    payload: {
      attemptId: "attempt-1",
      actorId: "b",
      actorLocalSequence: 1,
      boundary: "protected_silence",
      reason: "TARGET_PROTECTED_SILENCE",
      causalCutId: "cut-1",
      policyRef: "policy",
      policyVersion: "1",
      policyInputHash: "hash",
      evaluatorVersion: "1",
      attemptedEffect: "artifact.write",
      targetRefs: ["artifact-1"],
      attemptedArtifact: { artifactRef: "artifact-2", payloadHash: "payload" },
      protectedArtifacts: [{ artifactRef: "artifact-1", contentHashBefore: "same", contentHashAfter: "same" }],
      semanticEffect: "none",
      projectionClassification: "refusal_only",
      disclosureAudience: ["b"],
      payloadVisibility: "hash_only",
    },
  });
  expect(adaptCommittedEventsToStigmergicField(store.getAll()).traces).toEqual([]);
});
```

- [ ] **Step 5: Implement relation counters in one committed-order scan**

Use:

```ts
const ringsByTarget = new Map<string, number>();
const recognitionPairs = new Set<string>();
```

For `recognition.recorded`, compute `pair = participantId + "\u0000" + targetId` before inserting it. Emit return when the pair already existed. For `rings`, increment target count, emit receptivity, then emit saturation when the new count is `>= 3`. For `no`, emit tension. For `clip.rejected`, emit inhibition. Never remove prior traces.

- [ ] **Step 6: Add timestamp-independence test**

Create one committed sequence, clone every event with wildly shifted timestamps while preserving ids/session/sequence/payload, and assert `adaptCommittedEventsToStigmergicField()` returns deep-equal output.

- [ ] **Step 7: Run focused tests, refusal tests, and typecheck**

```bash
npx vitest run test/stigmergic-adapter.test.ts test/admission.test.ts test/hardening.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/stigmergic-adapter.ts test/stigmergic-adapter.test.ts
git commit -m "feat: adapt runtime events to stigmergic traces"
```

---

### Task 2: Pin the TranchNode fixture and prove full adapter parity

**Files:**
- Create: `fixtures/stigmergic-field-v0.1.json`
- Modify: `test/stigmergic-adapter.test.ts`

**Interfaces:**
- Consumes: finalized TranchNode fixture and exact raw-byte SHA-256 recorded by the TranchNode implementation.
- Produces: byte-identical local fixture copy plus full linked-sequence adapter parity.

- [ ] **Step 1: Copy the finalized fixture without regeneration**

Fetch `fixtures/stigmergic-field-v0.1.json` from the exact finalized TranchNode implementation commit. Save the returned bytes unchanged to the same relative path in Band Runtime.

Compute its raw-byte SHA-256 and compare it to the exact TranchNode value recorded in that PR. If unequal, stop with `FIXTURE_CONTENT_MISMATCH`; do not reformat JSON.

- [ ] **Step 2: Add the exact linked event sequence helper**

Use these committed event ids and semantics in order:

```text
event-1-session-opened       session.opened
event-2-participant-a        participant.joined a
event-3-participant-b        participant.joined b
event-4-participant-c        participant.joined c
event-5-propose-x            clip.proposed direction-x
event-6-propose-y            clip.proposed direction-y
event-7-c-rings-y            recognition c -> direction-y, rings
event-8-b-rings-x            recognition b -> direction-x, rings
event-9-c-rings-x            recognition c -> direction-x, rings
event-10-a-rings-x           recognition a -> direction-x, rings
event-11-reject-x            clip.rejected direction-x
event-12-b-rings-y           recognition b -> direction-y, rings
event-13-c-no-x              recognition c -> direction-x, no
event-14-b-rings-y-again     recognition b -> direction-y, rings
```

Use session `session-linked-vertical`. Use deterministic numeric timestamps `1..14`; timestamps are not semantic.

- [ ] **Step 3: Add fixture parity test**

Load the fixture via `readFileSync` + `JSON.parse` unless the existing TypeScript config already supports JSON imports.

Assert:

```ts
const adapted = adaptCommittedEventsToStigmergicField(linkedVerticalEvents());
expect(adapted.schemaVersion).toBe(fixture.schemaVersion);
expect(adapted.scopeId).toBe(fixture.scopeId);
expect(adapted.policyVersion).toBe(fixture.policyVersion);
expect(adapted.adapter).toEqual(fixture.adapter);
expect(adapted.sourceEvents).toEqual(fixture.sourceEvents);
expect(adapted.traces).toEqual(fixture.traces.map((trace) => trace.value));
```

Band Runtime compares trace bodies only. Trace hashes belong to TranchNode.

- [ ] **Step 4: Assert projection cases contain no future membership**

For every `fixture.projectionCases` entry, resolve its `sourceEventIds` and `traceHashes` from the fixture pools and assert every resolved source/trace sequence is `<= throughSequence`. This verifies the fixture itself cannot expose future evidence at an earlier cut.

- [ ] **Step 5: Run focused and complete verification**

```bash
npx vitest run test/stigmergic-adapter.test.ts
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add fixtures/stigmergic-field-v0.1.json test/stigmergic-adapter.test.ts
git commit -m "test: pin stigmergic field conformance fixture"
```

---

### Task 3: Prove coordinatorless redistribution using canonical per-cut projections

**Files:**
- Create: `test/stigmergic-specimen.test.ts`

**Interfaces:**
- Consumes: fixture `projectionCases`; does not call or reproduce TranchNode field math.
- Produces: behavioral proof over cuts 10, 11, 12, and 14.

- [ ] **Step 1: Define a test-only local participant choice rule**

```ts
type Cell = {
  subjectRef: string;
  channel: "attention" | "receptivity" | "saturation" | "inhibition" | "tension" | "return";
  totalEffectiveMagnitude: number;
};

function chooseRecruitmentSubject(cells: readonly Cell[]): string | null {
  const state = new Map<string, Partial<Record<Cell["channel"], number>>>();
  for (const cell of cells) {
    const channels = state.get(cell.subjectRef) ?? {};
    channels[cell.channel] = cell.totalEffectiveMagnitude;
    state.set(cell.subjectRef, channels);
  }

  const ranked = [...state.entries()].map(([subjectRef, channels]) => ({
    subjectRef,
    score:
      (channels.receptivity ?? 0)
      + (channels.return ?? 0)
      - (channels.saturation ?? 0)
      - (channels.inhibition ?? 0),
  })).sort((left, right) => right.score - left.score || left.subjectRef.localeCompare(right.subjectRef));

  return ranked[0]?.subjectRef ?? null;
}
```

This is a specimen observer for one participant's local choice. It is not added to production runtime code.

- [ ] **Step 2: Add a helper that returns the canonical expected projection for an exact cut**

Resolve `fixture.projectionCases.find(case => case.throughSequence === cut)?.expectedProjection`. Throw in the test helper if the case is absent; do not silently fall back to another cut.

- [ ] **Step 3: Prove the inhibition hinge**

```ts
it("shared inhibition flips local preference from X to Y without assignment", () => {
  const cut10 = projectionAt(10);
  const cut11 = projectionAt(11);
  expect(chooseRecruitmentSubject(cut10.cells)).toBe("direction-x");
  expect(chooseRecruitmentSubject(cut11.cells)).toBe("direction-y");

  const events = linkedVerticalEvents();
  expect(events[11]?.id).toBe("event-12-b-rings-y");
  expect(events[11]?.type).toBe("recognition.recorded");
  expect(JSON.stringify(events)).not.toMatch(/assign(ed|ment)?|scheduler/i);
});
```

- [ ] **Step 4: Prove no-field means no stigmergic decision claim**

```ts
it("cannot claim stigmergic coordination without field visibility", () => {
  expect(chooseRecruitmentSubject([])).toBeNull();
});
```

- [ ] **Step 5: Prove return/tension remain attributable at cut 14**

Assert the cut-14 Y/return cell contains a contribution sourced by `event-14-b-rings-y-again`, and the X/tension cell contains a contribution sourced by `event-13-c-no-x`. Also assert cut-14 still contains historical/active cells independently rather than one channel deleting another.

- [ ] **Step 6: Prove replay at the Band Runtime boundary**

Serialize the exact linked sequence using `EventStore.serialize()`, deserialize it, and assert adapter output deep-equals the original adapter output. Separately assert every canonical fixture projection has `authority === "none"` and a `sha256:` fingerprint. Do not recompute fingerprints.

- [ ] **Step 7: Run specimen and complete suite**

```bash
npx vitest run test/stigmergic-specimen.test.ts test/stigmergic-adapter.test.ts
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add test/stigmergic-specimen.test.ts
git commit -m "test: prove coordinatorless stigmergic redistribution"
```

---

### Task 4: Final anti-duplication and sovereignty audit

**Files:**
- Review: `src/stigmergic-adapter.ts`
- Review: `test/stigmergic-adapter.test.ts`
- Review: `test/stigmergic-specimen.test.ts`
- Review: `fixtures/stigmergic-field-v0.1.json`
- Review existing: `src/events.ts`, `src/projection.ts`

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: verified proof facts for the notebook specimen.

- [ ] **Step 1: Verify TranchNode math was not copied**

```bash
grep -R "canonicalize\|addressJson\|effectiveMagnitude\|decayWindowEvents -\|fingerprint.*sha256" src test --exclude-dir=node_modules || true
```

Expected: no TranchNode decay/canonicalization/fingerprint implementation. Adapter constants may legitimately contain `decayWindowEvents` fields.

- [ ] **Step 2: Verify event/projection law was not widened**

```bash
git diff main...HEAD -- src/events.ts src/projection.ts
```

Expected: empty diff.

- [ ] **Step 3: Re-run refusal/protected-silence tests and full suite**

```bash
npx vitest run test/admission.test.ts test/hardening.test.ts test/stigmergic-adapter.test.ts
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Record exact proof facts from the passing fixture/specimen**

Record the actual verified values for:

```text
adapter identity
schema version
policy version
fixture raw-byte SHA-256
participant count
candidate subject ids
cut-10 preferred subject
cut-11 preferred subject
next participant-B encounter event id
cut-14 return residue source event id
central assignment event count
protected-silence/refusal semantic trace count
```

These values are copied into the notebook specimen exactly as observed; no value is inferred from this plan if implementation differs.

- [ ] **Step 5: Commit only if audit corrections were required**

If corrections were needed, rerun all verification and make one focused correction commit. Otherwise create no empty commit.
