# ddeLanguage Support

A Visual Studio Code extension that adds syntax highlighting for the `ddeLanguage` programming language.

## Features

- Syntax highlighting for:
  - Numbers (integers and decimals)
  - Strings (single and double quoted)
  - Booleans (`true`, `false`)
  - Identifiers
  - Control keywords (`if`, `elseif`, `else`)
  - Operators (`+`, `-`, `*`, `/`, `=`)
  - Comparators (`==`, `!=`, `<=`, `>=`, `<`, `>`)
  - Commas and semicolons
  - Brackets (`{}`, `()`)
- Matches the structure of a custom tokenizer used for `ddeLanguage`.

## Language Overview

`ddeLanguage` is a simple, custom programming language with a syntax inspired by JavaScript, but cleaner and more lightweight.
It is currenly a work in progress, but more features will be added soon.

### Example Code

```dde
x = random(1, 10);

print('The value of x is', x, "and it's of type", typeof(x));

y = 'Hello ' + ' World!';

print(y, '|', typeof(y));

print({ a = 1; b = 2; a + b; } + { 5 * 5 });
```

## File Extension

Files ending in `.dde` will automatically be recognized and highlighted as `ddeLanguage`.

## Installation

1. Clone this repo or install the extension from the VS Code Marketplace (if available).
2. Open the folder in VS Code.
3. Press `F5` to launch a new VS Code window with the extension enabled.
4. Open a `.dde` file to see `ddeLanguage` syntax highlighting in action.

## Contributing

Want to improve or expand `ddeLanguage` support? PRs and issues are always welcome.

## License

MIT