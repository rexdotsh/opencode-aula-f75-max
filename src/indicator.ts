import { KEYS, Keyboard, type Key, type Rgb } from 'aula-f75-max-screen';
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

function tint(color: Rgb): Partial<Record<Key, Rgb>> {
  return Object.fromEntries(Object.keys(KEYS).map((key) => [key, color]));
}

/**
 * Shows the latest status on the keyboard, one change at a time. Keys follow every change at once; the screen only
 * takes a status it is configured for, once that status has held for the settle time. A keyboard that is not plugged
 * in is skipped until the next change.
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

  constructor(options: IndicatorOptions) {
    this.#options = options;
  }

  show(status: Status): void {
    if (status === this.#wanted) return;
    this.#wanted = status;
    this.#interrupt?.();
    this.#pumping ??= this.#pump().finally(() => (this.#pumping = undefined));
  }

  async close(): Promise<void> {
    this.#interrupt?.();
    await this.#pumping;
    await this.#disconnect();
  }

  async #pump(): Promise<void> {
    for (;;) {
      const status = this.#wanted;
      if (status === 'idle' || (!this.#keysDue(status) && !this.#screenDue(status))) return;
      // oxlint-disable-next-line no-await-in-loop -- the keyboard takes one change at a time
      if (!(await this.#apply(status))) return;
    }
  }

  #keysDue(status: Shown): boolean {
    return this.#options.keys && this.#keys !== status;
  }

  #screenDue(status: Shown): boolean {
    return this.#options.screen.has(status) && this.#screen !== status;
  }

  /** Shows `status`, or returns false when the keyboard is unavailable; the next change tries again. */
  async #apply(status: Shown): Promise<boolean> {
    try {
      const keyboard = (this.#keyboard ??= await Keyboard.open());
      if (!keyboard) return false;
      if (this.#keysDue(status)) {
        if (!this.#custom) await keyboard.customLighting(this.#options.brightness);
        this.#custom = true;
        await keyboard.setKeyColors(tint(LOOKS[status].tint));
        this.#keys = status;
      }
      if (!this.#screenDue(status) || !(await this.#held(status))) return true;
      await keyboard.upload(LOOKS[status].screen);
      this.#screen = status;
      return true;
    } catch (error) {
      console.warn('aula-f75-max: keyboard update failed; reconnecting on the next change', error);
      await this.#disconnect();
      return false;
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
    await keyboard?.close().catch((error: unknown) => console.warn('aula-f75-max: closing the keyboard failed', error));
  }
}
