import { describe, it, expect } from 'vitest';
import { BandRuntime } from '../src/runtime';
import { EventStore } from '../src/store';
import { BandEvent } from '../src/events';

describe('Band Runtime Hardening', () => {
  const sessionId = 'hardening-session-1';

  it('enforces byte-identical retry vs conflict duplicate ID', () => {
    const store = new EventStore();
    const event: BandEvent = { id: 'e1', type: 'session.opened', timestamp: 1, sessionId, payload: { sessionId } };

    store.append(event);
    expect(store.getAll().length).toBe(1);

    // Byte-identical retry (idempotent no-op)
    store.append(event);
    expect(store.getAll().length).toBe(1);

    // Conflict duplicate ID (same ID, different content)
    const conflictingEvent: BandEvent = { ...event, timestamp: 2 };
    expect(() => store.append(conflictingEvent)).toThrow('EVENT_ID_CONFLICT');
  });

  it('rejects events before session.opened and after session.closed', () => {
    const store = new EventStore();
    const clipEvent: BandEvent = { id: 'e1', type: 'clip.admitted', timestamp: 1, sessionId, payload: { clipId: 'c1' } };

    // Before opened
    expect(() => store.append(clipEvent)).toThrow('EVENT_BEFORE_SESSION_OPENED');

    store.append({ id: 'e0', type: 'session.opened', timestamp: 0, sessionId, payload: { sessionId } });
    store.append(clipEvent); // Success

    // Close session
    store.append({ id: 'e2', type: 'session.closed', timestamp: 2, sessionId, payload: { sessionId } });

    // After closed
    expect(() => store.append({ id: 'e3', type: 'clip.admitted', timestamp: 3, sessionId, payload: { clipId: 'c2' } })).toThrow('EVENT_AFTER_SESSION_CLOSED');
  });

  it('rejects cross-session contamination', () => {
    const store = new EventStore();
    store.append({ id: 'e1', type: 'session.opened', timestamp: 1, sessionId: 'session-A', payload: { sessionId: 'session-A' } });

    expect(() => store.append({ id: 'e2', type: 'participant.joined', timestamp: 2, sessionId: 'session-B', payload: { participantId: 'p1', role: 'r1' } })).toThrow('CROSS_SESSION_CONTAMINATION');
  });

  it('validates deserialization thoroughly (corrupted, unknown type, missing fields)', () => {
    expect(() => EventStore.deserialize('not json')).toThrow('MALFORMED_JSON');
    expect(() => EventStore.deserialize('{"foo": "bar"}')).toThrow('MALFORMED_JSON');

    // Missing envelope
    expect(() => EventStore.deserialize(JSON.stringify([{ type: 'session.opened' }]))).toThrow('MISSING_ENVELOPE_FIELDS');

    // Unknown type
    expect(() => EventStore.deserialize(JSON.stringify([{ id: '1', type: 'magic.event', timestamp: 1, sessionId: 's1' }]))).toThrow('UNKNOWN_EVENT_TYPE');

    // Cross-session in history
    expect(() => EventStore.deserialize(JSON.stringify([
      { id: '1', type: 'session.opened', timestamp: 1, sessionId: 's1', payload: { sessionId: 's1'} },
      { id: '2', type: 'participant.joined', timestamp: 2, sessionId: 's2', payload: { participantId: 'p1', role: 'r' } }
    ]))).toThrow('CROSS_SESSION_CONTAMINATION');

    // Event ID conflict in history
    expect(() => EventStore.deserialize(JSON.stringify([
      { id: '1', type: 'session.opened', timestamp: 1, sessionId: 's1', payload: { sessionId: 's1'} },
      { id: '1', type: 'participant.joined', timestamp: 2, sessionId: 's1', payload: { participantId: 'p1', role: 'r' } }
    ]))).toThrow('EVENT_ID_CONFLICT');

    // Event after session closed in history
    expect(() => EventStore.deserialize(JSON.stringify([
      { id: '1', type: 'session.opened', timestamp: 1, sessionId: 's1', payload: { sessionId: 's1'} },
      { id: '2', type: 'session.closed', timestamp: 2, sessionId: 's1', payload: { sessionId: 's1'} },
      { id: '3', type: 'participant.joined', timestamp: 3, sessionId: 's1', payload: { participantId: 'p1', role: 'r' } }
    ]))).toThrow('EVENT_AFTER_SESSION_CLOSED');

    // Invalid reference in history
    expect(() => EventStore.deserialize(JSON.stringify([
      { id: '1', type: 'session.opened', timestamp: 1, sessionId: 's1', payload: { sessionId: 's1'} },
      { id: '2', type: 'clip.admitted', timestamp: 2, sessionId: 's1', payload: { clipId: 'ghost-clip' } }
    ]))).toThrow('INVALID_REFERENCE');
  });

  it('ensures projection mutation isolation', () => {
    const runtime = new BandRuntime();
    runtime.dispatch({ id: 'e1', type: 'session.opened', timestamp: 1, sessionId, payload: { sessionId } });
    runtime.dispatch({ id: 'e2', type: 'clip.proposed', timestamp: 2, sessionId, payload: { participantId: 'p1', clipId: 'c1', mediaType: 'text', content: 'test' } });

    const proj1 = runtime.getProjection();
    const clip1 = proj1.clips.get('c1');
    expect(clip1).toBeDefined();

    // Mutate the returned projection
    if (clip1) clip1.status = 'rejected'; // Malicious mutation

    // Get a fresh projection and verify it wasn't affected
    const proj2 = runtime.getProjection();
    expect(proj2.clips.get('c1')?.status).toBe('proposed');
  });

  it('survives repeated serialize/deserialize cycles and provides deterministic historical cuts', () => {
    const runtime1 = new BandRuntime();
    runtime1.dispatch({ id: 'e1', type: 'session.opened', timestamp: 1, sessionId, payload: { sessionId } });
    runtime1.dispatch({ id: 'e2', type: 'clip.proposed', timestamp: 2, sessionId, payload: { participantId: 'p1', clipId: 'c1', mediaType: 'text', content: 'test' } });

    const serialized1 = runtime1.getStore().serialize();

    const store2 = EventStore.deserialize(serialized1);
    const runtime2 = new BandRuntime(store2);
    runtime2.dispatch({ id: 'e3', type: 'clip.admitted', timestamp: 3, sessionId, payload: { clipId: 'c1' } });

    const serialized2 = runtime2.getStore().serialize();

    const store3 = EventStore.deserialize(serialized2);
    const runtime3 = new BandRuntime(store3);

    // Validate deterministic sequence alignment
    const events = runtime3.getStore().getAll();
    expect(events.length).toBe(3);
    expect(events[0].sequence).toBe(0);
    expect(events[1].sequence).toBe(1);
    expect(events[2].sequence).toBe(2);

    // Validate historical-cut stability
    const cutAtE2 = runtime3.getProjectionAt('e2');
    expect(cutAtE2.clips.get('c1')?.status).toBe('proposed');

    const cutAtE3 = runtime3.getProjectionAt('e3');
    expect(cutAtE3.clips.get('c1')?.status).toBe('admitted');
  });
});
