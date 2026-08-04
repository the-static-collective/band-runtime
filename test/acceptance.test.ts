import { describe, it, expect } from 'vitest';
import { BandRuntime } from '../src/runtime';
import { EventStore } from '../src/store';

describe('Band Runtime First Vertical Slice', () => {
  it('records an encounter, interrupts every participant, restores from event field, and proves the same living thread remains recoverable without treating the restored mix as authority', () => {
    // 1. Initial encounter
    const runtime = new BandRuntime();
    const sessionId = 'encounter-1';

    runtime.dispatch({ id: 'e1', type: 'session.opened', timestamp: 1, payload: { sessionId } });

    // Admit participants
    runtime.dispatch({ id: 'e2', type: 'participant.joined', timestamp: 2, payload: { participantId: 'human-1', role: 'Formation Trace' } });
    runtime.dispatch({ id: 'e3', type: 'participant.joined', timestamp: 3, payload: { participantId: 'agent-1', role: 'Agent' } });
    runtime.dispatch({ id: 'e4', type: 'participant.joined', timestamp: 4, payload: { participantId: 'corpus-1', role: 'Corpus' } });

    // Deposit separable proposal clips
    runtime.dispatch({ id: 'e5', type: 'clip.proposed', timestamp: 5, payload: { participantId: 'human-1', clipId: 'clip-1', mediaType: 'text', content: 'hello' } });
    runtime.dispatch({ id: 'e6', type: 'clip.proposed', timestamp: 6, payload: { participantId: 'agent-1', clipId: 'clip-2', mediaType: 'audio', content: 'wav-data' } });

    // Admit clips (simulate recognition law logic)
    runtime.dispatch({ id: 'e7', type: 'clip.admitted', timestamp: 7, payload: { clipId: 'clip-1' } });
    runtime.dispatch({ id: 'e8', type: 'clip.admitted', timestamp: 8, payload: { clipId: 'clip-2' } });

    // Record recognition outcomes
    runtime.dispatch({ id: 'e9', type: 'recognition.recorded', timestamp: 9, payload: { participantId: 'agent-1', targetId: 'clip-1', outcome: 'rings' } });
    runtime.dispatch({ id: 'e10', type: 'recognition.recorded', timestamp: 10, payload: { participantId: 'corpus-1', targetId: 'clip-1', outcome: 'nearby' } });

    const originalProjection = runtime.getProjection();
    const originalStoreSize = runtime.getStore().getAll().length;

    // 2. Interrupt every participant (Serialize and nuke memory)
    const serializedState = runtime.getStore().serialize();

    // Completely forget original runtime instance
    const emptyRuntime = new BandRuntime();
    expect(emptyRuntime.getStore().getAll().length).toBe(0);

    // 3. Restore from the event field
    const restoredStore = EventStore.deserialize(serializedState);
    const restoredRuntime = new BandRuntime(restoredStore);

    // 4. Verify original projection is unchanged
    const restoredProjection = restoredRuntime.getProjection();

    expect(restoredProjection.sessionId).toBe(originalProjection.sessionId);
    expect(restoredProjection.participants.size).toBe(originalProjection.participants.size);
    expect(restoredProjection.clips.size).toBe(originalProjection.clips.size);
    expect(restoredProjection.recognitions.length).toBe(originalProjection.recognitions.length);

    // Verify specific clip recoverability
    const humanClip = restoredProjection.clips.get('clip-1');
    expect(humanClip).toBeDefined();
    expect(humanClip?.participantId).toBe('human-1');
    expect(humanClip?.status).toBe('admitted');

    const agentClip = restoredProjection.clips.get('clip-2');
    expect(agentClip).toBeDefined();
    expect(agentClip?.participantId).toBe('agent-1');

    // 5. Demonstrate later influence is attributable without altering earlier replay
    // Record more events after restoration
    restoredRuntime.dispatch({ id: 'e11', type: 'recognition.recorded', timestamp: 11, payload: { participantId: 'human-1', targetId: 'clip-2', outcome: 'projection' } });
    restoredRuntime.dispatch({ id: 'e12', type: 'clip.rejected', timestamp: 12, payload: { clipId: 'clip-2', reason: 'Contested' } });

    const finalProjection = restoredRuntime.getProjection();
    expect(finalProjection.recognitions.length).toBe(originalProjection.recognitions.length + 1);
    expect(finalProjection.clips.get('clip-2')?.status).toBe('rejected');

    // Verify causal cut: getting projection AT e10 (before new events) returns exact same state as before
    const causalCutProjection = restoredRuntime.getProjectionAt('e10');
    expect(causalCutProjection.recognitions.length).toBe(originalProjection.recognitions.length);
    expect(causalCutProjection.clips.get('clip-2')?.status).toBe('admitted');

    // Prove stems remain recoverable (not treating a mixed state as authority)
    // The projection stores clips independently, not as a flattened single text/audio state.
    const allClips = Array.from(finalProjection.clips.values());
    const humanStem = allClips.filter(c => c.participantId === 'human-1');
    const agentStem = allClips.filter(c => c.participantId === 'agent-1');

    expect(humanStem.length).toBe(1);
    expect(agentStem.length).toBe(1);
    expect(humanStem[0].content).toBe('hello');
    expect(agentStem[0].content).toBe('wav-data');

    // 6. Demonstrate duplicate delivery/retry is deterministic and idempotent
    restoredRuntime.dispatch({ id: 'e12', type: 'clip.rejected', timestamp: 12, payload: { clipId: 'clip-2', reason: 'Contested' } }); // duplicate
    const idempotentProjection = restoredRuntime.getProjection();
    expect(restoredRuntime.getStore().getAll().length).toBe(12); // e1 through e12
    expect(idempotentProjection.recognitions.length).toBe(finalProjection.recognitions.length);
  });
});
