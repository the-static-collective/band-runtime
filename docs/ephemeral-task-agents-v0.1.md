# Ephemeral Task Agents v0.1

## Status

Proposed architectural slice for `band-runtime`.

## Working name

**Meeseeks** is the memorable development nickname.

The architectural term is **ephemeral task agent** or **task vessel**.

The nickname should never carry semantic authority. Implementations must conform to the law in this document, not to the fictional character.

---

## 1. Problem

The runtime currently distinguishes sovereign participants, durable event history, projections, recognition, anticipation, and bounded authority.

It does not yet distinguish a separate category of cognition that:

- exists only to perform one bounded operation;
- must not become a participant;
- must not accumulate identity or standing;
- must not enlarge the commission it received;
- must leave attributable residue;
- must terminate whether it succeeds or fails.

Without this distinction, small computational jobs tend to be assigned to persistent agents or services. That quietly grants continuity, memory, and interpretive standing to work that requires none of them.

Examples include:

- normalizing timestamps;
- hashing an artifact;
- transcoding audio;
- comparing two documents;
- clustering notes into a proposal;
- producing a disposable summary projection;
- checking a schema;
- generating candidate variants.

These operations need capability, but not personhood, sovereignty, or durable identity.

---

## 2. Core distinction

An ephemeral task agent is **not a participant**.

It is a temporary execution vessel commissioned by an authorized caller for one declared task.

It receives no standing beyond that commission.

It may produce testimony about its execution, but it may not produce authoritative memory merely by having executed.

### Runtime ecology

- **Participants** carry sovereign channels and may persist across encounters.
- **Services** provide durable infrastructure under declared policy.
- **Projections** derive disposable views from durable history.
- **Ephemeral task agents** execute one bounded commission and terminate.

The category exists to preserve a clean boundary between **disposable cognition** and **durable participation**.

---

## 3. Governing law

> An ephemeral task agent may exist only within the authority, scope, and lifetime of the task that commissioned it. It inherits no authority beyond that task. It may not enlarge, delegate, or retain the commission. Nothing survives termination except append-only testimony admitted by the runtime.

Corollaries:

1. **No objective enlargement.** The task agent may not reinterpret a narrow commission into a broader goal.
2. **No secondary commission.** It may not accept unrelated follow-up work. A new task requires a new instance.
3. **No delegation.** It may not spawn children or transfer authority unless a future profile explicitly permits a bounded subtask graph.
4. **No durable memory.** Working memory is destroyed at termination.
5. **No standing.** Completion does not make it a participant, witness, recognizer, owner, or authority.
6. **No improvisation through impossibility.** If the task cannot be completed within bounds, it emits blocked or failed testimony and terminates.
7. **No silent residue.** Any output proposed for admission must identify the commission, inputs, method profile, and outcome.
8. **Termination is mandatory.** Success, failure, refusal, timeout, cancellation, and invalidation are all terminal paths.

---

## 4. Fatherhand constraint

The task agent is a direct computational expression of bounded stewardship.

It receives a purpose from a caller but may not enlarge what it received.

Its authority is derivative, non-transferable, and exhausted by the commission.

Formally:

```text
agent.authority ⊆ commission.authority ⊆ caller.delegableAuthority
```

At no point may execution create new authority.

Outputs may be proposed as artifacts or testimony. They do not inherit the caller's authority merely because the caller commissioned them.

---

## 5. Minimal type shape

```ts
type TaskAgentId = string;
type CommissionId = string;
type EventId = string;
type ArtifactRef = string;

type TaskTerminalStatus =
  | "completed"
  | "blocked"
  | "failed"
  | "refused"
  | "cancelled"
  | "timed_out"
  | "invalidated";

interface EphemeralTaskCommission {
  commissionId: CommissionId;
  commissionedBy: string;
  sessionId: string;

  objective: {
    kind: string;
    description: string;
    acceptanceCriteria: readonly string[];
  };

  authority: {
    mayRead: readonly ArtifactRef[];
    mayPropose: readonly string[];
    mayMutate: readonly never[];
    mayDelegate: false;
  };

  limits: {
    expiresAt?: string;
    maxSteps?: number;
    maxOutputBytes?: number;
  };

  memory: "working_only";
  termination: "required";
}

interface EphemeralTaskAgent {
  agentId: TaskAgentId;
  commissionId: CommissionId;
  spawnedAtEvent: EventId;
  state: "running" | "terminal";
}

interface TaskExecutionReceipt {
  commissionId: CommissionId;
  agentId: TaskAgentId;
  status: TaskTerminalStatus;
  inputRefs: readonly ArtifactRef[];
  outputRefs: readonly ArtifactRef[];
  methodProfile: string;
  startedAt: string;
  terminatedAt: string;
  reason?: string;
  semanticEffect: "none";
}
```

