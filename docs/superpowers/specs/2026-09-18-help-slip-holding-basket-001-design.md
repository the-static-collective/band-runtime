# HELP-SLIP-HOLDING-BASKET-001 — One Request Survives a Handoff

**Status:** approved design direction / written-spec review gate  
**Date:** 2026-09-18  
**Owner-local repository:** Band Runtime  
**Upstream architecture:** ADR 0002 — RECEIVE → HOLD → POUR  
**Foreign producer specimen:** Nourish-Kids `fulfillment-envelope/v0`

## 1. Purpose

Prove one concrete cross-organ claim:

> A help request can cross from a producer into a receiving node, remain immutable as received evidence, accumulate local fulfillment history, and reconstruct an honest residual without rewriting the original request or manufacturing completion.

This is not yet a public mutual-aid network, community platform, account system, routing fabric, prioritization system, or generalized human-needs ontology.

The first executable specimen is intentionally narrow:

```text
NOURISH HELP SLIP
      |
      | copy / paste JSON
      v
BAND RUNTIME IN DOOR
      |
   RECEIVE
      |
  LOCAL ADMISSION
      |
    HOLD
      |
 APPEND-ONLY EVENTS
      |
  LOCAL PROJECTION
      |
   RESIDUAL
```

## 2. Governing Laws

The original request does not become its history.

```text
REQUEST != HISTORY
REQUEST != OFFER
REQUEST != COMMITMENT
REQUEST != ATTEMPT
REQUEST != REPORT
REQUEST != CONFIRMATION
REQUEST != RESIDUAL
```

Fulfillment transitions remain distinct:

```text
HELP EXISTS
  != HELP OFFERED
  != HELP COMMITTED
  != HELP ATTEMPTED
  != HELP REPORTED
  != HELP RECEIVED
```

The node boundary remains:

```text
RECEIVE != ADMIT
HOLD != OWN
POUR != AUTHORIZE
```

And the operational completion rule is:

> Reality, as locally witnessed by the request owner or authorized recipient scope, determines when the confirmed residual reaches zero.

## 3. Jurisdiction

### Nourish-Kids owns

- creation of `fulfillment-envelope/v0`;
- source-side requirement evaluation;
- source-side privacy projection;
- what the requester chooses to disclose;
- the immutable payload that crossed the source boundary.

Band Runtime does not mutate the imported Nourish object.

### Band Runtime owns

- arrival occurrence;
- import/admission result;
- local held-case identity;
- append-only fulfillment events;
- replay;
- local residual projection;
- duplicate-import observation;
- local refusal/quarantine residue.

### NanaSpork / Garden is the preferred existing product embodiment

Current NanaSpork repository documentation already assigns:

- **NanaSpork** — Android field instrument;
- **Garden** — humane home and navigation projection;
- **Campfire** — household/community scope;
- **BananaGram** — portable participation envelope;
- **Jubilee** — authority, lineage, and durable-memory kernel.

Its shared need lifecycle already supports:

```text
open need
  -> pledge
  -> accept or decline
  -> report
  -> confirm
  -> close
```

That makes NanaSpork/Garden the strongest existing candidate for the human-facing community desk.

The intended jurisdiction split is therefore:

```text
Band Runtime
  = receive / hold / replay / residual semantics

NanaSpork / Garden
  = human-facing desk / Campfire participation surface
```

The first Band Runtime proof still does not add a browser framework.

### Groove Rooms

Groove Rooms remains the inhabitable collaboration-room embodiment of Band Runtime for room/media workflows. It is not the preferred community-help desk for this specimen.

### TranchNode remains owner of

- durable cross-runtime continuity and addressability when explicitly invoked;
- resumable history beyond this runtime-local witness;
- staged responsibility-transfer semantics.

No TranchNode dependency is required for this first local proof.

## 4. Imported Help Slip

The receiver accepts a bounded foreign carrier compatible with the current Nourish shape:

```ts
interface ImportedFulfillmentEnvelopeV0 {
  schema: "fulfillment-envelope/v0";
  envelopeId: string;
  purpose: string;
  createdAt: string;
  requirements: Array<{
    id: string;
    kind: string;
    description: string;
    quantity?: number;
    unit?: string;
    neededBy?: string;
  }>;
  source: {
    system: string;
    recipeId?: string;
  };
  disclosure: {
    includesOnlySelectedResiduals: true;
    omittedPrivateContext: true;
  };
  status: "unmet";
}
```

