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
src/indicator.ts  drives the keyboard: keys at once, the screen once a status settles
src/options.ts    the plugin options, validated when it loads
src/log.ts        the plugin's log file
src/index.ts      the plugin: subscribes to events and shares one tracker and indicator across instances
scripts           previews
test              bun tests
```

## Invariants

- Status is decided only in `Tracker`, from domain calls (`working`, `finished`, `failed`, `waiting`, `answered`, `closed`). `events.ts` is the only place that knows OpenCode's event shapes. Every tracker call is idempotent, because every plugin instance feeds the same events.
- OpenCode loads the plugin once per location, each from its own copy of the module, and every instance receives every event. All copies in the process share one tracker and one indicator through `globalThis.opencodeAulaF75Max`: two drivers would interleave packets and the keyboard rejects them.
- Runs are tracked from `session.execution.*`; `session.status` is handled too, but OpenCode 2.0.26 does not emit it for runs.
- The plugin never throws into OpenCode over the keyboard. A missing or failing keyboard is logged and the current status retried every 5s, so a screen left on its progress bar by an interrupted upload recovers, and a keyboard plugged back in shows the right status.
- An upload that fails partway can leave the keyboard on its progress overlay even through later uploads; changing screen pages clears it, so the retry after a failed upload syncs the clock first.
- Everything the indicator does, and every failure with its cause, goes to `opencode-aula-f75-max.log` in the temp directory (rotated at 1 MiB), because OpenCode does not surface a plugin's console output.
- Other programs driving the keyboard (the CLI, scripts) take turns with the plugin through the library's lock file.
- Uploads show the keyboard's own progress screen for about 1.5s, so the screen only takes the statuses in the `screen` option, once they have held for `settle`, and never the same status twice. Keys follow every change at once (about 70ms); a status change cuts the settle wait short, so keys never wait for it.
- Key tinting replaces the keyboard's own lighting effect and cannot restore it; it is the `keys` option, and the user restores their effect with the knob.

## Code standards, testing and workflow

As in [aula-f75-max-screen's AGENTS.md](https://github.com/rexdotsh/aula-f75-max-screen/blob/main/AGENTS.md): the thermo-nuclear code quality bar, tests only where a bug would hurt and nothing else would catch it (here: the status tracker), and small changes straight to `main`, big ones through a reviewed PR.

## Privacy

This repository is public. It must never contain anything that identifies a person or a machine.
