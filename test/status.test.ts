import { expect, test } from 'bun:test';
import { Tracker, type Status } from '../src/status';

type Step = (tracker: Tracker) => void;

test.each<[string, Step[], Status]>([
  ['nothing has happened', [], 'idle'],
  ['a session is busy', [(t) => t.working('a')], 'working'],
  ['a session finished', [(t) => t.working('a'), (t) => t.finished('a')], 'done'],
  ['a run failed and then went idle', [(t) => t.working('a'), (t) => t.failed('a'), (t) => t.finished('a')], 'error'],
  ['a failed session started again', [(t) => t.failed('a'), (t) => t.working('a')], 'working'],
  ['a permission is pending while busy', [(t) => t.working('a'), (t) => t.waiting('p1', 'a')], 'needs-you'],
  [
    'the permission was answered',
    [(t) => t.working('a'), (t) => t.waiting('p1', 'a'), (t) => t.answered('p1')],
    'working',
  ],
  [
    'one of two pending requests was answered',
    [(t) => t.waiting('p1', 'a'), (t) => t.waiting('q1', 'b'), (t) => t.answered('p1')],
    'needs-you',
  ],
  [
    'a session waiting on its user was interrupted',
    [(t) => t.working('a'), (t) => t.waiting('q1', 'a'), (t) => t.finished('a')],
    'done',
  ],
  ['a session waiting on its user failed', [(t) => t.waiting('q1', 'a'), (t) => t.failed('a')], 'error'],
  ['the busy session was deleted', [(t) => t.working('a'), (t) => t.waiting('p1', 'a'), (t) => t.closed('a')], 'idle'],
  ['one session works while another failed', [(t) => t.failed('a'), (t) => t.working('b')], 'working'],
  ['one session failed while another finished', [(t) => t.failed('a'), (t) => t.finished('b')], 'error'],
  ['the same event arrives twice', [(t) => t.working('a'), (t) => t.working('a'), (t) => t.finished('a')], 'done'],
])('when %s, the status is %s', (_, steps, status) => {
  const tracker = new Tracker();
  steps.forEach((step) => step(tracker));
  expect(tracker.status).toBe(status);
});