Admission is structural and version-bounded.

The receiver must not infer:

- that the requester still needs the item now;
- that the source data is morally or factually trustworthy;
- that a matching local resource exists;
- that import authorizes anyone to act;
- that `purpose` or `source.recipeId` may be republished;
- that `status: "unmet"` remains current after local history accumulates.

## 5. Immutable Source Receipt

On receive, Band Runtime stores the exact imported bytes or their canonical exact-content representation plus an integrity hash.

Conceptual record:

```ts
interface ReceivedHelpSlip {
  caseId?: string;
  occurrenceId: string;
  receivedAt: string;
  carrier: "pasted_json";
  carrierHash: string;
  payloadHash?: string;
  payload?: ImportedFulfillmentEnvelopeV0;
  admission:
    | "admitted"
    | "refused"
    | "quarantined";
}
```

The imported `payload` is immutable.

Later fulfillment history references `caseId` and requirement IDs. It never edits the payload.

## 6. Duplicate Import Semantics

Duplicate detection is observational, not destructive.

V0 keeps two distinct hashes:

- `carrierHash`: SHA-256 of the exact UTF-8 text received at the in door;
- `payloadHash`: SHA-256 of a deterministic schema-order JSON serialization of the validated payload.

The schema-order serialization writes object fields in the order declared by the v0 import contract and preserves requirement-array order. It does not sort requirements, normalize units, rewrite numbers, or drop optional fields that were present.

This lets the node distinguish:

```text
SAME MEANINGFUL V0 PAYLOAD + DIFFERENT WHITESPACE
from
EXACT SAME CARRIER BYTES
```

For each receive occurrence:

1. hash the raw carrier text as `carrierHash`;
2. parse and validate the v0 payload;
3. serialize the validated payload using the repository-defined schema-order serializer;
4. hash that serialization as `payloadHash`;
5. compare `payloadHash` with prior admitted slips;
6. retain the new receive occurrence regardless of whether either hash was seen before;
7. expose duplicate relationships when applicable.

```text
SAME PAYLOAD
+
TWO ARRIVALS
=
ONE OBJECT SHAPE
+
TWO RECEIVE OCCURRENCES
```

No duplicate import silently merges histories.

No duplicate import silently creates a second active case unless a local admission operation explicitly does so.

V0 default:

- first admitted payload creates the held case;
- later identical payload arrivals point to that case as repeated receive occurrences.

## 7. Local Held Case

An admitted request creates a receiver-local case:

```ts
interface HeldHelpCase {
  caseId: string;
  sourceOccurrenceId: string;
  sourceEnvelopeId: string;
  sourcePayloadHash: string;
  admittedAt: string;
}
```

The held case does not own the request.

It provides a local anchor for runtime events and projections.

```text
HELD CASE != SOURCE REQUEST
HELD CASE != REQUESTER IDENTITY
HELD CASE != GLOBAL CASE
```

## 8. Append-Only Fulfillment Events

The v0 help-case event vocabulary is implemented as a dedicated Band Runtime submodule. It does **not** extend the existing global `BandEvent` union or general semantic projection. This prevents community-help lifecycle semantics from silently entering media/session projection, retrieval, or stigmergic adaptation merely because they share a repository.

```text
HELP-CASE EVENT
!=
GLOBAL BAND EVENT
```

### 8.0 Authority limitation

V0 does not authenticate human identity.

For events whose consequence depends on recipient/request-owner authority—`ReceiptConfirmed`, `RequirementResolvedElsewhere`, and `RequirementWaived`—the runtime records a declared local authority basis such as:

```ts
authorityBasis: "local_operator_declared_recipient_scope";
```

This means only:

> the local operator invoked the recipient-authority event path.

It does not prove that the operator is in fact the requester or recipient.

```text
DECLARED RECIPIENT SCOPE != VERIFIED IDENTITY
EVENT CLASS != GLOBAL AUTHORITY
```

Identity/authentication is explicitly outside v0.

V0 event kinds:

