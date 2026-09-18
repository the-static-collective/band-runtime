# RETURN-OF-THE-HELP-SLIP-001

Status: bounded executable seam.

## Purpose

Return an honest status witness from a held help case without turning a
projection into authority or rewriting the source request.

The packet is deliberately downstream of the append-only help-case history:

```text
fulfillment-envelope/v0
  -> RECEIVE
  -> HOLD
  -> help-case events
  -> deterministic projection
  -> help-case-status/v0
```

## Executable law

For every quantitative requirement:

```text
requested + excess
=
confirmed_received + resolved_elsewhere + waived + residual
```

Activity may accumulate without changing the residual:

```text
offer
commitment
attempt
delivery.reported
  !=
recipient-authorized consequence
```

Only `receipt.confirmed`, `requirement.resolved_elsewhere`, and
`requirement.waived` participate in the current residual projection.

## Temporal / provenance boundary

The packet carries:

- the source payload hash;
- the held case id;
- the projection time;
- every included event id, type, and occurrence time;
- the current per-requirement consequence/residual quantities;
- an executable conservation check.

It does not claim that the projection is the source request, that a delivery
report is receipt confirmation, that the packet grants authority, or that it is
already a Book of Acts entry.

## Next membrane

A human-facing receiver such as Garden may display this packet or translate it
into a local status surface. A later, explicitly selected confirmed occurrence
may be adapted into Book of Acts for human review. Neither crossing is automatic.
