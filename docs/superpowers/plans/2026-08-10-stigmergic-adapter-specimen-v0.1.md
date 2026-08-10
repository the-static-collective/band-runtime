# Band Runtime Stigmergic Adapter + Specimen v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt committed Band Runtime events into the frozen TranchNode Stigmergic Field v0.1 trace contract and prove a coordinatorless three-participant redistribution specimen without reimplementing TranchNode field math.

**Architecture:** Band Runtime owns only the deterministic event-to-trace adapter and local specimen behavior. It consumes the exact content-addressed TranchNode conformance fixture as an oracle for field cuts/fingerprints; it never copies decay, aggregation, canonicalization, or fingerprint code into this repository.

**Tech Stack:** TypeScript 5.9, Vitest 2.1, existing `EventStore`, existing Band Runtime event/projection law, JSON fixture copied byte-for-byte from the finalized TranchNode v0.1 implementation.

## Global Constraints

- Adapter identity is exactly `{ id: "band-runtime/stigmergic-adapter", version: "0.1" }`.
- Policy version used by the linked specimen is exactly `band-runtime-field-policy/v0.1`.
- The field schema is exactly `stigmergic-field/v0.1`.
- Band Runtime does not implement decay, aggregation, canonical field ordering, trace addressing, or field fingerprints.
- Band Runtime does not add an npm dependency on TranchNode in v0.1.
- Only committed events with a numeric store-assigned sequence may enter the adapter.
- Runtime `EventStore.sequence` is zero-based; the generic field envelope is one-based by the explicit mapping `fieldSequence = runtimeSequence + 1`.
- The mapping above is versioned behavior of `band-runtime/stigmergic-adapter@0.1`; changing it requires an adapter version change.
- No wall-clock timestamp is used to derive a field trace.
- No hidden participant state, UI state, model confidence, scheduler, ranking service, or future event is used.
- `boundary.refusal_recorded` and `protected_silence.declared` remain excluded from semantic inputs and emit no stigmergic trace in v0.1.
- `clip.rejected` is the v0.1 explicit inhibition source; this avoids weakening the existing refusal-only/protected-silence boundary.
- The specimen local chooser is non-authoritative and test-scoped; it demonstrates participant choice from visible field state, not runtime assignment policy.
- The anti-cheat test must fail if an assignment event/field is introduced into the specimen.
- All existing Band Runtime tests must remain green.

---

## File Structure

- Create `src/stigmergic-adapter.ts` — generic v0.1 structural types needed at the boundary, adapter identity, committed-event validation, source-envelope conversion, and deterministic event-to-trace derivation.
- Create `test/stigmergic-adapter.test.ts` — adapter mapping/conformance tests against the canonical TranchNode fixture.
- Create `test/stigmergic-specimen.test.ts` — coordinatorless encounter proof using precomputed field cuts from the canonical fixture.
- Create `fixtures/stigmergic-field-v0.1.json` — byte-for-byte copy of the finalized TranchNode canonical fixture.
- Do not modify `src/projection.ts` to make refusal/protected-silence semantically participating.
- Do not modify `src/events.ts` to add an assignment, quorum, scheduler, or generic field-signal event for this proof.

### Public Interfaces Frozen by This Plan

```ts
import type { BandEvent } from "./events";

export const BAND_STIGMERGIC_ADAPTER = {
  id: "band-runtime/stigmergic-adapter",
  version: "0.1",
} as const;

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
  policyVersion: "band-runtime-field-policy/v0.1";
  adapter: typeof BAND_STIGMERGIC_ADAPTER;
  sourceEvents: FieldSourceEvent[];
  traces: FieldTrace[];
}

export function adaptCommittedEventsToStigmergicField(
  events: readonly BandEvent[],
): BandStigmergicAdaptation;
```

---

### Task 1: Implement committed-event envelope conversion and the basic attention/receptivity mapping

**Files:**
- Create: `src/stigmergic-adapter.ts`
- Create: `test/stigmergic-adapter.test.ts`

**Interfaces:**
- Consumes: committed `BandEvent[]` from `EventStore.getAll()`.
- Produces: one-based generic source envelopes plus basic traces for `clip.proposed` and `recognition.recorded`.

- [ ] **Step 1: Write failing tests for one-based sequence mapping and uncommitted-event rejection**