`semanticEffect: "none"` is required on the execution receipt itself. Any proposed output must pass ordinary admission before it can affect a projection.

---

## 6. Event vocabulary

Minimum lifecycle:

```text
task.commissioned
task.agent_spawned
task.execution_started
task.output_proposed
task.completed | task.blocked | task.failed | task.refused
task.agent_terminated
```

Additional terminal events may include:

```text
task.cancelled
task.timed_out
task.invalidated
```

### Required ordering

```text
task.commissioned
  -> task.agent_spawned
  -> task.execution_started
  -> zero or more task.output_proposed
  -> exactly one terminal outcome
  -> task.agent_terminated
```

The runtime must reject:

- execution before commission;
- output from an undeclared input scope;
- output after a terminal outcome;
- multiple terminal outcomes;
- termination before a terminal outcome;
- any event after termination;
- attempted delegation;
- attempted commission enlargement;
- mutation not explicitly granted by the commission.

---

## 7. Output and admission

The task agent never writes directly into protected state.

It may only:

1. read inputs permitted by the commission;
2. compute within declared limits;
3. propose outputs;
4. emit execution testimony;
5. terminate.

A proposed output remains foreign to durable state until admitted by the normal runtime pipeline.

This preserves the distinction:

```text
execution != admission
proposal != authority
receipt != semantic effect
```

A failed or refused task may still leave useful residue without granting the attempted operation any effect.

---

## 8. Memory and erasure

Working memory may exist during execution only.

After `task.agent_terminated`:

- prompts, scratch state, chain state, caches, and intermediate hypotheses are not addressable as agent memory;
- no future task may resume the terminated identity;
- no future task may claim continuity with the terminated instance;
- only admitted artifacts and append-only receipts remain.

Reproducibility, where required, must come from declared inputs, method profiles, deterministic seeds, and receipts—not from persistent hidden memory.

---

## 9. Failure is ordinary

The fictional Meeseeks becomes unstable because completion is psychologically mandatory.

The runtime version has no such pressure.

Failure is a valid terminal result.

```text
task.commissioned
  -> task.agent_spawned
  -> task.execution_started
  -> task.blocked
  -> task.agent_terminated
```

A bounded failure is preferable to unauthorized success.

The agent must not solve impossibility by:

- changing the objective;
- fabricating missing evidence;
- accessing undeclared inputs;
- mutating protected state;
- recruiting another agent;
- remaining alive indefinitely.

---

## 10. Protected silence and refusal

An ephemeral task agent cannot infer permission from silence.

If a required input is withheld, protected, absent, or outside disclosure bounds, the agent must emit `task.blocked` or `task.refused` as appropriate.

The refusal receipt must preserve:

- the requested operation;
- the boundary encountered;
- the fact that no protected state changed;
- `semanticEffect: "none"`.

---

## 11. Initial use cases

### A. Disposable summary projection

A participant commissions a one-time summary over a declared causal cut.

The task agent reads only that cut, proposes a summary artifact, leaves a receipt, and terminates. The summary gains no standing unless admitted or recognized through ordinary runtime mechanisms.

### B. Artifact normalization

A task agent receives one artifact and a normalization profile. It proposes a normalized derivative plus hash/provenance receipts. It cannot replace the source artifact.

### C. Comparison

A task agent compares two declared artifacts and proposes a difference report. It cannot infer authority from either source.

### D. Media processing

A task agent transcodes, measures, or derives a waveform from admitted media. The derivative remains linked to the source and does not supersede it.

---

## 12. Acceptance tests

A conforming first implementation should prove:

1. A commissioned task can spawn, propose output, complete, and terminate.
2. A blocked task terminates without output or state mutation.
3. A task cannot read an artifact outside `mayRead`.
4. A task cannot mutate durable state directly.
5. A task cannot emit output after its terminal event.
6. A task cannot emit any event after termination.
7. A second objective cannot be attached to an existing task agent.
8. A task agent cannot spawn another task agent.
9. A receipt remains after termination while working memory does not.
10. Replaying admitted lifecycle events yields the same terminal task projection.
11. Task output has no semantic effect before ordinary admission.
12. Failure and refusal preserve `protectedStateBefore === protectedStateAfter`.

---

## 13. Non-goals for v0.1

This slice does not define:

- autonomous long-running agents;
- agent personalities;
- recursive task delegation;
- self-modifying objectives;
- hidden memory continuity;
- economic incentives;
- participant rights for task agents;
- direct writes to shared projections.

Those features would require separate law and must not be inferred from this primitive.

---

## 14. Architectural consequence

The runtime gains a needed third posture toward machine cognition:

- not **obedient servant**;
- not **sovereign participant**;
- but **bounded temporary stewardship**.

This lets the system use disposable cognition without manufacturing disposable persons, and preserve receipts without granting residue an identity it never possessed.
