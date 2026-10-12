import { Plugin } from '@opencode/plugin';
import { track } from './events';
import { Indicator } from './indicator';
import { options } from './options';
import { Tracker } from './status';

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
    void (async () => {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        if (controller.signal.aborted) return;
        track(current.tracker, event);
        current.indicator.show(current.tracker.status);
      }
    })().catch((error: unknown) => {
      if (!controller.signal.aborted) console.error('aula-f75-max: the event stream ended', error);
    });
    // An aborted stream does not always end, so cleanup never waits for it: the driver must be released for reloads.
    return async () => {
      controller.abort();
      if (--current.users > 0) return;
      if (globalThis.opencodeAulaF75Max === current) globalThis.opencodeAulaF75Max = undefined;
      await current.indicator.close();
    };
  },
});
