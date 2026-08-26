import { describe, expect, it } from 'vitest';
import type {
  BandEvent,
  CaptureRecordedEvent,
  DecisionRecordedEvent,
  DecisionValue,
  HandoffRecordedEvent,
  ReturnRecordedEvent,
} from '../src/events';
import { EventStore } from '../src/store';
import { reduceProjection } from '../src/projection';
import { adaptCommittedEventsToStigmergicField } from '../src/stigmergic-adapter';

describe('CAPTURE-001 human-side witness spine', () => {
  const sessionId = 'capture-001';

  const capture = {
    id: 'C1',
    type: 'capture.recorded',
    timestamp: 1,
    sessionId,
    payload: {
      actorId: 'lu',
      material: { kind: 'text', text: 'line one', sha256: 'aaa' },
      intent: 'keep it spare',
      localObservedAt: '2026-08-25T09:00:00-05:00',
      parentCaptureId: null,
    },
  } satisfies CaptureRecordedEvent;

  const handoff = {
    id: 'H1',
    type: 'handoff.recorded',
    timestamp: 2,
    sessionId,
    payload: {
      actorId: 'lu',
      sourceCaptureIds: ['C1'],
      destination: 'suno',
      outbound: { completeness: 'EXACT', text: 'line one', sha256: 'aaa' },
      delivery: { status: 'DECLARED', evidence: [] },
    },
  } satisfies HandoffRecordedEvent;

  const returned = {
    id: 'R1',
    type: 'return.recorded',
    timestamp: 3,
    sessionId,
    payload: {
      actorId: 'lu',
      provider: 'suno',
      providerArtifactId: 'abc',
      observed: { text: 'returned occurrence' },
      relation: { handoffId: 'H1', status: 'PARTIAL', evidence: ['provider id visible'] },
    },
  } satisfies ReturnRecordedEvent;

  const decision = {
    id: 'D1',
    type: 'decision.recorded',
    timestamp: 4,
    sessionId,
    payload: {
      actorId: 'lu',
      returnId: 'R1',
      decision: 'WRONG',
      note: null,
    },
  } satisfies DecisionRecordedEvent;

  it('exposes four literal witness event types without semantic collapse', () => {
    const events: BandEvent[] = [capture, handoff, returned, decision];
    expect(events.map((event) => event.type)).toEqual([
      'capture.recorded',
      'handoff.recorded',
      'return.recorded',
      'decision.recorded',
    ]);
  });

  it('keeps PARENT out of decision vocabulary', () => {
    const decisions: DecisionValue[] = ['KEEP', 'REFUSE', 'WRONG', 'INTERESTING'];
    expect(decisions).not.toContain('PARENT');
  });

  it('round-trips C → H → R → D without becoming clip or recognition state', () => {
    const store = new EventStore();
    store.append({ id: 'S1', type: 'session.opened', timestamp: 0, sessionId, payload: { sessionId } });
    for (const event of [capture, handoff, returned, decision]) store.append(event);

    const replayed = EventStore.deserialize(store.serialize()).getAll();
    expect(replayed.slice(1).map((event) => event.type)).toEqual([
      'capture.recorded',
      'handoff.recorded',
      'return.recorded',
      'decision.recorded',
    ]);

    const projection = reduceProjection(replayed);
    expect(projection.clips.size).toBe(0);
    expect(projection.recognitions).toEqual([]);
  });

  it('permits capture without handoff and return with an unresolved edge', () => {
    const store = new EventStore();
    store.append({ id: 'S1', type: 'session.opened', timestamp: 0, sessionId, payload: { sessionId } });
    store.append(capture);
    store.append({
      id: 'R-unresolved',
      type: 'return.recorded',
      timestamp: 2,
      sessionId,
      payload: {
        actorId: 'lu',
        provider: 'suno',
        providerArtifactId: null,
        observed: {},
        relation: { handoffId: null, status: 'UNRESOLVED', evidence: [] },
      },
    });

    expect(() => EventStore.deserialize(store.serialize())).not.toThrow();
  });

  it('rejects malformed witness receipts during replay', () => {
    const base = { id: 'S1', type: 'session.opened', timestamp: 0, sessionId: 's', payload: { sessionId: 's' } };
    const invalid = (event: unknown) => JSON.stringify([base, event]);

    expect(() => EventStore.deserialize(invalid({
      id: 'D1', type: 'decision.recorded', timestamp: 1, sessionId: 's',
      payload: { actorId: 'lu', returnId: 'R1', decision: 'PARENT', note: null },
    }))).toThrow('INVALID_WITNESS_RECEIPT');

    expect(() => EventStore.deserialize(invalid({
      id: 'R1', type: 'return.recorded', timestamp: 1, sessionId: 's',
      payload: {
        actorId: 'lu', provider: 'suno', providerArtifactId: null, observed: {},
        relation: { handoffId: null, status: 'WITNESSED', evidence: [] },
      },
    }))).toThrow('INVALID_WITNESS_RECEIPT');

    expect(() => EventStore.deserialize(invalid({
      id: 'R2', type: 'return.recorded', timestamp: 1, sessionId: 's',
      payload: {
        actorId: 'lu', provider: 'suno', providerArtifactId: null, observed: {},
        relation: { handoffId: 'H1', status: 'REFUTED', evidence: [], reason: 'wrong edge' },
      },
    }))).toThrow('INVALID_WITNESS_RECEIPT');
  });

  it('produces zero stigmergic traces for all four witness occurrences', () => {
    const events: BandEvent[] = [
      { id: 'S1', type: 'session.opened', timestamp: 0, sessionId, sequence: 0, payload: { sessionId } },
      { ...capture, sequence: 1 },
      { ...handoff, sequence: 2 },
      { ...returned, sequence: 3 },
      { ...decision, sequence: 4 },
    ];

    const adapted = adaptCommittedEventsToStigmergicField(events);
    expect(adapted.sourceEvents).toHaveLength(5);
    expect(adapted.traces).toEqual([]);
  });
});
