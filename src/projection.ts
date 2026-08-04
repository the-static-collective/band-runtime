import { BandEvent, RecognitionOutcome } from './events';

export interface Participant {
  id: string;
  role: string;
}

export interface Clip {
  id: string;
  participantId: string;
  mediaType: string;
  content: any;
  status: 'proposed' | 'admitted' | 'rejected';
}

export interface Recognition {
  participantId: string;
  targetId: string; // ID of a clip or another participant's action
  outcome: RecognitionOutcome;
}

export interface ProjectionState {
  sessionId: string | null;
  participants: Map<string, Participant>;
  clips: Map<string, Clip>;
  recognitions: Recognition[];
  isClosed: boolean;
  policy: any | null; // For `projection.policy_declared`
}

export function createEmptyState(): ProjectionState {
  return {
    sessionId: null,
    participants: new Map(),
    clips: new Map(),
    recognitions: [],
    isClosed: false,
    policy: null,
  };
}

export function reduceProjection(events: BandEvent[]): ProjectionState {
  const state = createEmptyState();

  for (const event of events) {
    switch (event.type) {
      case 'session.opened':
        state.sessionId = event.payload.sessionId;
        break;
      case 'participant.joined':
        state.participants.set(event.payload.participantId, {
          id: event.payload.participantId,
          role: event.payload.role,
        });
        break;
      case 'clip.proposed':
        state.clips.set(event.payload.clipId, {
          id: event.payload.clipId,
          participantId: event.payload.participantId,
          mediaType: event.payload.mediaType,
          content: event.payload.content,
          status: 'proposed',
        });
        break;
      case 'clip.admitted': {
        const clip = state.clips.get(event.payload.clipId);
        if (clip) {
          clip.status = 'admitted';
        }
        break;
      }
      case 'clip.rejected': {
        const clip = state.clips.get(event.payload.clipId);
        if (clip) {
          clip.status = 'rejected';
        }
        break;
      }
      case 'recognition.recorded':
        state.recognitions.push({
          participantId: event.payload.participantId,
          targetId: event.payload.targetId,
          outcome: event.payload.outcome,
        });
        break;
      case 'projection.policy_declared':
        state.policy = event.payload.rules;
        break;
      case 'session.closed':
        state.isClosed = true;
        break;
      // Other events are appended to the store, but might not explicitly affect this basic projection
      case 'anticipation.proposed':
      case 'anticipation.contested':
      case 'mix.rendered':
        break;
    }
  }

  return state;
}

// Deep clone for safe retrieval
export function cloneState(state: ProjectionState): ProjectionState {
    return {
        sessionId: state.sessionId,
        participants: new Map(state.participants),
        clips: new Map(state.clips),
        recognitions: [...state.recognitions],
        isClosed: state.isClosed,
        policy: state.policy ? JSON.parse(JSON.stringify(state.policy)) : null
    }
}