import type { IndicatorOptions } from './indicator';
import { LOOKS, type Shown } from './look';

const DEFAULT_SCREEN: readonly Shown[] = ['needs-you', 'done', 'error'];
const DEFAULT_SETTLE_MS = 2500;
const ALL = Object.keys(LOOKS).filter(isShown);

function isShown(value: unknown): value is Shown {
  return typeof value === 'string' && Object.hasOwn(LOOKS, value);
}

function screens(value: unknown): ReadonlySet<Shown> {
  if (value === true) return new Set(ALL);
  if (value === false) return new Set();
  if (Array.isArray(value) && value.every(isShown)) return new Set(value);
  throw new TypeError(`aula-f75-max: \`screen\` must be true, false, or a list of ${ALL.join(', ')}`);
}

/** The plugin options from OpenCode's config, checked once when the plugin loads. */
export function options(raw: Readonly<Record<string, unknown>>): IndicatorOptions {
  const { keys = true, brightness = 5, screen = DEFAULT_SCREEN, settle = DEFAULT_SETTLE_MS } = raw;
  if (typeof keys !== 'boolean') throw new TypeError('aula-f75-max: `keys` must be true or false');
  if (!(typeof brightness === 'number' && Number.isInteger(brightness) && brightness >= 0 && brightness <= 5)) {
    throw new RangeError('aula-f75-max: `brightness` must be a whole number from 0 to 5');
  }
  if (!(typeof settle === 'number' && Number.isInteger(settle) && settle >= 0)) {
    throw new RangeError('aula-f75-max: `settle` must be a whole number of milliseconds');
  }
  return { keys, brightness, screen: screens(screen), settle };
}
