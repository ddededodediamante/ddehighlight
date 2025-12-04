const KEYWORDS = new Set([
  "let",
  "function",
  "return",
  "if",
  "else",
  "while",
  "true",
  "false",
  "null",
]);

export function tokenize(input) {
  const tokens = [];
  let i = 0;

  const isWhitespace = (ch) => /\s/.test(ch);
  const isDigit = (ch) => /[0-9]/.test(ch);
  const isIdentStart = (ch) => /[a-zA-Z_]/.test(ch);
  const isIdent = (ch) => /[a-zA-Z0-9_]/.test(ch);

  while (i < input.length) {
    let ch = input[i];

    // whitespace
    if (isWhitespace(ch)) {
      i++;
      continue;
    }

    // comments
    if (ch === "/" && input[i + 1] === "/") {
      i += 2;
      while (i < input.length && input[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && input[i + 1] === "*") {
      i += 2;
      while (i < input.length && !(input[i] === "*" && input[i + 1] === "/"))
        i++;
      i += 2;
      continue;
    }

    // numbers
    if (isDigit(ch) || (ch === "." && isDigit(input[i + 1]))) {
      let start = i;
      if (ch === "0" && (input[i + 1] === "x" || input[i + 1] === "X")) {
        i += 2;
        while (/[0-9a-fA-F]/.test(input[i])) i++;
      } else {
        while (isDigit(input[i])) i++;
        if (input[i] === ".") {
          i++;
          while (isDigit(input[i])) i++;
        }
        if (input[i] === "e" || input[i] === "E") {
          i++;
          if (input[i] === "+" || input[i] === "-") i++;
          while (isDigit(input[i])) i++;
        }
      }
      tokens.push({ type: "NUMBER", value: input.slice(start, i) });
      continue;
    }

    // strings
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      let start = i;
      let str = "";
      while (i < input.length && input[i] !== quote) {
        if (input[i] === "\\") {
          i++;
          const esc = input[i];
          if (esc === "n") str += "\n";
          else if (esc === "r") str += "\r";
          else if (esc === "t") str += "\t";
          else if (esc === "b") str += "\b";
          else if (esc === "f") str += "\f";
          else if (esc === "u") {
            // unicode \uXXXX
            const code = input.slice(i + 1, i + 5);
            str += String.fromCharCode(parseInt(code, 16));
            i += 4;
          } else {
            str += esc;
          }
          i++;
        } else {
          str += input[i++];
        }
      }
      i++; // closing quote
      tokens.push({ type: "STRING", value: str });
      continue;
    }

    // identifiers & keywords
    if (isIdentStart(ch)) {
      let start = i++;
      while (i < input.length && isIdent(input[i])) i++;
      const word = input.slice(start, i);
      if (KEYWORDS.has(word)) tokens.push({ type: "KEYWORD", value: word });
      else tokens.push({ type: "IDENT", value: word });
      continue;
    }

    // two-char operators
    const two = input.slice(i, i + 2);
    if (
      [
        "==",
        "!=",
        ">=",
        "<=",
        "&&",
        "||",
        "=>",
        "++",
        "--",
        "===",
        "!==",
      ].includes(two)
    ) {
      tokens.push({ type: "OP", value: two });
      i += 2;
      continue;
    }

    // single-char tokens
    const singleMap = {
      "+": "+",
      "-": "-",
      "*": "*",
      "/": "/",
      "%": "%",
      "^": "^",
      ">": ">",
      "<": "<",
      "=": "=",
      "!": "!",
      "(": "(",
      ")": ")",
      "{": "{",
      "}": "}",
      "[": "[",
      "]": "]",
      ",": ",",
      ";": ";",
      ":": ":",
    };
    if (singleMap[ch]) {
      tokens.push({ type: "OP", value: ch });
      i++;
      continue;
    }

    throw new Error("Unexpected character: " + ch + " at " + i);
  }

  tokens.push({ type: "EOF" });
  return tokens;
}
