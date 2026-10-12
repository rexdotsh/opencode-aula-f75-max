import { KEYS, Keyboard, type Key, type Rgb } from 'aula-f75-max-screen';
import { log } from './log';
import { LOOKS, type Shown } from './look';
import type { Status } from './status';

export interface IndicatorOptions {
  /** Tint every key with the status colour. This replaces the keyboard's own lighting effect. */
  keys: boolean;
  /** Key brightness, 0-5. */
  brightness: number;
  /** The statuses worth a screen upload, which flashes the keyboard's progress screen for about 1.5s. */
  screen: ReadonlySet<Shown>;
  /** How long a status must hold before the screen shows it, in milliseconds. */
  settle: number;
}

const RETRY_MS = 5000;
// A keyboard that keeps refusing a status is left alone until the status changes, rather than retried forever.
const MAX_ATTEMPTS = 3;

type Outcome = 'shown' | 'missing' | 'failed';

function tint(color: Rgb): Partial<Record<Key, Rgb>> {
  return Object.fromEntries(Object.keys(KEYS).map((key) => [key, color]));
}

/**
 * Shows the latest status on the keyboard, one change at a time. Keys follow every change at once; the screen only
 * takes a status it is configured for, once that status has held for the settle time. A keyboard that is not plugged
 * in is looked for every few seconds; one that fails is retried a few times, then left until the status changes.
 */
export class Indicator {
  readonly #options: IndicatorOptions;
  #wanted: Status = 'idle';
  #keyboard: Keyboard | undefined;
  #custom = false;
  #keys: Status = 'idle';
  #screen: Status = 'idle';
  #pumping: Promise<void> | undefined;
  #interrupt: (() => void) | undefined;
  #closed = false;
  #retry: ReturnType<typeof setTimeout> | undefined;
  #missing = false;
  #attempts = 0;

  constructor(options: IndicatorOptions) {
    this.#options = options;
  }

  show(status: Status): void {
    if (this.#closed || status === this.#wanted) return;
    this.#wanted = status;
    this.#attempts = 0;
    this.#interrupt?.();
    this.#kick();
  }

  async close(): Promise<void> {
    this.#closed = true;
    clearTimeout(this.#retry);
    this.#interrupt?.();
    await this.#pumping;
    await this.#disconnect();
  }

  #kick(): void {
    if (this.#closed) return;
    this.#pumping ??= this.#pump().finally(() => (this.#pumping = undefined));
  }

  async #pump(): Promise<void> {
    for (;;) {
      const status = this.#wanted;
      if (status === 'idle' || (!this.#keysDue(status) && !this.#screenDue(status))) return;
      // oxlint-disable-next-line no-await-in-loop -- the keyboard takes one change at a time
      const outcome = await this.#apply(status);
      if (outcome === 'shown') continue;
      if (outcome === 'failed' && ++this.#attempts >= MAX_ATTEMPTS) {
        log(`giving up on ${status} after ${MAX_ATTEMPTS} attempts, until the status changes`);
        return;
      }
      clearTimeout(this.#retry);
      this.#retry = setTimeout(() => this.#kick(), RETRY_MS);
      return;
    }
  }

  #keysDue(status: Shown): boolean {
    return this.#options.keys && this.#keys !== status;
  }

  #screenDue(status: Shown): boolean {
    return this.#options.screen.has(status) && this.#screen !== status;
  }

  async #apply(status: Shown): Promise<Outcome> {
    try {
      const keyboard = (this.#keyboard ??= await Keyboard.open());
      if (!keyboard) {
        if (!this.#missing) log('keyboard not plugged in; looking for it every 5s');
        this.#missing = true;
        return 'missing';
      }
      this.#missing = false;
      if (this.#keysDue(status)) {
        if (!this.#custom) await keyboard.customLighting(this.#options.brightness);
        this.#custom = true;
        await keyboard.setKeyColors(tint(LOOKS[status].tint));
        this.#keys = status;
        log(`keys ${status}`);
      }
      if (!this.#screenDue(status) || !(await this.#held(status))) return 'shown';
      const started = performance.now();
      await keyboard.upload(LOOKS[status].screen);
      this.#screen = status;
      log(`screen ${status} in ${Math.round(performance.now() - started)}ms`);
      return 'shown';
    } catch (error) {
      log(`showing ${status} failed`, error);
      await this.#disconnect();
      return 'failed';
    }
  }

  /** Whether `status` is still wanted after the settle time; any change ends the wait early. */
  async #held(status: Shown): Promise<boolean> {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => this.#interrupt?.(), this.#options.settle);
      this.#interrupt = () => {
        clearTimeout(timer);
        this.#interrupt = undefined;
        resolve();
      };
    });
    return this.#wanted === status;
  }

  async #disconnect(): Promise<void> {
    const keyboard = this.#keyboard;
    this.#keyboard = undefined;
    this.#custom = false;
    this.#keys = 'idle';
    this.#screen = 'idle';
    await keyboard?.close().catch((error: unknown) => log('closing the keyboard failed', error));
  }
}
