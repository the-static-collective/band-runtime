# MCP pressure report: first admission tool

## Scope

The first Band Runtime MCP surface exposes only `evaluate_artifact_write_admission` over stdio. The server validates caller-supplied input, invokes `decideArtifactWriteAdmission` directly, and returns the complete decision. It owns no event store and performs no append, projection, indexing, retrieval, payload retention, identity resolution, or room orchestration.

## What the integration pressure revealed

### Inputs a model may try to infer but the runtime requires explicitly

The caller must supply the causal history, attempt identity, session binding, attributed actor, actor-local sequence, causal cut, target artifact reference, payload hash, policy reference and version, policy input hash, evaluator version, and refusal audience. The MCP layer must not repair, default, or invent these values.

### Runtime concepts that need stable public schemas

The first public contract depends on `BandEvent`, `ArtifactWriteAttempt`, `AdmissionPolicy`, and `AdmissionDecision`. In particular, causal cuts, participant attribution, policy identity, refusal residue, protected-artifact proof, semantic effect, projection classification, disclosure audience, and hash-only payload visibility must remain explicit and machine-readable.

### Explanation and recovery

The current `validation_failed` decision provides stable error codes but no field-level issue list. This is sufficient to preserve the boundary, but a future contract revision may add structured validation details so a model can correct malformed input without guessing. Such details should describe missing or invalid fields only; they must not authorize defaults.

### Read-only versus authority-bearing operations

Evaluating admission against supplied facts is read-only. Appending an admitted event, recording a refusal receipt, declaring protected silence, resolving identity, selecting policy, choosing an audience, projecting a room surface, or publishing to retrieval are authority-bearing operations and remain outside this server.

### Project0 boundary

Canonical identity resolution, identity-to-authority binding, and any derivation of actor or policy identity belong in Project0 or another explicit authority source. Band Runtime consumes those references; this MCP server does not manufacture them.

## Result

The MCP server behaves as an instrument cable: it carries a bounded call to the existing kernel and returns the kernel's decision unchanged. It does not become a second runtime.