Create `test/stigmergic-adapter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EventStore } from "../src/store";
import {
  BAND_STIGMERGIC_ADAPTER,
  adaptCommittedEventsToStigmergicField,
} from "../src/stigmergic-adapter";

function opened(id = "event-1-session-opened") {
  return {
    id,
    type: "session.opened" as const,
    timestamp: 1000,
    sessionId: "session-linked-vertical",
    payload: { sessionId: "session-linked-vertical" },
  };
}

describe("Band Runtime stigmergic adapter", () => {
  it("maps zero-based committed runtime sequence to one-based field sequence", () => {
    const store = new EventStore();
    store.append(opened());
    store.append({
      id: "event-2-participant-a",
      type: "participant.joined",
      timestamp: 1001,
      sessionId: "session-linked-vertical",
      payload: { participantId: "a", role: "guitar" },
    });

    const result = adaptCommittedEventsToStigmergicField(store.getAll());
    expect(result.adapter).toEqual(BAND_STIGMERGIC_ADAPTER);
    expect(result.sourceEvents).toEqual([
      { eventId: "event-1-session-opened", scopeId: "session-linked-vertical", sequence: 1 },
      { eventId: "event-2-participant-a", scopeId: "session-linked-vertical", sequence: 2 },
    ]);
  });

  it("rejects events without a committed numeric sequence", () => {
    expect(() => adaptCommittedEventsToStigmergicField([opened()])).toThrow("UNCOMMITTED_EVENT");
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails because the adapter module does not exist**

```bash
npx vitest run test/stigmergic-adapter.test.ts
```

Expected: FAIL on missing `src/stigmergic-adapter.ts`.

- [ ] **Step 3: Implement frozen boundary types, adapter identity, and committed-event validation**

Create `src/stigmergic-adapter.ts` with:

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

function committedSequence(event: BandEvent): number {
  if (!Number.isSafeInteger(event.sequence) || (event.sequence ?? -1) < 0) {
    throw new Error("UNCOMMITTED_EVENT");
  }
  return event.sequence as number;
}

function fieldSequence(event: BandEvent): number {
  return committedSequence(event) + 1;
}
```

Validate that all events share the first event's `sessionId`, and reject empty arrays with `EMPTY_EVENT_SEQUENCE`. This is defense-in-depth even though `EventStore` already protects session isolation.

- [ ] **Step 4: Add failing tests for `clip.proposed` attention and `rings` recognition receptivity**

Append:

```ts
it("maps proposal to attention and rings recognition to receptivity without reading timestamps", () => {
  const store = new EventStore();
  store.append(opened());
  store.append({
    id: "event-2-propose-x",
    type: "clip.proposed",
    timestamp: 999999999,
    sessionId: "session-linked-vertical",
    payload: { participantId: "a", clipId: "direction-x", mediaType: "audio/wav", content: {} },
  });
  store.append({
    id: "event-3-b-rings-x",
    type: "recognition.recorded",
    timestamp: -500,
    sessionId: "session-linked-vertical",
    payload: { participantId: "b", targetId: "direction-x", outcome: "rings" },
  });

  const result = adaptCommittedEventsToStigmergicField(store.getAll());
  expect(result.traces).toEqual([
    {
      sourceEventId: "event-2-propose-x",
      sourceSequence: 2,
      scopeId: "session-linked-vertical",
      subjectRef: "direction-x",
      channel: "attention",
      magnitude: 500,
      decayWindowEvents: 6,
    },
    {
      sourceEventId: "event-3-b-rings-x",
      sourceSequence: 3,
      scopeId: "session-linked-vertical",
      subjectRef: "direction-x",
      channel: "receptivity",
      magnitude: 400,
      decayWindowEvents: 5,
    },
  ]);
});
```

- [ ] **Step 5: Implement basic trace mapping**

Inside `adaptCommittedEventsToStigmergicField()`:

