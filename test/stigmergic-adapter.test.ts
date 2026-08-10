import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BandEvent } from '../src/events';
import { EventStore } from '../src/store';
import {
  BAND_STIGMERGIC_ADAPTER,
  BAND_STIGMERGIC_POLICY_VERSION,
  adaptCommittedEventsToStigmergicField,
  type FieldChannel,
  type FieldSourceEvent,
  type FieldTrace,
} from '../src/stigmergic-adapter';

const sessionId = 'session-linked-vertical';
const fixturePath = resolve(process.cwd(), 'fixtures/stigmergic-field-v0.1.json');
const fixtureHashPath = resolve(process.cwd(), 'fixtures/stigmergic-field-v0.1.sha256');

type Hash = `sha256:${string}`;

interface AddressedTrace {
  hash: Hash;
  value: FieldTrace;
}

interface FixtureProjection {
  schemaVersion: 'stigmergic-field/v0.1';
  scopeId: string;
  throughSequence: number;
  policyVersion: string;
  adapter: { id: string; version: string };
  authority: 'none';
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
  schemaVersion: 'stigmergic-field/v0.1';
  scopeId: string;
  policyVersion: string;
  adapter: { id: string; version: string };
  sourceEvents: FieldSourceEvent[];
  traces: AddressedTrace[];
  projectionCases: FixtureCase[];
}

function sessionOpened(): BandEvent {
  return {
    id: 'event-1-session-opened',
    type: 'session.opened',
    timestamp: 1,
    sessionId,
    payload: { sessionId },
  };
}

function linkedVerticalStore(): EventStore {
  const store = new EventStore();
  const events: BandEvent[] = [
    sessionOpened(),
    {
      id: 'event-2-participant-a',
      type: 'participant.joined',
      timestamp: 2,
      sessionId,
      payload: { participantId: 'a', role: 'guitar' },
    },
    {
      id: 'event-3-participant-b',
      type: 'participant.joined',
      timestamp: 3,
      sessionId,
      payload: { participantId: 'b', role: 'bass' },
    },
    {
      id: 'event-4-participant-c',
      type: 'participant.joined',
      timestamp: 4,
      sessionId,
      payload: { participantId: 'c', role: 'drums' },
    },
    {
      id: 'event-5-propose-x',
      type: 'clip.proposed',
      timestamp: 5,
      sessionId,
      payload: { participantId: 'a', clipId: 'direction-x', mediaType: 'application/x-direction', content: { direction: 'x' } },
    },
    {
      id: 'event-6-propose-y',
      type: 'clip.proposed',
      timestamp: 6,
      sessionId,
      payload: { participantId: 'a', clipId: 'direction-y', mediaType: 'application/x-direction', content: { direction: 'y' } },
    },
    {
      id: 'event-7-c-rings-y',
      type: 'recognition.recorded',
      timestamp: 7,
      sessionId,
      payload: { participantId: 'c', targetId: 'direction-y', outcome: 'rings' },
    },
    {
      id: 'event-8-b-rings-x',
      type: 'recognition.recorded',
      timestamp: 8,
      sessionId,
      payload: { participantId: 'b', targetId: 'direction-x', outcome: 'rings' },
    },
    {
      id: 'event-9-c-rings-x',
      type: 'recognition.recorded',
      timestamp: 9,
      sessionId,
      payload: { participantId: 'c', targetId: 'direction-x', outcome: 'rings' },
    },
    {
      id: 'event-10-a-rings-x',
      type: 'recognition.recorded',
      timestamp: 10,
      sessionId,
      payload: { participantId: 'a', targetId: 'direction-x', outcome: 'rings' },
    },
    {
      id: 'event-11-reject-x',
      type: 'clip.rejected',
      timestamp: 11,
      sessionId,
      payload: { clipId: 'direction-x', reason: 'saturated' },
    },
    {
      id: 'event-12-b-rings-y',
      type: 'recognition.recorded',
      timestamp: 12,
      sessionId,
      payload: { participantId: 'b', targetId: 'direction-y', outcome: 'rings' },
    },
    {
      id: 'event-13-c-no-x',
      type: 'recognition.recorded',
      timestamp: 13,
      sessionId,
      payload: { participantId: 'c', targetId: 'direction-x', outcome: 'no' },
    },
    {
      id: 'event-14-b-rings-y-again',
      type: 'recognition.recorded',
      timestamp: 14,
      sessionId,
      payload: { participantId: 'b', targetId: 'direction-y', outcome: 'rings' },
    },
  ];

  for (const event of events) store.append(event);
  return store;
}