```ts
type HelpCaseEvent =
  | OfferRecorded
  | CommitmentRecorded
  | CommitmentWithdrawn
  | AttemptRecorded
  | DeliveryReported
  | ReceiptConfirmed
  | RequirementResolvedElsewhere
  | RequirementWaived
  | CaseNoteRecorded;
```

Every event includes:

```ts
interface HelpCaseEventBase {
  eventId: string;
  caseId: string;
  requirementId: string;
  occurredAt: string;
  actorRef?: string;
  authorityBasis?: "local_operator_declared_recipient_scope";
  quantity?: number;
  unit?: string;
  note?: string;
}

interface CommitmentWithdrawn extends HelpCaseEventBase {
  type: "commitment.withdrawn";
  commitmentEventId: string;
}
```

The event store is append-only.

Corrections are new events. Existing events are not edited or deleted.

### 8.1 OfferRecorded

A helper declares possible capacity.

```text
OFFER != COMMITMENT
OFFER != DELIVERY
OFFER != RECEIPT
```

Offers do not reduce confirmed residual.

### 8.2 CommitmentRecorded

A helper explicitly commits some amount.

```text
COMMITTED != RECEIVED
```

Commitments may affect a separate promised projection but do not reduce confirmed residual.

### 8.3 CommitmentWithdrawn

A previously recorded commitment is withdrawn by explicit reference to its `commitmentEventId`.

V0 withdrawal is whole-commitment withdrawal. Partial commitment reduction is intentionally excluded.

Withdrawal does not erase the commitment event.

It changes later projections.

A withdrawal that references no prior commitment in the same case/requirement is invalid.

### 8.4 AttemptRecorded

An actor records that an attempt was made.

Attempts do not reduce confirmed residual.

### 8.5 DeliveryReported

A helper or desk records claimed delivery.

```text
REPORTED DELIVERY != CONFIRMED RECEIPT
```

Reported delivery does not reduce confirmed residual.

### 8.6 ReceiptConfirmed

The recipient-side authority confirms a received quantity.

Only confirmed receipt may reduce residual as fulfilled-by-help.

V0 residual arithmetic does not assign helper credit from confirmation alone. Helper-specific attribution remains a separate interpretation of linked event history and is not used to decide whether the requirement is closed.

### 8.7 RequirementResolvedElsewhere

The recipient records that some or all of the requirement was resolved outside this case's helper path.

This reduces residual while preserving that the resolution did not come from the recorded helper fulfillment chain.

### 8.8 RequirementWaived

The request owner or authorized local scope declares that a requirement is no longer requested.

Waiver closes that requested amount without claiming it was received.

```text
WAIVED != FULFILLED
```

## 9. Quantity and Unit Rules

V0 performs no silent unit conversion.

For a quantity-bearing source requirement, a fulfillment event may affect residual only when its unit exactly matches the source unit.

Unit mismatch yields a projection warning and no quantitative decrement.

For requirements without a source quantity, V0 does not invent numeric arithmetic. They remain qualitative and require explicit whole-requirement resolution events.

Negative quantities, NaN, Infinity, and zero-value fulfillment events are refused.

## 10. Residual Projection

For one quantitative requirement:

```text
requested
-
confirmed receipt
-
resolved elsewhere
-
waived amount
=
confirmed residual
```

All decrements are capped so the projection never produces a negative residual.

Over-confirmation remains visible as an excess event/warning rather than being silently lost.

Separate projections may expose:

- offered quantity;
- actively committed quantity;
- reported-delivery quantity;
- confirmed-received quantity;
- resolved-elsewhere quantity;
- waived quantity;
- confirmed residual.

These are not collapsed into one "progress" score.

## 11. Worked Specimen

Source request:

```text
Requirement: canned tomatoes
Requested: 4 cans
```

Local history:

```text
Alice offers 2
Alice commits 2
Bob commits 2
Alice reports 2 delivered
recipient confirms 2 received
Bob withdraws
recipient obtains 2 elsewhere
```

Required projection:

```text
requested:             4
offered:               2
active committed:      0
reported delivered:    2
confirmed received:    2
resolved elsewhere:    2
waived:                 0
confirmed residual:     0
```

The case may be locally resolved with:

```text
resolution:
  confirmed_help: 2
  resolved_elsewhere: 2
```

