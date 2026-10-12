import type { Plugin } from '@opencode/plugin';
import type { Tracker } from './status';

export type OpenCodeEvent =
  ReturnType<Plugin.Context['event']['subscribe']> extends AsyncIterable<infer Event> ? Event : never;

// The question tool asks the user to choose; the session waits on it like on a permission.
const QUESTION_TOOL = 'question';

export function track(tracker: Tracker, event: OpenCodeEvent): void {
  switch (event.type) {
    case 'session.status':
      if (event.data.status.type === 'idle') tracker.finished(event.data.sessionID);
      else tracker.working(event.data.sessionID);
      return;
    case 'session.execution.started':
      tracker.working(event.data.sessionID);
      return;
    case 'session.execution.succeeded':
    case 'session.execution.interrupted':
      tracker.finished(event.data.sessionID);
      return;
    case 'session.execution.failed':
      tracker.failed(event.data.sessionID);
      return;
    case 'session.deleted':
      tracker.closed(event.data.sessionID);
      return;
    case 'permission.asked':
      tracker.waiting(event.data.id, event.data.sessionID);
      return;
    case 'permission.replied':
      tracker.answered(event.data.requestID);
      return;
    case 'session.tool.input.started':
      if (event.data.name === QUESTION_TOOL) tracker.waiting(event.data.id, event.data.sessionID);
      return;
    case 'session.tool.success':
    case 'session.tool.failed':
      tracker.answered(event.data.id);
      return;
    default:
  }
}
