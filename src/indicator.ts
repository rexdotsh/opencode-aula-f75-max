import { KEYS, Keyboard, type Key, type Rgb } from 'aula-f75-max-screen';
import { LOOKS, type Shown } from './look';
import type { Status } from './status';

export interface IndicatorOptions {
  /** Tint every key with the status colour. This replaces the keyboard's own lighting effect. */
  keys: boolean;
  /** Key brightness, 0-5. */
  brightness: number;
}

// A status that changes again this soon is not worth a screen upload, which takes about 1.5s.
const SETTLE_MS = 400;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function tint(color: Rgb): Partial<Record<Key, Rgb>> {
  return Object.fromEntries(Object.keys(KEYS).map((key) => [key, color]));
}

/** Shows the latest status on the keyboard, one change at a time; a keyboard that is not plugged in is skipped. */
export class Indicator {
  readonly #options: IndicatorOptions;
  #wanted: Status = 'idle';
  #keyboard: Keyboard | undefined;
  #custom = false;
  #keys: Status = 'idle';
  #screen: Status = 'idle';
  #pumping: Promise<void> | undefined;

  constructor(options: IndicatorOptions) {
    this.#options = options;
  }

  show(status: Status): void {
    this.#wanted = status;
    this.#pumping ??= this.#pump().finally(() => (this.#pumping = undefined));
  }

  async close(): Promise<void> {
    await this.#pumping;
    await this.#disconnect();
  }

  async #pump(): Promise<void> {
    for (;;) {
      const status = this.#wanted;
      if (status === 'idle' || (this.#keys === status && this.#screen === status)) return;
      // oxlint-disable-next-line no-await-in-loop -- the keyboard takes one change at a time
      if (!(await this.#apply(status))) return;
    }
  }

  /** Shows `status`, or returns false when the keyboard is unavailable; the next change tries again. */
  async #apply(status: Shown): Promise<boolean> {
    try {
      const keyboard = (this.#keyboard ??= await Keyboard.open());
      if (!keyboard) return false;
      if (this.#options.keys && this.#keys !== status) {
        if (!this.#custom) await keyboard.customLighting(this.#options.brightness);
        this.#custom = true;
        await keyboard.setKeyColors(tint(LOOKS[status].tint));
      }
      this.#keys = status;
      await sleep(SETTLE_MS);
      if (this.#wanted !== status) return true;
      await keyboard.upload(LOOKS[status].screen);
      this.#screen = status;
      return true;
    } catch (error) {
      console.warn('aula-f75-max: keyboard update failed; reconnecting on the next change', error);
      await this.#disconnect();
      return false;
    }
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
