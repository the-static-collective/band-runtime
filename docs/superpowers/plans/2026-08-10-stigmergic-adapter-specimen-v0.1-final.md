# Band Runtime Stigmergic Adapter + Specimen v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt committed Band Runtime events into TranchNode's frozen Stigmergic Field v0.1 trace contract and prove coordinatorless redistribution from canonical per-cut field projections without duplicating TranchNode field math.

**Architecture:** Band Runtime owns event interpretation only. It vendors the exact finalized TranchNode fixture plus its pinned raw-byte SHA-256, proves the adapter emits the fixture's source envelopes/trace bodies, and consumes the fixture's expected projections as the behavioral oracle. Decay, aggregation, canonicalization, trace addressing, and field fingerprints remain TranchNode-owned.

**Tech Stack:** TypeScript 5.9 `strict`, Vitest 2.1, existing `EventStore`, Node `crypto` only for raw fixture-byte integrity.

## Global Constraints

- Adapter: `band-runtime/stigmergic-adapter@0.1`.
- Policy: `band-runtime-field-policy/v0.1`.
- Schema: `stigmergic-field/v0.1`.
- No TranchNode npm dependency.
- No copied decay formula, aggregate math, JCS canonicalization, trace hash, or field fingerprint implementation.
- Runtime `EventStore.sequence` remains zero-based; generic field sequence is exactly `runtimeSequence + 1`.
- Only committed events with numeric store-assigned sequence enter the adapter.
- Timestamps never affect adaptation.
- No hidden UI/model state, scheduler, global chooser, ranking service, or future evidence.
- `protected_silence.declared` and `boundary.refusal_recorded` emit zero v0.1 stigmergic traces.
- Leave `src/events.ts` and `src/projection.ts` unchanged.
- The participant choice rule is test-local and non-authoritative.
- An assignment-shaped record must trip the anti-cheat assertion.
- All existing Band Runtime tests remain green.

## Files

- Create `src/stigmergic-adapter.ts` — boundary types, adapter identity, committed-event validation, six-channel event interpretation.
- Create `test/stigmergic-adapter.test.ts` — mapping, timestamp independence, protected boundary, fixture parity, pinned fixture hash, future-membership guard.
- Create `test/stigmergic-specimen.test.ts` — local choice, inhibition hinge, no-field negative control, anti-cheat sentinel, return/tension attribution, replay.
- Create `fixtures/stigmergic-field-v0.1.json` — exact bytes copied from finalized TranchNode implementation.
- Create `fixtures/stigmergic-field-v0.1.sha256` — exact raw-byte hash emitted by the finalized TranchNode implementation, followed by one newline.

## Frozen Adapter Interface

```ts
import type { BandEvent } from "./events";

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

### Task 1: Deterministic committed-event adapter

**Files:**
- Create `src/stigmergic-adapter.ts`
- Create `test/stigmergic-adapter.test.ts`

**Interfaces:**
- Consumes committed `BandEvent[]`.
- Produces frozen schema/policy/adapter metadata, one-based source envelopes, and deterministic trace bodies.

**Frozen mapping:**

```text
clip.proposed                         -> attention 500 / window 6
recognition.recorded outcome=rings   -> receptivity 400 / window 5
third-or-later rings on same target  -> saturation 600 / window 4
clip.rejected                         -> inhibition 700 / window 5
recognition.recorded outcome=no      -> tension 350 / window 5
repeat recognition by same participant + target -> return 300 / window 6
```

`nearby`, `projection`, `protected_silence.declared`, and `boundary.refusal_recorded` emit no v0.1 trace. Return means revisitation, so it is emitted on a repeated participant/target pair regardless of recognition outcome.

- [ ] **Step 1: Write failing sequence and uncommitted-event tests**

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
  it("maps zero-based runtime sequence to one-based field sequence", () => {
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

- [ ] **Step 2: Run and confirm failure**

```bash
npx vitest run test/stigmergic-adapter.test.ts
```

Expected: FAIL because the adapter module does not exist.

- [ ] **Step 3: Implement boundary types and sequence validation**

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

Reject empty list as `EMPTY_EVENT_SEQUENCE`. Require every event's `sessionId` to equal the first event's session id or throw `CROSS_SESSION_CONTAMINATION`.

- [ ] **Step 4: Write exact six-channel mapping tests**

Use small committed `EventStore` sequences and assert exact bodies/magnitudes/windows for all six channels. For saturation, assert the third `rings` event emits receptivity then saturation from the same source id/sequence. For return, assert only the second recognition by the same participant on the same target emits return.

Add this hard boundary test:

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

- [ ] **Step 5: Implement the relation scan**

Use:

```ts
const ringsByTarget = new Map<string, number>();
const recognitionPairs = new Set<string>();
```

Scan committed order. `clip.proposed` emits attention. `clip.rejected` emits inhibition. For recognition, compute the pair key before inserting. `rings` increments the target count and emits receptivity; count `>= 3` additionally emits saturation. `no` emits tension. Existing pair additionally emits return. Never delete earlier traces.

- [ ] **Step 6: Add timestamp-independence test**

Adapt one committed sequence, then clone each committed event with `timestamp + 999_999_999` while preserving id/session/sequence/payload. Assert deep-equal adaptation.

- [ ] **Step 7: Run focused/refusal tests and typecheck**

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

### Task 2: Pin exact TranchNode fixture bytes and prove adapter parity

**Files:**
- Create `fixtures/stigmergic-field-v0.1.json`
- Create `fixtures/stigmergic-field-v0.1.sha256`
- Modify `test/stigmergic-adapter.test.ts`

**Interfaces:**
- Consumes finalized TranchNode fixture commit and exact raw-byte SHA-256.
- Produces immutable local conformance evidence and parity tests.

- [ ] **Step 1: Copy the finalized fixture bytes and pinned hash**

Fetch the JSON from the exact finalized TranchNode implementation commit. Save bytes unchanged. Write the exact TranchNode-emitted `sha256:<64 hex>` value to `fixtures/stigmergic-field-v0.1.sha256` with one trailing newline.

Do not pretty-print, normalize, or regenerate the JSON in Band Runtime.

- [ ] **Step 2: Add raw-byte pin verification test**

```ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

