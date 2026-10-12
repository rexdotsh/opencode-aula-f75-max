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

// OpenCode loads the plugin once per location and every instance sees the same events. One keyboard needs one
// driver, so instances share it; tracking is idempotent, so the same event arriving twice changes nothing.
let shared: { tracker: Tracker; indicator: Indicator; users: number } | undefined;

export default Plugin.define({
  id: 'aula-f75-max',
  setup(ctx) {
    const current = (shared ??= { tracker: new Tracker(), indicator: new Indicator(options(ctx.options)), users: 0 });
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
      shared = undefined;
      await current.indicator.close();
    };
  },
});
