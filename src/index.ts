import { Plugin } from '@opencode/plugin';
import { track } from './events';
import { Indicator, type IndicatorOptions } from './indicator';
import { Tracker } from './status';

function options(raw: Readonly<Record<string, unknown>>): IndicatorOptions {
  const { keys = true, brightness = 5 } = raw;
  if (typeof keys !== 'boolean') throw new TypeError('aula-f75-max: `keys` must be true or false');
  if (!(typeof brightness === 'number' && Number.isInteger(brightness) && brightness >= 0 && brightness <= 5)) {
    throw new RangeError('aula-f75-max: `brightness` must be a whole number from 0 to 5');
  }
  return { keys, brightness };
}

interface Shared {
  tracker: Tracker;
  indicator: Indicator;
  users: number;
}

// OpenCode loads the plugin once per location, each from its own copy of this module, and every instance sees the
// same events. Concurrent drivers interleave packets and the keyboard rejects them, so all copies in the process
// share one driver through a global; tracking is idempotent, so the same event arriving twice changes nothing.
declare global {
  // oxlint-disable-next-line no-var -- a global declaration has to be a var
  var opencodeAulaF75Max: Shared | undefined;
}

export default Plugin.define({
  id: 'aula-f75-max',
  setup(ctx) {
    const current = (globalThis.opencodeAulaF75Max ??= {
      tracker: new Tracker(),
      indicator: new Indicator(options(ctx.options)),
      users: 0,
    });
    current.users++;
    const controller = new AbortController();
    const listening = (async () => {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        track(current.tracker, event);
        current.indicator.show(current.tracker.status);
      }
    })().catch((error: unknown) => {
      if (!controller.signal.aborted) console.error('aula-f75-max: the event stream ended', error);
    });
    return async () => {
      controller.abort();
      await listening;
      if (--current.users > 0) return;
      globalThis.opencodeAulaF75Max = undefined;
      await current.indicator.close();
    };
  },
});
