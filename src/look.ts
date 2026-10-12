import { Animation, Frame, HEIGHT, WIDTH, rgb, textWidth, type Rgb } from 'aula-f75-max-screen';
import type { Status } from './status';

export type Shown = Exclude<Status, 'idle'>;

export interface Look {
  /** The colour every key takes. */
  tint: Rgb;
  screen: Animation;
}

const BACKGROUND = rgb(12, 14, 18);
const BANNER = 18;
const MAX_SCALE = 4;

function screen(lines: readonly string[], [r, g, b]: Rgb): Animation {
  const accent = rgb(r, g, b);
  const frame = new Frame(BACKGROUND).rect(0, 0, WIDTH, BANNER, accent).centerText('OPENCODE', 6, BACKGROUND);
  const widest = Math.max(...lines.map((line) => textWidth(line)));
  const scale = Math.min(MAX_SCALE, Math.floor((WIDTH - 12) / widest));
  const lineHeight = 9 * scale;
  const top = BANNER + (HEIGHT - BANNER - lines.length * lineHeight + 2 * scale) / 2;
  lines.forEach((line, index) => frame.centerText(line, top + index * lineHeight, accent, scale));
  return Animation.still(frame.rect(0, HEIGHT - 4, WIDTH, 4, accent));
}

function look(lines: readonly string[], tint: Rgb): Look {
  return { tint, screen: screen(lines, tint) };
}

export const LOOKS: Readonly<Record<Shown, Look>> = {
  working: look(['WORKING'], [0, 110, 255]),
  'needs-you': look(['NEEDS', 'YOU'], [255, 150, 0]),
  done: look(['DONE'], [0, 200, 70]),
  error: look(['ERROR'], [255, 30, 30]),
};
