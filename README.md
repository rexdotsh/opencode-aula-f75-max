# opencode-aula-f75-max

Shows OpenCode's status on an Aula F75 Max keyboard plugged in over USB:

| Status    | Screen    | Keys  |
| --------- | --------- | ----- |
| working   | WORKING   | blue  |
| needs you | NEEDS YOU | amber |
| done      | DONE      | green |
| error     | ERROR     | red   |

"Needs you" means a permission request or a question is waiting. With several sessions, the most urgent status wins.

## Install

Clone this repository and run `bun install`, then load it from OpenCode's global plugin folder with a one-line file, `~/.config/opencode/plugins/aula-f75-max.ts`:

```ts
export { default } from '/path/to/opencode-aula-f75-max/src/index.ts';
```

Run `opencode reload` to load it. (On Windows, OpenCode 2.0.26 ignores local paths in the `plugins` config and `opencode plugin add github:…` fails to install the Git dependency, so the plugin folder is the way in for now.)

## Options

```jsonc
{
  "plugins": [{ "package": "github:rexdotsh/opencode-aula-f75-max", "options": { "keys": true, "brightness": 5 } }],
}
```

- `keys` (default `true`): tint every key with the status colour. This replaces the keyboard's lighting effect; pick yours again with the knob.
- `brightness` (default `5`): key brightness, 0-5.
- `screen` (default `["needs-you", "done", "error"]`): the statuses that update the screen. `true` for all of them, `false` to leave the screen alone and use the keys only.
- `settle` (default `500`): how long, in milliseconds, a status must hold before the screen shows it.

Every screen change shows the keyboard's own progress bar for about 1.5s; the firmware has no way around it. Key colours change in about 70ms, so the keys follow every change at once and the screen only takes the statuses worth a flash, once they have settled.
