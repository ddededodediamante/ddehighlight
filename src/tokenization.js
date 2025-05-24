// @ts-nocheck
export function tokenize(input) {
  let tokens = [],
    position = 0;

  const isNumber = (i) => !isNaN(i) && !isNaN(parseFloat(i));
  const isWhitespace = (i) => /\s/.test(i);
  const isMathOperator = (i) => "+-*/".includes(i);
  const isBoolean = (i) => i === "true" || i === "false";

  while (position < input.length) {
    let current = input[position];

    if (
      current === "#" &&
      (position === 0 || isWhitespace(input[position - 1]))
    ) {
      while (position < input.length && input[position] !== "\n") {
        position++;
      }
      continue;
    }

    if (isWhitespace(current)) {
      position++;
      continue;
    }

    if (isNumber(current)) {
      let numberStr = "";
      while (
        position < input.length &&
        (isNumber(input[position]) || input[position] === ".")
      ) {
        numberStr += input[position];
        position++;
      }

      if (numberStr.endsWith(".")) numberStr += "0";

      tokens.push({ type: "number", value: numberStr });
      continue;
    }

    if (current === '"' || current === "'") {
      let quote = current;
      let stringContent = "";
      position++;

      while (position < input.length && input[position] !== quote) {
        stringContent += input[position];
        position++;
      }

      if (position === input.length) {
        throw new Error("unterminated string literal");
      }
      position++;
      tokens.push({ type: "string", value: stringContent });
      continue;
    }

    if (/[a-zA-Z_]/.test(current)) {
      let identifierStr = "";
      while (position < input.length && /[a-zA-Z0-9_]/.test(input[position])) {
        identifierStr += input[position];
        position++;
      }

      if (isBoolean(identifierStr)) {
        tokens.push({ type: "boolean", value: identifierStr === "true" });
      } else if (
        ["if", "else", "elseif", "for", "in"].includes(identifierStr)
      ) {
        tokens.push({ type: "keyword", value: identifierStr });
      } else {
        tokens.push({ type: "identifier", value: identifierStr });
      }
      continue;
    }

    if (current === "=") {
      let next = input[position + 1];
      if (next === "=") {
        tokens.push({ type: "comparator", value: "==" });
        position += 2;
      } else {
        tokens.push({ type: "operator", value: "=" });
        position++;
      }
      continue;
    }

    if ("<>!".includes(current)) {
      let value = current;
      let next = input[position + 1];
      if (next === "=") {
        value += "=";
        position += 2;
      } else {
        position++;
      }
      tokens.push({ type: "comparator", value });
      continue;
    }

    if (isMathOperator(current)) {
      tokens.push({ type: "operator", value: current });
      position++;
      continue;
    }

    if (current === ",") {
      tokens.push({ type: "comma", value: "," });
      position++;
      continue;
    }

    if (current === ".") {
      tokens.push({ type: "dot", value: "." });
      position++;
      continue;
    }

    if (current === ";") {
      tokens.push({ type: "semicolon", value: ";" });
      position++;
      continue;
    }

    if ("{}".includes(current)) {
      tokens.push({ type: "bracket", value: current });
      position++;
      continue;
    }

    if ("()".includes(current)) {
      tokens.push({ type: "parenthesis", value: current });
      position++;
      continue;
    }

    if ("[]".includes(current)) {
      tokens.push({ type: "squarebracket", value: current });
      position++;
      continue;
    }

    throw new Error("unknown character: " + current);
  }

  return tokens;
}