function loadFixture(): Fixture {
  const parsed: unknown = JSON.parse(readFileSync(fixturePath, 'utf8'));
  if (!parsed || typeof parsed !== 'object') throw new Error('INVALID_STIGMERGIC_FIXTURE');
  const candidate = parsed as Partial<Fixture>;
  if (
    candidate.schemaVersion !== 'stigmergic-field/v0.1'
    || !Array.isArray(candidate.sourceEvents)
    || !Array.isArray(candidate.traces)
    || !Array.isArray(candidate.projectionCases)
  ) {
    throw new Error('INVALID_STIGMERGIC_FIXTURE');
  }
  return candidate as Fixture;
}

describe('stigmergic adapter', () => {
  it('maps zero-based runtime sequence to one-based field sequence', () => {
    const store = new EventStore();
    store.append(sessionOpened());
    store.append({
      id: 'event-2-participant-a',
      type: 'participant.joined',
      timestamp: 2,
      sessionId,
      payload: { participantId: 'a', role: 'guitar' },
    });

    const adapted = adaptCommittedEventsToStigmergicField(store.getAll());
    expect(adapted.adapter).toEqual(BAND_STIGMERGIC_ADAPTER);
    expect(adapted.policyVersion).toBe(BAND_STIGMERGIC_POLICY_VERSION);
    expect(adapted.sourceEvents).toEqual([
      { eventId: 'event-1-session-opened', scopeId: sessionId, sequence: 1 },
      { eventId: 'event-2-participant-a', scopeId: sessionId, sequence: 2 },
    ]);
  });

  it('rejects an uncommitted event', () => {
    expect(() => adaptCommittedEventsToStigmergicField([sessionOpened()])).toThrow('UNCOMMITTED_EVENT');
  });

  it('rejects a forged non-contiguous runtime sequence', () => {
    const committed = linkedVerticalStore().getAll().slice(0, 2);
    const forged = committed.map((event, index) => (
      index === 1 ? { ...event, sequence: 99 } as BandEvent : event
    ));
    expect(() => adaptCommittedEventsToStigmergicField(forged)).toThrow('UNCOMMITTED_EVENT');
  });

  it('matches the frozen TranchNode source envelopes and trace bodies exactly', () => {
    const fixture = loadFixture();
    const adapted = adaptCommittedEventsToStigmergicField(linkedVerticalStore().getAll());

    expect(adapted.schemaVersion).toBe(fixture.schemaVersion);
    expect(adapted.scopeId).toBe(fixture.scopeId);
    expect(adapted.policyVersion).toBe(fixture.policyVersion);
    expect(adapted.adapter).toEqual(fixture.adapter);
    expect(adapted.sourceEvents).toEqual(fixture.sourceEvents);
    expect(adapted.traces).toEqual(fixture.traces.map((item) => item.value));

    expect([...new Set(adapted.traces.map((trace) => trace.channel))]).toEqual([
      'attention',
      'receptivity',
      'saturation',
      'inhibition',
      'tension',
      'return',
    ]);
  });

  it('uses distinct rings witnesses for saturation while repeated witness activity becomes return', () => {
    const adapted = adaptCommittedEventsToStigmergicField(linkedVerticalStore().getAll());
    const saturation = adapted.traces.filter((trace) => trace.channel === 'saturation');
    const returns = adapted.traces.filter((trace) => trace.channel === 'return');

    expect(saturation).toEqual([{
      sourceEventId: 'event-10-a-rings-x',
      sourceSequence: 10,
      scopeId: sessionId,
      subjectRef: 'direction-x',
      channel: 'saturation',
      magnitude: 600,
      decayWindowEvents: 4,
    }]);
    expect(returns).toEqual([{
      sourceEventId: 'event-14-b-rings-y-again',
      sourceSequence: 14,
      scopeId: sessionId,
      subjectRef: 'direction-y',
      channel: 'return',
      magnitude: 300,
      decayWindowEvents: 6,
    }]);
  });

  it('protected silence and refusal-only events emit no field trace', () => {
    const store = new EventStore();
    store.append(sessionOpened());
    store.append({
      id: 'silence-1',
      type: 'protected_silence.declared',
      timestamp: 2,
      sessionId,
      payload: {
        silenceId: 's1',
        participantId: 'a',
        artifactRef: 'artifact-1',
        contentHash: 'same',
        causalCutId: 'cut-1',
      },
    });
    store.append({
      id: 'refusal-1',
      type: 'boundary.refusal_recorded',
      timestamp: 3,
      sessionId,
      payload: {
        attemptId: 'attempt-1',
        actorId: 'b',
        actorLocalSequence: 1,
        boundary: 'protected_silence',
        reason: 'TARGET_PROTECTED_SILENCE',
        causalCutId: 'cut-1',
        policyRef: 'policy',
        policyVersion: '1',
        policyInputHash: 'hash',
        evaluatorVersion: '1',
        attemptedEffect: 'artifact.write',
        targetRefs: ['artifact-1'],
        attemptedArtifact: { artifactRef: 'artifact-2', payloadHash: 'payload' },
        protectedArtifacts: [{ artifactRef: 'artifact-1', contentHashBefore: 'same', contentHashAfter: 'same' }],
        semanticEffect: 'none',
        projectionClassification: 'refusal_only',
        disclosureAudience: ['b'],
        payloadVisibility: 'hash_only',
      },
    });

    expect(adaptCommittedEventsToStigmergicField(store.getAll()).traces).toEqual([]);
  });

  it('ignores timestamps as semantic input', () => {
    const committed = linkedVerticalStore().getAll();
    const shifted = committed.map((event) => ({
      ...event,
      timestamp: event.timestamp + 999_999_999,
    })) as BandEvent[];

    expect(adaptCommittedEventsToStigmergicField(shifted)).toEqual(
      adaptCommittedEventsToStigmergicField(committed),
    );
  });

  it('vendored TranchNode fixture bytes match the pinned canonical address', () => {
    const bytes = readFileSync(fixturePath);
    const expected = readFileSync(fixtureHashPath, 'utf8').trim();
    const actual = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    expect(actual).toBe(expected);
    expect(actual).toBe('sha256:5c05959b4a340e5a7f9f81f69323cf81c8b9fcc0cda852263a96ebcd538bdd97');
  });

  it('every canonical causal cut excludes future evidence', () => {
    const fixture = loadFixture();
    const sourceById = new Map(fixture.sourceEvents.map((source) => [source.eventId, source]));
    const traceByHash = new Map(fixture.traces.map((trace) => [trace.hash, trace]));

    for (const projectionCase of fixture.projectionCases) {
      for (const sourceId of projectionCase.sourceEventIds) {
        const source = sourceById.get(sourceId);
        expect(source, `missing source ${sourceId}`).toBeDefined();
        expect(source!.sequence).toBeLessThanOrEqual(projectionCase.throughSequence);
      }
      for (const traceHash of projectionCase.traceHashes) {
        const trace = traceByHash.get(traceHash);
        expect(trace, `missing trace ${traceHash}`).toBeDefined();
        expect(trace!.value.sourceSequence).toBeLessThanOrEqual(projectionCase.throughSequence);
      }
    }
  });
});
