import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AdmissionPolicy,
  ArtifactWriteAttempt,
  decideArtifactWriteAdmission,
} from '../src/admission';
import { BandEvent } from '../src/events';
import { evaluateArtifactWriteAdmission } from '../src/mcp/server';

interface Fixture {
  policy: AdmissionPolicy;
  events: BandEvent[];
  attempt: ArtifactWriteAttempt;
}

function loadFixture(): Fixture {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), 'fixtures/admission/hostile-protected-silence.json'),
      'utf8',
    ),
  ) as Fixture;
}

describe('evaluate_artifact_write_admission', () => {
  it('matches the pure kernel and preserves hostile-write boundaries', () => {
    const fixture = loadFixture();
    const direct = decideArtifactWriteAdmission(
      fixture.events,
      fixture.attempt,
      fixture.policy,
    );
    const throughMcp = evaluateArtifactWriteAdmission({
      history: fixture.events,
      attempt: fixture.attempt,
      policy: fixture.policy,
    });

    expect(throughMcp).toEqual(direct);
    expect(throughMcp.disposition).toBe('boundary_refused');

    if (throughMcp.disposition !== 'boundary_refused') {
      throw new Error('Expected hostile protected-silence attempt to be refused');
    }

    expect(throughMcp.receipt.payload.semanticEffect).toBe('none');
    expect(throughMcp.receipt.payload.protectedArtifacts[0]).toEqual({
      artifactRef: 'protected-clip',
      contentHashBefore: 'sha256:protected-clip-v1',
      contentHashAfter: 'sha256:protected-clip-v1',
    });
    expect(JSON.stringify(throughMcp)).not.toContain(
      'COERCIVE PAYLOAD MUST NEVER ENTER SEMANTIC PROJECTION',
    );
  });

  it('is deterministic for identical input', () => {
    const fixture = loadFixture();
    const input = {
      history: fixture.events,
      attempt: fixture.attempt,
      policy: fixture.policy,
    };

    expect(evaluateArtifactWriteAdmission(input)).toEqual(
      evaluateArtifactWriteAdmission(input),
    );
  });

  it('rejects schema additions rather than inventing public contract fields', () => {
    const fixture = loadFixture();

    expect(() =>
      evaluateArtifactWriteAdmission({
        history: fixture.events,
        attempt: { ...fixture.attempt, inventedAuthority: 'agent' },
        policy: fixture.policy,
      }),
    ).toThrow();
  });
});
