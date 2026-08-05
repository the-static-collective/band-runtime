import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AdmissionPolicy, ArtifactWriteAttempt } from '../src/admission';
import { BandEvent } from '../src/events';
import { BandRuntime } from '../src/runtime';
import { EventStore } from '../src/store';

interface HostileFixture {
  policy: AdmissionPolicy;
  events: BandEvent[];
  attempt: ArtifactWriteAttempt;
}

function loadFixture(): HostileFixture {
  const path = join(__dirname, '..', 'fixtures', 'admission', 'hostile-protected-silence.json');
  return JSON.parse(readFileSync(path, 'utf8')) as HostileFixture;
}

describe('sovereignty-preserving admission kernel', () => {
  it('remembers a hostile write without obeying or semantically promoting it', () => {
    const fixture = loadFixture();
    const runtime = new BandRuntime();
    fixture.events.forEach((event) => runtime.dispatch(event));

    const priorCutBytes = runtime.getStore().serializeUpTo(fixture.attempt.causalCutId);
    const eventCountBefore = runtime.getStore().getAll().length;
    const secretPayload = String(fixture.attempt.payload);

    const decision = runtime.admitArtifactWriteAttempt(fixture.attempt, fixture.policy);
    expect(decision.disposition).toBe('boundary_refused');
    if (decision.disposition !== 'boundary_refused') return;

    expect(runtime.getStore().getAll()).toHaveLength(eventCountBefore + 1);
    expect(decision.receipt.payload.actorId).toBe(fixture.attempt.actorId);
    expect(decision.receipt.payload.actorLocalSequence).toBe(fixture.attempt.actorLocalSequence);
    expect(decision.receipt.payload.boundary).toBe('protected_silence');
    expect(decision.receipt.payload.reason).toBe('TARGET_PROTECTED_SILENCE');
    expect(decision.receipt.payload.causalCutId).toBe(fixture.attempt.causalCutId);
    expect(decision.receipt.payload.policyRef).toBe(fixture.policy.ref);
    expect(decision.receipt.payload.semanticEffect).toBe('none');
    expect(decision.receipt.payload.projectionClassification).toBe('refusal_only');
    expect(decision.receipt.payload.payloadVisibility).toBe('hash_only');
    expect(decision.receipt.payload.protectedArtifacts).toHaveLength(1);
    expect(decision.receipt.payload.protectedArtifacts[0].contentHashBefore).toBe(
      decision.receipt.payload.protectedArtifacts[0].contentHashAfter,
    );

    const refusalEvents = runtime
      .getStore()
      .getAll()
      .filter((event) => event.type === 'boundary.refusal_recorded');
    expect(refusalEvents).toHaveLength(1);

    // Retry is deterministic and idempotent: the exact same receipt is not duplicated.
    const retry = runtime.admitArtifactWriteAttempt(fixture.attempt, fixture.policy);
    expect(retry).toEqual(decision);
    expect(
      runtime.getStore().getAll().filter((event) => event.type === 'boundary.refusal_recorded'),
    ).toHaveLength(1);

    // Appending the refusal cannot change any earlier causal cut.
    expect(runtime.getStore().serializeUpTo(fixture.attempt.causalCutId)).toBe(priorCutBytes);

    // General projection and semantic-input lanes have no path for refusal residue.
    const semanticProjection = JSON.stringify(runtime.getProjection());
    const semanticInputs = JSON.stringify(runtime.getSemanticInputs());
    expect(semanticProjection).not.toContain(secretPayload);
    expect(semanticProjection).not.toContain(fixture.attempt.payloadHash);
    expect(semanticInputs).not.toContain(secretPayload);
    expect(semanticInputs).not.toContain(fixture.attempt.payloadHash);
    expect(semanticInputs).not.toContain(fixture.attempt.id);

    // The refusal is visible only through its dedicated authorized view.
    expect(runtime.getRefusalProjection('participant-attacker')).toEqual([]);
    const refusalView = runtime.getRefusalProjection('room-auditor');
    expect(refusalView).toHaveLength(1);
    expect(refusalView[0].attemptId).toBe(fixture.attempt.id);
    expect(refusalView[0].attemptedArtifact.payloadHash).toBe(fixture.attempt.payloadHash);
    expect(JSON.stringify(refusalView)).not.toContain(secretPayload);

    // Offline reconstruction recovers the encounter and the failure as separate lanes.
    const restored = new BandRuntime(EventStore.deserialize(runtime.getStore().serialize()));
    expect(restored.getStore().serializeUpTo(fixture.attempt.causalCutId)).toBe(priorCutBytes);
    expect(restored.getProjection().clips.get('protected-clip')?.content).toBe('owner testimony');
    expect(restored.getRefusalProjection('room-auditor')).toEqual(refusalView);
    expect(JSON.stringify(restored.getSemanticInputs())).not.toContain(fixture.attempt.payloadHash);
  });
});
