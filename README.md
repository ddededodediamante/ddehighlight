# ddeLang Support

A Visual Studio Code extension that adds support for the `ddeLang` programming language.

## Features

- Syntax highlighting for:
  - Numbers (integers and decimals)
  - Strings (single and double quoted)
  - Booleans (`true`, `false`)
  - Identifiers
  - Control keywords (`if`, `elseif`, `else`, `return`, ...)
  - Operators (`+`, `-`, `*`, `/`, `=`)
  - Comparators (`==`, `!=`, `<=`, `>=`, `<`, `>`)
  - Commas and semicolons
  - Brackets (`{}`, `()`)
  - Others

## Language Overview

`ddeLang` is a simple, custom programming language with a syntax inspired by JavaScript, but cleaner and more lightweight.
It is currently a work in progress, but more features will be added soon.

### Example Code

```dde
x = random(1, 10);

print('The value of x is', x, "and it's of type", typeof(x));

y = 'Hello ' + ' World!';

print(y, '|', typeof(y));

print({ a = 1; b = 2; a + b; } + { 5 * 5 });
```

## Syntax Reference

### Comments
Use `#` for single-line comments.
```dde
# This is a comment
```

### Variables and Assignment
```dde
x = 5;
name = "Hello";
isOn = true;
```

### Data Types
- Numbers: `42`, `3.14`
- Strings: `"text"` or `'text'`
- Booleans: `true`, `false`
- Null: `null`

### Operators
- Math: `+`, `-`, `*`, `/`
- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Assignment: `=`

### Functions

#### Definition
```dde
add = (a, b) {
  return a + b;
};
```

#### Call
```dde
result = add(2, 3);
```

### Conditionals
```dde
if (x > 0) {
  result = "positive";
} elseif (x < 0) {
  result = "negative";
} else {
  result = "zero";
}
```

### Loops
```dde
for (item, index) in list {
  print(item);
}
```

### Blocks and Grouping
```dde
{
  a = 1;
  b = a + 2;
}
```

### Arrays and Objects

#### Indexing
```dde
value = arr[0];
```

#### Property Access
```dde
name = user.name;
```

#### Method Call
```dde
result = user.getName();
```

### Semicolons
Semicolons `;` are optional but supported for separating expressions.

### Built-in Keywords
- `if`, `else`, `elseif`
- `for`, `in`, `while`
- `return`, `null`
- `true`, `false`

## File Extension

Files ending in `.dde` will automatically be recognized and highlighted as `ddeLang`.

## 📦 Installation

### Method 1
1. Install the `ddeLang` extension from the VS Code Marketplace.
2. Open a `.dde` file to see `ddeLang` in action.

### Method 2

1. Install globally via npm:
```bash
npm i -g ddelang
```

2. Run a `.dde` file:
```bash
dde path/to/file.dde
```

## Contributing

Want to improve or expand `ddeLang` support? PRs and issues are always welcome.

## License

MIT