```ts
const sourceEvents = events.map((event) => ({
  eventId: event.id,
  scopeId: event.sessionId,
  sequence: fieldSequence(event),
}));

const traces: FieldTrace[] = [];
for (const event of events) {
  const sourceSequence = fieldSequence(event);
  if (event.type === "clip.proposed") {
    traces.push({
      sourceEventId: event.id,
      sourceSequence,
      scopeId: event.sessionId,
      subjectRef: event.payload.clipId,
      channel: "attention",
      magnitude: 500,
      decayWindowEvents: 6,
    });
  }
  if (event.type === "recognition.recorded" && event.payload.outcome === "rings") {
    traces.push({
      sourceEventId: event.id,
      sourceSequence,
      scopeId: event.sessionId,
      subjectRef: event.payload.targetId,
      channel: "receptivity",
      magnitude: 400,
      decayWindowEvents: 5,
    });
  }
}
```

Return the literal schema/policy/adapter values with the source envelopes and traces. Do not sort events; committed store order and assigned sequence define the adapter scan.

- [ ] **Step 6: Run focused tests and typecheck**

```bash
npx vitest run test/stigmergic-adapter.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add src/stigmergic-adapter.ts test/stigmergic-adapter.test.ts
git commit -m "feat: adapt Band Runtime events to stigmergic traces"
```

---

### Task 2: Add saturation, inhibition, tension, and return as deterministic event relations

**Files:**
- Modify: `src/stigmergic-adapter.ts`
- Modify: `test/stigmergic-adapter.test.ts`

**Interfaces:**
- Consumes: the Task 1 ordered committed-event scan.
- Produces: all six v0.1 channels without new Band Runtime event types.

**Frozen v0.1 mapping:**

```text
clip.proposed                         -> attention 500 / window 6
recognition.recorded outcome=rings   -> receptivity 400 / window 5
third-or-later rings on same target  -> saturation 600 / window 4, sourced by the rings event that crosses threshold
clip.rejected                         -> inhibition 700 / window 5
recognition.recorded outcome=no      -> tension 350 / window 5
repeat recognition by same participant on same target -> return 300 / window 6, sourced by the repeated recognition event
```

`nearby` and `projection` recognition outcomes emit no v0.1 channel. `boundary.refusal_recorded` and `protected_silence.declared` emit no v0.1 channel.

- [ ] **Step 1: Write failing mapping tests**

Append tests that create committed sequences and assert exact extra traces:

```ts
it("emits saturation on the third rings recognition for one target", () => {
  const store = new EventStore();
  store.append(opened());
  for (const [index, participantId] of ["a", "b", "c"].entries()) {
    store.append({
      id: `rings-${index + 1}`,
      type: "recognition.recorded",
      timestamp: index,
      sessionId: "session-linked-vertical",
      payload: { participantId, targetId: "direction-x", outcome: "rings" },
    });
  }
  const result = adaptCommittedEventsToStigmergicField(store.getAll());
  expect(result.traces.filter((trace) => trace.channel === "saturation")).toEqual([{
    sourceEventId: "rings-3",
    sourceSequence: 4,
    scopeId: "session-linked-vertical",
    subjectRef: "direction-x",
    channel: "saturation",
    magnitude: 600,
    decayWindowEvents: 4,
  }]);
});

it("maps clip rejection to inhibition and no-recognition to tension", () => {
  const store = new EventStore();
  store.append(opened());
  store.append({
    id: "p-x",
    type: "clip.proposed",
    timestamp: 1,
    sessionId: "session-linked-vertical",
    payload: { participantId: "a", clipId: "direction-x", mediaType: "audio/wav", content: {} },
  });
  store.append({
    id: "r-x",
    type: "clip.rejected",
    timestamp: 2,
    sessionId: "session-linked-vertical",
    payload: { clipId: "direction-x", reason: "enough activity here" },
  });
  store.append({
    id: "no-x",
    type: "recognition.recorded",
    timestamp: 3,
    sessionId: "session-linked-vertical",
    payload: { participantId: "c", targetId: "direction-x", outcome: "no" },
  });
  const result = adaptCommittedEventsToStigmergicField(store.getAll());
  expect(result.traces.filter((trace) => ["inhibition", "tension"].includes(trace.channel))).toEqual([
    {
      sourceEventId: "r-x",
      sourceSequence: 3,
      scopeId: "session-linked-vertical",
      subjectRef: "direction-x",
      channel: "inhibition",
      magnitude: 700,
      decayWindowEvents: 5,
    },
    {
      sourceEventId: "no-x",
      sourceSequence: 4,
      scopeId: "session-linked-vertical",
      subjectRef: "direction-x",
      channel: "tension",
      magnitude: 350,
      decayWindowEvents: 5,
    },
  ]);
});

it("emits return only when the same participant revisits the same target", () => {
  const store = new EventStore();
  store.append(opened());
  store.append({
    id: "b-y-1",
    type: "recognition.recorded",
    timestamp: 1,
    sessionId: "session-linked-vertical",
    payload: { participantId: "b", targetId: "direction-y", outcome: "rings" },
  });
  store.append({
    id: "c-x",
    type: "recognition.recorded",
    timestamp: 2,
    sessionId: "session-linked-vertical",
    payload: { participantId: "c", targetId: "direction-x", outcome: "nearby" },
  });
  store.append({
    id: "b-y-2",
    type: "recognition.recorded",
    timestamp: 3,
    sessionId: "session-linked-vertical",
    payload: { participantId: "b", targetId: "direction-y", outcome: "rings" },
  });
  const result = adaptCommittedEventsToStigmergicField(store.getAll());
  expect(result.traces.filter((trace) => trace.channel === "return")).toEqual([{
    sourceEventId: "b-y-2",
    sourceSequence: 4,
    scopeId: "session-linked-vertical",
    subjectRef: "direction-y",
    channel: "return",
    magnitude: 300,
    decayWindowEvents: 6,
  }]);
});
```