It must not claim:

```text
Bob fulfilled 2
helpers fulfilled 4
all committed help arrived
```

## 12. Reopen / Replay Law

The first end-to-end proof must survive process restart.

Given:

- the original immutable imported slip;
- append-only receive/admission records;
- append-only help-case events;

replay must reconstruct the same:

- held-case identity;
- source payload hash;
- event history;
- active commitments;
- reported deliveries;
- confirmed receipts;
- resolved-elsewhere amounts;
- waivers;
- residual.

No in-memory-only truth is sufficient for the proof.

## 13. Local Persistence Boundary

V0 may use a repository-local append-only JSONL ledger for the executable specimen.

Example conceptual layout:

```text
.runtime/help-cases/
  receives.jsonl
  events.jsonl
```

This storage is:

- local only;
- experimental;
- not a global database;
- not a TranchNode substitute;
- not a network synchronization protocol.

Tests must use temporary directories.

The repository must not commit runtime request data.

## 14. Admission

The in door performs explicit import admission.

Refuse at minimum:

- invalid JSON;
- unknown schema/version;
- missing envelope ID;
- zero requirements;
- malformed requirement;
- unsupported source status;
- invalid disclosure flags;
- quantity without unit;
- non-positive quantity.

Refusal itself gets a receive/admission receipt when enough carrier material exists to identify the occurrence.

A refused payload never creates a held case.

## 15. Disclosure Boundary

Band Runtime receives exactly what is pasted.

It does not ask Nourish for additional pantry, household, budget, identity, location, or recipe data.

Imported optional source fields remain foreign data.

Any future `POUR` must require a separately explicit local projection; holding a field does not automatically authorize re-sharing it.

This is especially important for:

- `purpose`;
- `source.recipeId`;
- `neededBy`;
- any future identity/location extension.

## 16. HINGE / Dogram Compatibility Frontier

The help-case lifecycle provides a future non-toy mapping-delta specimen.

Example:

```text
before:
DeliveryReported -> reported

after:
DeliveryReported -> complete
```

Such a mapping change may alter operational consequence.

A future adapter/release gate may:

1. encode the relevant before/after mapping;
2. ask ALEX HINGE to expose added/removed/retargeted mapping;
3. ask Dogram to recompute the exact delta;
4. leave accept/reject authority with the local operator.

V0 does not depend on ALEX or Dogram at runtime.

```text
HINGE FLAG != REJECTION
DOGRAM AGREEMENT != AUTHORIZATION
```

## 17. NanaSpork / Garden Embodiment Frontier

The preferred existing product surface is NanaSpork's Garden.

A later adapter may render:

```text
New request — not yet accepted
Clarification needed
Someone offered help
Someone committed
Delivery reported
Receipt confirmed
Partially received — remainder still open
Resolved elsewhere
Waived
```

Band Runtime V0 supplies the receive/hold/history/residual semantics and projection only.

NanaSpork/Garden may present those semantics alongside its existing Campfire need lifecycle, but the adapter must preserve the distinctions in this spec rather than collapsing Band Runtime events into its existing states by label resemblance alone.

In particular:

```text
DeliveryReported
must not silently map to
confirmed fulfillment / closed
```

Any adapter must explicitly document its mapping from Band Runtime help-case events into NanaSpork/Jubilee/Campfire operations.

Band Runtime does not choose colors, urgency, ordering, social priority, notification policy, or who deserves attention.

## 18. Nourish Print / Readable Card Frontier

Before a public paper handoff, Nourish should add a dedicated human-readable Help Slip surface and print privacy rules.

Required later boundary:

- only the chosen handoff card is printable;
- pantry declaration controls are hidden in print;
- AI sections are hidden in print;
- budget/navigation/private surrounding state is hidden;
- recipe title and recipe ID disclosure are visibly intentional;
- source provenance may remain locally retained even if omitted from outward display.

This is a separate bounded Nourish follow-up and is not required for the Band Runtime kernel proof.

## 19. Hostile Cases

### H1 — helper report launders completion

Input:

```text
DeliveryReported(quantity=2)
```

Invalid:

```text
confirmed residual -= 2
```

Required:

```text
reported delivered += 2
confirmed residual unchanged
```

### H2 — overlapping promises

