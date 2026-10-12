# opencode-aula-f75-max

Shows OpenCode's status on an Aula F75 Max keyboard plugged in over USB:

| Status    | Screen    | Keys  |
| --------- | --------- | ----- |
| working   | WORKING   | blue  |
| needs you | NEEDS YOU | amber |
| done      | DONE      | green |
| error     | ERROR     | red   |

"Needs you" means a permission request or a question is waiting. With several sessions, the most urgent status wins.

```sh
opencode plugin add github:rexdotsh/opencode-aula-f75-max
```

## Options

```jsonc
{
  "plugins": [{ "package": "github:rexdotsh/opencode-aula-f75-max", "options": { "keys": true, "brightness": 5 } }],
}
```

- `keys` (default `true`): tint every key with the status colour. This replaces the keyboard's lighting effect; pick yours again with the knob.
- `brightness` (default `5`): key brightness, 0-5.

Each screen change shows the keyboard's own progress bar for about 1.5s; key colours change in about 70ms.
