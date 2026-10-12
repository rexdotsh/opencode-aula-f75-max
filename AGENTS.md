# AGENTS.md

An OpenCode plugin that shows OpenCode's status on the Aula F75 Max keyboard: a status screen on its 128x128 display and a tint across every key. The keyboard itself is driven by [aula-f75-max-screen](https://github.com/rexdotsh/aula-f75-max-screen); this repository only decides what to show and when.

## Commands

Bun is the only package manager and script runner. Formatting is oxfmt and linting is oxlint.

| Task                      | Command                   |
| ------------------------- | ------------------------- |
| Install                   | `bun install`             |
| Format                    | `bun run fmt`             |
| Lint (type-aware oxlint)  | `bun run lint`            |
| Unused code and deps      | `bun run knip`            |
| Typecheck (tsgo)          | `bun run check`           |
| Test                      | `bun run test`            |
| Render the screens to PNG | `bun run preview out.png` |

`bun run fmt:check`, `bun run lint`, `bun run knip`, `bun run check` and `bun run test` must all pass before every push. CI runs the same steps.

## Layout

```
src/status.ts     Tracker: folds every session into one status, most urgent first
src/events.ts     maps OpenCode events onto the tracker
src/look.ts       each status's screen and key tint
src/indicator.ts  drives the keyboard: keys first, then the screen, one change at a time
src/index.ts      the plugin: subscribes to events and shares one tracker and indicator across instances
scripts           previews
test              bun tests
```

## Invariants

- Status is decided only in `Tracker`, from domain calls (`working`, `finished`, `failed`, `waiting`, `answered`, `closed`). `events.ts` is the only place that knows OpenCode's event shapes. Every tracker call is idempotent, because every plugin instance feeds the same events.
- The plugin never throws into OpenCode over the keyboard. A missing or failing keyboard is logged and retried on the next status change.
- Uploads show the keyboard's own progress screen for about 1.5s, so the screen is only uploaded for a status that has held for a moment, and never for the same status twice. Keys change first; they take about 70ms.
- Key tinting replaces the keyboard's own lighting effect and cannot restore it; it is the `keys` option, and the user restores their effect with the knob.

## Code standards, testing and workflow

As in [aula-f75-max-screen's AGENTS.md](https://github.com/rexdotsh/aula-f75-max-screen/blob/main/AGENTS.md): the thermo-nuclear code quality bar, tests only where a bug would hurt and nothing else would catch it (here: the status tracker), and small changes straight to `main`, big ones through a reviewed PR.

## Privacy

This repository is public. It must never contain anything that identifies a person or a machine.