it("vendored TranchNode fixture bytes match the pinned canonical address", () => {
  const bytes = readFileSync(new URL("../fixtures/stigmergic-field-v0.1.json", import.meta.url));
  const expected = readFileSync(
    new URL("../fixtures/stigmergic-field-v0.1.sha256", import.meta.url),
    "utf8",
  ).trim();
  const actual = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  expect(actual).toBe(expected);
});
```

If CommonJS test compilation rejects `import.meta.url`, use `resolve(__dirname, "../fixtures/...")` consistent with the repository's existing test runtime. Do not change `tsconfig` merely for fixture loading.

- [ ] **Step 3: Build the exact linked committed sequence**

Use session `session-linked-vertical` and event ids in this exact order:

```text
event-1-session-opened
event-2-participant-a
event-3-participant-b
event-4-participant-c
event-5-propose-x
event-6-propose-y
event-7-c-rings-y
event-8-b-rings-x
event-9-c-rings-x
event-10-a-rings-x
event-11-reject-x
event-12-b-rings-y
event-13-c-no-x
event-14-b-rings-y-again
```

Semantics:

- A/B/C join;
- A proposes `direction-x` and `direction-y`;
- C rings Y;
- B, C, A ring X in that order;
- X is rejected;
- B rings Y;
- C records `no` on X;
- B rings Y again.

Use timestamps `1..14`; they are not semantic.

- [ ] **Step 4: Define strict local fixture types in the test**

```ts
type Hash = `sha256:${string}`;

interface AddressedTrace {
  hash: Hash;
  value: FieldTrace;
}

interface FixtureProjection {
  schemaVersion: "stigmergic-field/v0.1";
  scopeId: string;
  throughSequence: number;
  policyVersion: string;
  adapter: { id: string; version: string };
  authority: "none";
  cells: Array<{
    subjectRef: string;
    channel: FieldChannel;
    totalEffectiveMagnitude: number;
    contributions: Array<{
      traceHash: Hash;
      sourceEventId: string;
      sourceSequence: number;
      effectiveMagnitude: number;
    }>;
  }>;
  fingerprint: Hash;
}

interface FixtureCase {
  throughSequence: number;
  sourceEventIds: string[];
  traceHashes: Hash[];
  expectedProjection: FixtureProjection;
}

interface Fixture {
  schemaVersion: "stigmergic-field/v0.1";
  scopeId: string;
  policyVersion: string;
  adapter: { id: string; version: string };
  sourceEvents: FieldSourceEvent[];
  traces: AddressedTrace[];
  projectionCases: FixtureCase[];
}
```

Parse JSON as `unknown`, perform minimal shape assertions for arrays/schema strings, then cast to `Fixture`; do not silently accept a malformed file after a JSON parse.

- [ ] **Step 5: Add full adapter parity test**

Assert schema/scope/policy/adapter equality, then:

```ts
expect(adapted.sourceEvents).toEqual(fixture.sourceEvents);
expect(adapted.traces).toEqual(fixture.traces.map((item) => item.value));
```

Trace hashes remain TranchNode-owned.

- [ ] **Step 6: Prove every per-cut fixture membership excludes future evidence**

Build maps from fixture source ids and trace hashes. For every case, explicitly resolve every member and assert source/trace sequence `<= case.throughSequence`. A missing referenced id/hash fails the test.

- [ ] **Step 7: Run complete verification and commit**

```bash
npx vitest run test/stigmergic-adapter.test.ts
npm test
npm run typecheck
```

Expected: PASS.

```bash
git add fixtures/stigmergic-field-v0.1.json fixtures/stigmergic-field-v0.1.sha256 test/stigmergic-adapter.test.ts
git commit -m "test: pin stigmergic field conformance fixture"
```

---

### Task 3: Coordinatorless redistribution specimen and explicit anti-cheat

**Files:**
- Create `test/stigmergic-specimen.test.ts`

**Interfaces:**
- Consumes canonical fixture `projectionCases` only; never computes field math.
- Produces behavioral proof at cuts 10, 11, 12, and 14.

- [ ] **Step 1: Define test-local choice and anti-cheat helpers**

```ts
type Cell = FixtureProjection["cells"][number];