- [ ] **Step 2: Run focused tests and verify they fail on missing channels**

```bash
npx vitest run test/stigmergic-adapter.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement the deterministic relation counters**

Use maps local to one adapter invocation:

```ts
const ringsByTarget = new Map<string, number>();
const recognitionPairs = new Set<string>();
```

For each `recognition.recorded` event in committed order:

```ts
const pair = `${event.payload.participantId}\u0000${event.payload.targetId}`;
const isReturn = recognitionPairs.has(pair);
recognitionPairs.add(pair);

if (event.payload.outcome === "rings") {
  const rings = (ringsByTarget.get(event.payload.targetId) ?? 0) + 1;
  ringsByTarget.set(event.payload.targetId, rings);
  // emit receptivity first
  // when rings >= 3, emit saturation after receptivity for the same source event
}

if (event.payload.outcome === "no") {
  // emit tension
}

if (isReturn) {
  // emit return regardless of recognition outcome; the trace records revisitation, not agreement
}
```

For `clip.rejected`, emit inhibition. Do not delete previously emitted attention or receptivity traces.

- [ ] **Step 4: Add a hard boundary test for protected silence/refusal**

Append:

```ts
it("protected silence and refusal-only receipts do not become stigmergic semantic traces", () => {
  const store = new EventStore();
  store.append(opened());
  store.append({
    id: "silence-1",
    type: "protected_silence.declared",
    timestamp: 1,
    sessionId: "session-linked-vertical",
    payload: {
      silenceId: "s1",
      participantId: "a",
      artifactRef: "artifact-1",
      contentHash: "sha256:before",
      causalCutId: "cut-1",
    },
  });
  store.append({
    id: "refusal-1",
    type: "boundary.refusal_recorded",
    timestamp: 2,
    sessionId: "session-linked-vertical",
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

- [ ] **Step 5: Run focused tests, typecheck, and existing refusal tests**

```bash
npx vitest run test/stigmergic-adapter.test.ts test/admission.test.ts test/hardening.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/stigmergic-adapter.ts test/stigmergic-adapter.test.ts
git commit -m "feat: derive inhibitory and return field traces"
```

---

### Task 3: Import the exact TranchNode conformance fixture and prove adapter parity

**Files:**
- Create: `fixtures/stigmergic-field-v0.1.json`
- Modify: `test/stigmergic-adapter.test.ts`

**Interfaces:**
- Consumes: finalized TranchNode `fixtures/stigmergic-field-v0.1.json` and its recorded content SHA-256.
- Produces: a byte-identical local fixture copy and an adapter parity test over the linked Band Runtime event sequence.

- [ ] **Step 1: Copy the finalized TranchNode fixture byte-for-byte**

At execution time, fetch the exact fixture from the finalized TranchNode implementation commit/PR, not from an unpinned moving branch. Save it unchanged as:

```text
fixtures/stigmergic-field-v0.1.json
```

Verify its raw-byte SHA-256 equals the exact fixture content address recorded by TranchNode Task 5. If the hash differs, stop with `FIXTURE_CONTENT_MISMATCH`; do not normalize whitespace or regenerate it locally.

- [ ] **Step 2: Build the exact Band Runtime linked-vertical event sequence in the conformance test**

Append a helper to `test/stigmergic-adapter.test.ts`:

```ts
function linkedVerticalEvents() {
  const store = new EventStore();
  store.append(opened("event-1-session-opened"));
  store.append({ id: "event-2-participant-a", type: "participant.joined", timestamp: 2, sessionId: "session-linked-vertical", payload: { participantId: "a", role: "guitar" } });
  store.append({ id: "event-3-participant-b", type: "participant.joined", timestamp: 3, sessionId: "session-linked-vertical", payload: { participantId: "b", role: "bass" } });
  store.append({ id: "event-4-participant-c", type: "participant.joined", timestamp: 4, sessionId: "session-linked-vertical", payload: { participantId: "c", role: "drums" } });
  store.append({ id: "event-5-propose-x", type: "clip.proposed", timestamp: 5, sessionId: "session-linked-vertical", payload: { participantId: "a", clipId: "direction-x", mediaType: "audio/wav", content: { direction: "x" } } });
  store.append({ id: "event-6-propose-y", type: "clip.proposed", timestamp: 6, sessionId: "session-linked-vertical", payload: { participantId: "a", clipId: "direction-y", mediaType: "audio/wav", content: { direction: "y" } } });
  store.append({ id: "event-7-c-rings-y", type: "recognition.recorded", timestamp: 7, sessionId: "session-linked-vertical", payload: { participantId: "c", targetId: "direction-y", outcome: "rings" } });
  store.append({ id: "event-8-b-rings-x", type: "recognition.recorded", timestamp: 8, sessionId: "session-linked-vertical", payload: { participantId: "b", targetId: "direction-x", outcome: "rings" } });
  store.append({ id: "event-9-c-rings-x", type: "recognition.recorded", timestamp: 9, sessionId: "session-linked-vertical", payload: { participantId: "c", targetId: "direction-x", outcome: "rings" } });
  store.append({ id: "event-10-a-rings-x", type: "recognition.recorded", timestamp: 10, sessionId: "session-linked-vertical", payload: { participantId: "a", targetId: "direction-x", outcome: "rings" } });
  store.append({ id: "event-11-reject-x", type: "clip.rejected", timestamp: 11, sessionId: "session-linked-vertical", payload: { clipId: "direction-x", reason: "saturated" } });
  store.append({ id: "event-12-b-rings-y", type: "recognition.recorded", timestamp: 12, sessionId: "session-linked-vertical", payload: { participantId: "b", targetId: "direction-y", outcome: "rings" } });
  store.append({ id: "event-13-c-no-x", type: "recognition.recorded", timestamp: 13, sessionId: "session-linked-vertical", payload: { participantId: "c", targetId: "direction-x", outcome: "no" } });
  store.append({ id: "event-14-b-rings-y-again", type: "recognition.recorded", timestamp: 14, sessionId: "session-linked-vertical", payload: { participantId: "b", targetId: "direction-y", outcome: "rings" } });
  return store.getAll();
}
```

- [ ] **Step 3: Add the fixture parity test**

The TranchNode fixture stores addressed traces as `{ hash, value }`; Band Runtime compares only the `value` bodies because trace addressing belongs to TranchNode.

```ts
import fixture from "../fixtures/stigmergic-field-v0.1.json";

it("adapter output matches the canonical TranchNode generic envelopes and trace bodies", () => {
  const adapted = adaptCommittedEventsToStigmergicField(linkedVerticalEvents());
  expect(adapted.schemaVersion).toBe(fixture.schemaVersion);
  expect(adapted.scopeId).toBe(fixture.scopeId);
  expect(adapted.policyVersion).toBe(fixture.policyVersion);
  expect(adapted.adapter).toEqual(fixture.adapter);
  expect(adapted.sourceEvents).toEqual(fixture.sourceEvents);
  expect(adapted.traces).toEqual(fixture.traces.map((trace) => trace.value));
});
```

If TypeScript's JSON import settings do not permit the import form above, use `readFileSync(new URL(...), "utf8")` plus `JSON.parse`. Do not alter compiler settings solely for this fixture.

- [ ] **Step 4: Prove timestamp changes do not change adaptation**

Add:

```ts
it("changing all wall-clock timestamps leaves source envelopes and traces identical", () => {
  const original = linkedVerticalEvents();
  const shifted = original.map((event) => ({ ...event, timestamp: event.timestamp + 999_999_999 }));
  expect(adaptCommittedEventsToStigmergicField(shifted)).toEqual(
    adaptCommittedEventsToStigmergicField(original),
  );
});
```

- [ ] **Step 5: Run adapter conformance and full test suite**

```bash
npx vitest run test/stigmergic-adapter.test.ts
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add fixtures/stigmergic-field-v0.1.json test/stigmergic-adapter.test.ts
git commit -m "test: conform Band Runtime to stigmergic field fixture"
```

---

### Task 4: Prove coordinatorless redistribution using canonical field cuts

**Files:**
- Create: `test/stigmergic-specimen.test.ts`

**Interfaces:**
- Consumes: `linkedVerticalEvents()` semantics from Task 3, canonical `expectedProjections` from the fixture, and no TranchNode field-math implementation.
- Produces: the behavioral proof that participant B's next action can shift from X toward Y after shared saturation/inhibition evidence without an assignment event.

- [ ] **Step 1: Write a local non-authoritative chooser over participant-visible field cells**

In the test file, define structural fixture types and this test-only chooser:

```ts
type Cell = {
  subjectRef: string;
  channel: "attention" | "receptivity" | "saturation" | "inhibition" | "tension" | "return";
  totalEffectiveMagnitude: number;
};

function chooseRecruitmentSubject(cells: readonly Cell[]): string | null {
  const bySubject = new Map<string, Partial<Record<Cell["channel"], number>>>();
  for (const cell of cells) {
    const current = bySubject.get(cell.subjectRef) ?? {};
    current[cell.channel] = cell.totalEffectiveMagnitude;
    bySubject.set(cell.subjectRef, current);
  }

  const ranked = [...bySubject.entries()].map(([subjectRef, channels]) => ({
    subjectRef,
    score:
      (channels.receptivity ?? 0)
      + (channels.return ?? 0)
      - (channels.saturation ?? 0)
      - (channels.inhibition ?? 0),
  })).sort((a, b) => b.score - a.score || a.subjectRef.localeCompare(b.subjectRef));

  return ranked[0]?.subjectRef ?? null;
}
```

The chooser is deliberately simple and test-scoped. It is not a scheduler and has no write authority.

- [ ] **Step 2: Write the failing redistribution test over cuts 10 and 11**

Load the canonical fixture and find projections by `throughSequence`:

```ts
it("explicit inhibition flips local recruitment preference from X toward Y without assignment", () => {
  const cut10 = fixture.expectedProjections.find((projection) => projection.throughSequence === 10)!;
  const cut11 = fixture.expectedProjections.find((projection) => projection.throughSequence === 11)!;

  expect(chooseRecruitmentSubject(cut10.cells)).toBe("direction-x");
  expect(chooseRecruitmentSubject(cut11.cells)).toBe("direction-y");

  const events = linkedVerticalEvents();
  expect(events.some((event) => event.type.includes("assign"))).toBe(false);
  expect(events[11]?.id).toBe("event-12-b-rings-y");
  expect(events[11]?.type).toBe("recognition.recorded");
});
```

This proves the consequential hinge: before explicit inhibition, X still wins the local score; after inhibition, Y wins, and B's next committed encounter is with Y.

- [ ] **Step 3: Add anti-cheat tests**

```ts
it("cannot claim stigmergic coordination when field visibility is removed", () => {
  expect(chooseRecruitmentSubject([])).toBeNull();
});

it("fixture contains no central assignment event or assignment payload", () => {
  const serialized = JSON.stringify(linkedVerticalEvents());
  expect(serialized).not.toMatch(/assign(ed|ment)?/i);
  expect(serialized).not.toMatch(/scheduler/i);
});
```

- [ ] **Step 4: Prove downstream return residue after the redistribution**

```ts
it("the redistributed path leaves attributable return residue rather than rewriting the earlier X history", () => {
  const cut14 = fixture.expectedProjections.find((projection) => projection.throughSequence === 14)!;
  const yReturn = cut14.cells.find(
    (cell) => cell.subjectRef === "direction-y" && cell.channel === "return",
  );
  expect(yReturn?.totalEffectiveMagnitude).toBeGreaterThan(0);
  expect(yReturn?.contributions.some((contribution) => contribution.sourceEventId === "event-14-b-rings-y-again")).toBe(true);

  const xTension = cut14.cells.find(
    (cell) => cell.subjectRef === "direction-x" && cell.channel === "tension",
  );
  expect(xTension?.contributions.some((contribution) => contribution.sourceEventId === "event-13-c-no-x")).toBe(true);
});
```

- [ ] **Step 5: Prove replay stability at the Band Runtime boundary**

Serialize and deserialize the linked event sequence through the existing store, then assert the adapter output is identical:

```ts
it("store replay reproduces the same adapter evidence", () => {
  const first = new EventStore(linkedVerticalEvents());
  const replayed = EventStore.deserialize(first.serialize());
  expect(adaptCommittedEventsToStigmergicField(replayed.getAll())).toEqual(
    adaptCommittedEventsToStigmergicField(first.getAll()),
  );
});
```

Also assert every canonical field projection in the fixture has `authority === "none"` and a non-empty `sha256:` fingerprint. Band Runtime verifies the frozen oracle; it does not recompute those fingerprints.

- [ ] **Step 6: Run specimen tests and all existing runtime tests**

```bash
npx vitest run test/stigmergic-specimen.test.ts test/stigmergic-adapter.test.ts
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add test/stigmergic-specimen.test.ts
git commit -m "test: prove coordinatorless stigmergic redistribution"
```

---

### Task 5: Final sovereignty and anti-duplication audit

**Files:**
- Review only: `src/stigmergic-adapter.ts`
- Review only: `test/stigmergic-adapter.test.ts`
- Review only: `test/stigmergic-specimen.test.ts`
- Review only: `fixtures/stigmergic-field-v0.1.json`
- Review existing: `src/projection.ts`, `src/events.ts`, `src/store.ts`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a Band Runtime implementation branch ready for the notebook specimen and PR review.

- [ ] **Step 1: Verify no TranchNode math was copied**

Run:

```bash
grep -R "effectiveMagnitude\|decayWindowEvents -\|addressJson\|canonicalize\|fingerprint.*sha256" src test --exclude-dir=node_modules || true
```

Expected: adapter constants may contain `decayWindowEvents`, but no copied decay formula, JCS implementation, TranchNode `addressJson`, or field fingerprint derivation exists in Band Runtime.

- [ ] **Step 2: Verify protected silence/refusal semantics remain isolated**

Run:

```bash
npx vitest run test/admission.test.ts test/hardening.test.ts test/stigmergic-adapter.test.ts
```

Expected: PASS, including the new no-trace boundary test.

- [ ] **Step 3: Verify no new assignment/scheduler event was added**

```bash
git diff main...HEAD -- src/events.ts src/projection.ts
```

Expected: no changes. If implementation changed either file, inspect and remove any change not strictly required by the approved design.

- [ ] **Step 4: Run complete verification from a clean checkout/worktree**

```bash
npm ci
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Record proof facts for the PR and notebook**

From the passing tests, record exactly:

```text
adapter: band-runtime/stigmergic-adapter@0.1
field schema: stigmergic-field/v0.1
policy: band-runtime-field-policy/v0.1
participants: 3
candidate subjects: direction-x, direction-y
pre-inhibition preferred subject at cut 10: direction-x
post-inhibition preferred subject at cut 11: direction-y
next participant-B encounter: event-12-b-rings-y
return residue source: event-14-b-rings-y-again
central assignment events: 0
protected-silence/refusal semantic traces: 0
```

Also carry forward the exact TranchNode fixture raw-byte SHA-256 obtained during Task 3. These values become the machine-grounded facts for `What-is-the-static-collective-`.

- [ ] **Step 6: Commit only if audit corrections were needed**

If changes were required, rerun the complete verification and make one focused correction commit. Otherwise do not create an empty commit.
