import { Plugin } from '@opencode/plugin';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { track } from './events';
import { Indicator } from './indicator';
import { log } from './log';
import { options } from './options';
import { Tracker } from './status';

interface Shared {
  build: number;
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

// A reload does not always unload every instance, so a driver from older code can outlive it. Copies of the same
// code share a build, the newest change to the plugin's source, and a newer build replaces an older driver.
const SOURCE = dirname(fileURLToPath(import.meta.url));
const BUILD = Math.max(...readdirSync(SOURCE).map((file) => statSync(join(SOURCE, file)).mtimeMs));

function driver(ctx: Plugin.Context): Shared {
  const existing = globalThis.opencodeAulaF75Max;
  if (existing?.build === BUILD) return existing;
  if (existing) {
    log('replacing the driver from an older build');
    void existing.indicator.close();
  }
  return (globalThis.opencodeAulaF75Max = {
    build: BUILD,
    tracker: new Tracker(),
    indicator: new Indicator(options(ctx.options)),
    users: 0,
  });
}

export default Plugin.define({
  id: 'aula-f75-max',
  setup(ctx) {
    const current = driver(ctx);
    current.users++;
    log(`loaded for ${ctx.location.directory} (${current.users} active)`);
    const controller = new AbortController();
    void (async () => {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        if (controller.signal.aborted) return;
        track(current.tracker, event);
        current.indicator.show(current.tracker.status);
      }
    })().catch((error: unknown) => {
      if (!controller.signal.aborted) log('the event stream ended', error);
    });
    // An aborted stream does not always end, so cleanup never waits for it: the driver must be released for reloads.
    return async () => {
      controller.abort();
      log(`unloaded for ${ctx.location.directory}`);
      if (--current.users > 0) return;
      if (globalThis.opencodeAulaF75Max === current) globalThis.opencodeAulaF75Max = undefined;
      await current.indicator.close();
    };
  },
});