function chooseRecruitmentSubject(cells: readonly Cell[]): string | null {
  const state = new Map<string, Partial<Record<FieldChannel, number>>>();
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
  })).sort((left, right) =>
    right.score - left.score || left.subjectRef.localeCompare(right.subjectRef));

  return ranked[0]?.subjectRef ?? null;
}

function assertNoCentralAssignment(value: unknown): void {
  const serialized = JSON.stringify(value);
  if (/assign(ed|ment)?|scheduler/i.test(serialized)) {
    throw new Error("CENTRAL_ASSIGNMENT_PRESENT");
  }
}
```

- [ ] **Step 2: Prove the anti-cheat guard itself**

```ts
it("anti-cheat rejects an inserted assignment-shaped record", () => {
  expect(() => assertNoCentralAssignment(linkedVerticalEvents())).not.toThrow();
  expect(() => assertNoCentralAssignment([
    ...linkedVerticalEvents(),
    { type: "participant.assigned", payload: { participantId: "b", subjectRef: "direction-y" } },
  ])).toThrow("CENTRAL_ASSIGNMENT_PRESENT");
});
```

The sentinel is test data only and must not be added to `BandEvent`.

- [ ] **Step 3: Add exact projection lookup helper**

`projectionAt(cut: number)` finds exactly one fixture case with that `throughSequence`; absence or duplicate match throws in the test helper.

- [ ] **Step 4: Prove the inhibition hinge**

```ts
it("shared inhibition flips local preference from X to Y without assignment", () => {
  expect(chooseRecruitmentSubject(projectionAt(10).cells)).toBe("direction-x");
  expect(chooseRecruitmentSubject(projectionAt(11).cells)).toBe("direction-y");

  const events = linkedVerticalEvents();
  assertNoCentralAssignment(events);
  expect(events[11]?.id).toBe("event-12-b-rings-y");
  expect(events[11]?.type).toBe("recognition.recorded");
});
```

- [ ] **Step 5: Add no-field negative control**

```ts
it("cannot claim stigmergic coordination with field visibility removed", () => {
  expect(chooseRecruitmentSubject([])).toBeNull();
});
```

- [ ] **Step 6: Prove return and tension attribution at cut 14**

Assert the Y/return cell has a contributor from `event-14-b-rings-y-again`, and X/tension has a contributor from `event-13-c-no-x`. Assert each expected projection carries `authority: "none"` and `fingerprint` starts with `sha256:`.

- [ ] **Step 7: Prove Band Runtime replay reproduces adapter evidence**

Serialize the exact linked sequence through `EventStore.serialize()`, deserialize it, and assert the adapter output deep-equals the original. The canonical projection fingerprints are verified upstream by the pinned fixture; do not recompute them here.

- [ ] **Step 8: Run specimen and full suite, then commit**

```bash
npx vitest run test/stigmergic-specimen.test.ts test/stigmergic-adapter.test.ts
npm test
npm run typecheck
```

Expected: PASS.

```bash
git add test/stigmergic-specimen.test.ts
git commit -m "test: prove coordinatorless stigmergic redistribution"
```

---

### Task 4: Final sovereignty and anti-duplication audit

**Files:**
- Review new source/tests/fixtures.
- Review existing `src/events.ts` and `src/projection.ts` for zero diff.

**Interfaces:**
- Consumes Tasks 1-3.
- Produces exact notebook evidence.

- [ ] **Step 1: Search for copied TranchNode math**

```bash
grep -R "canonicalize\|addressJson\|effectiveMagnitude\|decayWindowEvents -\|fingerprint.*createHash" src test --exclude-dir=node_modules || true
```

Expected: no field decay/canonicalization/fingerprint implementation. The raw fixture-byte hash test may legitimately use `createHash` but must not hash a projection body.

- [ ] **Step 2: Confirm event/projection law files are untouched**

```bash
git diff main...HEAD -- src/events.ts src/projection.ts
```

Expected: empty.

- [ ] **Step 3: Run protected-boundary and complete verification**

```bash
npx vitest run test/admission.test.ts test/hardening.test.ts test/stigmergic-adapter.test.ts
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Record exact proof facts**

From actual passing outputs/fixture, record the exact schema, adapter, policy, raw fixture SHA-256, participant count, subjects, cut-10 choice, cut-11 choice, participant-B next event, cut-14 return source, central assignment count, protected-silence/refusal trace count, and canonical fingerprints.

These values feed the notebook specimen. Use observed values only.

- [ ] **Step 5: Commit only if audit corrections were required**

If corrections were needed, rerun all verification and make one focused fix commit. Otherwise create no empty commit.
