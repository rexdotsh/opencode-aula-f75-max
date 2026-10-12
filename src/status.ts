export type Status = 'idle' | 'working' | 'needs-you' | 'done' | 'error';

type SessionState = 'working' | 'done' | 'error';

/** Folds every session into one status. The most urgent wins: needs you, then working, error, done. */
export class Tracker {
  readonly #sessions = new Map<string, SessionState>();
  /** Pending permission requests and question tool calls, by ID, with the session waiting on each. */
  readonly #waiting = new Map<string, string>();

  get status(): Status {
    if (this.#waiting.size > 0) return 'needs-you';
    const states = new Set(this.#sessions.values());
    if (states.has('working')) return 'working';
    if (states.has('error')) return 'error';
    return states.has('done') ? 'done' : 'idle';
  }

  working(session: string): void {
    this.#sessions.set(session, 'working');
  }

  /** The session stopped. A failure reported just before it stays an error. */
  finished(session: string): void {
    if (this.#sessions.get(session) !== 'error') this.#sessions.set(session, 'done');
    this.#release(session);
  }

  failed(session: string): void {
    this.#sessions.set(session, 'error');
    this.#release(session);
  }

  waiting(id: string, session: string): void {
    this.#waiting.set(id, session);
  }

  answered(id: string): void {
    this.#waiting.delete(id);
  }

  closed(session: string): void {
    this.#sessions.delete(session);
    this.#release(session);
  }

  // A session that has stopped cannot still be waiting on its user.
  #release(session: string): void {
    for (const [id, owner] of this.#waiting) if (owner === session) this.#waiting.delete(id);
  }
}