Two helpers each commit the entire request.

Required:

- active committed amount may exceed requested amount;
- confirmed residual remains based only on confirmation/resolution/waiver;
- no silent allocation winner is chosen.

### H3 — duplicate import

Same exact slip pasted twice.

Required:

- two receive occurrences;
- one default held case;
- duplicate relationship visible;
- no duplicated requirement demand.

### H4 — withdrawal after report

A helper commits, reports delivery, then withdraws.

Required:

- history preserves all events;
- withdrawal affects active commitment only;
- reported delivery remains a historical report;
- confirmed receipt remains whatever the recipient confirmed.

### H5 — over-confirmation

Source requests 4 cans; confirmations total 5.

Required:

- residual floors at 0;
- projection exposes 1-can excess/over-confirmation warning;
- source request is not rewritten to 5.

### H6 — obtained elsewhere

Request remains open; recipient obtains the item independently.

Required:

- `RequirementResolvedElsewhere` reduces residual;
- helper events remain unchanged;
- no helper is credited for the externally resolved amount.

### H7 — replay drift

Same ledger replayed twice.

Required:

- byte-equivalent or structurally exact deterministic projection;
- same case/source linkage;
- same residual.

### H8 — imported disclosure laundering

A held source field exists in the payload.

Invalid:

```text
HELD -> SAFE TO RE-SHARE
```

Required:

```text
HELD
+
FUTURE POUR STILL REQUIRES EXPLICIT PROJECTION
```

## 20. First Executable Acceptance Specimen

The minimum successful run:

1. accept one valid Nourish `fulfillment-envelope/v0` by pasted JSON;
2. preserve its exact canonical payload hash;
3. create one local held case;
4. import the exact same payload again and record a second receive occurrence without creating duplicate demand;
5. record a commitment for two units;
6. record delivery reported for two units;
7. verify residual is still the original requested quantity;
8. record recipient confirmation for one unit;
9. verify residual decreases by exactly one;
10. terminate the process;
11. reload from the append-only local ledger;
12. verify the original carrier and payload hashes are unchanged;
13. verify history reconstructs identically;
14. verify the residual remains exactly one unit lower than the original;
15. record the remaining amount as resolved elsewhere;
16. verify residual reaches zero without crediting the helper for that amount.

### Acceptance statement

> One immutable help request can be received twice, held once, accumulate distinguishable commitment/report/confirmation history, survive restart, and reach zero residual through mixed confirmed help and outside resolution without rewriting the source request or inventing fulfillment.

## 21. Explicit Non-Goals

V0 does not include:

- browser UI inside Band Runtime;
- QR codes;
- accounts;
- authentication;
- public networking;
- automatic forwarding;
- peer discovery;
- helper matching;
- prioritization;
- urgency scoring;
- deservingness scoring;
- reputation;
- money;
- cryptocurrency;
- automatic purchasing;
- geographic routing;
- service-directory lookup;
- Campfire integration;
- TranchNode integration;
- ALEX runtime dependency;
- Dogram runtime dependency;
- schema generalization beyond the imported Nourish v0 specimen.

## 22. Promotion Boundary

A green executable specimen proves only:

> Band Runtime can locally receive an immutable Nourish help slip, admit it into one held case, append attributed fulfillment-history events, and deterministically project an honest residual across restart.

It does not prove:

- the request is true;
- help is available;
- anyone should accept it;
- a helper actually performed an unconfirmed report;
- the community has enough capacity;
- the design generalizes beyond this bounded specimen;
- the protocol is a Collective-wide standard.

## 23. Follow-On Order

Only after this specimen is green:

1. add the dedicated human-readable/print-safe Nourish Help Slip;
2. design the NanaSpork/Garden adapter against its existing Campfire/Jubilee lifecycle;
3. add the Help Slip import/holding-desk embodiment there;
4. run one trusted-circle real-world handoff;
5. inspect lifecycle mapping changes with HINGE/Dogram;
6. only after witnessed crossings consider BODY interface declaration.

The order preserves the central law:

```text
REQUEST
  -> RECEIVE
  -> HOLD
  -> EVENTS
  -> CONFIRMATION
  -> RESIDUAL

NOT

REQUEST
  -> MATCH
  -> ASSUME SUCCESS
```
