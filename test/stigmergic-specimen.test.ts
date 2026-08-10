import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BandEvent } from '../src/events';
import { EventStore } from '../src/store';
import {
  adaptCommittedEventsToStigmergicField,
  type FieldChannel,
} from '../src/stigmergic-adapter';

const sessionId = 'session-linked-vertical';
const fixturePath = resolve(process.cwd(), 'fixtures/stigmergic-field-v0.1.json');

type Hash = `sha256:${string}`;

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
  expectedProjection: FixtureProjection;
}

interface Fixture {
  projectionCases: FixtureCase[];
}

type Cell = FixtureProjection['cells'][number];

function linkedVerticalEvents(): BandEvent[] {
  return [
    {
      id: 'event-1-session-opened',
      type: 'session.opened',
      timestamp: 1,
      sessionId,
      payload: { sessionId },
    },
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
}

function committedLinkedVerticalStore(): EventStore {
  const store = new EventStore();
  for (const event of linkedVerticalEvents()) store.append(event);
  return store;
}

function loadFixture(): Fixture {
  const parsed: unknown = JSON.parse(readFileSync(fixturePath, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as Fixture).projectionCases)) {
    throw new Error('INVALID_STIGMERGIC_FIXTURE');
  }
  return parsed as Fixture;
}

function projectionAt(cut: number): FixtureProjection {
  const matches = loadFixture().projectionCases.filter((entry) => entry.throughSequence === cut);
  if (matches.length !== 1) throw new Error(`EXPECTED_ONE_PROJECTION_AT_${cut}`);
  return matches[0].expectedProjection;
}

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
    throw new Error('CENTRAL_ASSIGNMENT_PRESENT');
  }
}

describe('coordinatorless stigmergic specimen', () => {
  it('anti-cheat rejects an inserted assignment-shaped record', () => {
    expect(() => assertNoCentralAssignment(linkedVerticalEvents())).not.toThrow();
    expect(() => assertNoCentralAssignment([
      ...linkedVerticalEvents(),
      { type: 'participant.assigned', payload: { participantId: 'b', subjectRef: 'direction-y' } },
    ])).toThrow('CENTRAL_ASSIGNMENT_PRESENT');
  });

  it('shared inhibition flips local preference from X to Y without assignment', () => {
    expect(chooseRecruitmentSubject(projectionAt(10).cells)).toBe('direction-x');
    expect(chooseRecruitmentSubject(projectionAt(11).cells)).toBe('direction-y');

    const events = linkedVerticalEvents();
    assertNoCentralAssignment(events);
    expect(events[11]?.id).toBe('event-12-b-rings-y');
    expect(events[11]?.type).toBe('recognition.recorded');
  });

  it('cannot claim stigmergic coordination with field visibility removed', () => {
    expect(chooseRecruitmentSubject([])).toBeNull();
  });

  it('retains attributable return and tension evidence at cut 14', () => {
    const projection = projectionAt(14);
    const returnCell = projection.cells.find(
      (cell) => cell.subjectRef === 'direction-y' && cell.channel === 'return',
    );
    const tensionCell = projection.cells.find(
      (cell) => cell.subjectRef === 'direction-x' && cell.channel === 'tension',
    );

    expect(returnCell?.contributions.map((item) => item.sourceEventId)).toContain(
      'event-14-b-rings-y-again',
    );
    expect(tensionCell?.contributions.map((item) => item.sourceEventId)).toContain(
      'event-13-c-no-x',
    );

    for (const cut of [10, 11, 12, 14]) {
      const item = projectionAt(cut);
      expect(item.authority).toBe('none');
      expect(item.fingerprint.startsWith('sha256:')).toBe(true);
    }
  });

  it('replay reproduces the same Band Runtime adaptation', () => {
    const store = committedLinkedVerticalStore();
    const before = adaptCommittedEventsToStigmergicField(store.getAll());
    const replay = EventStore.deserialize(store.serialize());
    const after = adaptCommittedEventsToStigmergicField(replay.getAll());

    expect(after).toEqual(before);
  });
});
