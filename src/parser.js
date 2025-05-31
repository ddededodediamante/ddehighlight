// @ts-nocheck
export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos];
  }

  consume(expectedType, expectedValue) {
    const token = this.peek();

    if (
      !token ||
      (expectedType && token.type !== expectedType) ||
      (expectedValue != null && token.value !== expectedValue)
    ) {
      throw new Error(
        "expected " + expectedValue + ", got " + (token?.value ?? "nothing")
      );
    }

    this.pos++;
    return token;
  }

  parseExpression() {
    const token = this.peek();

    if (
      token.type === "identifier" &&
      this.tokens[this.pos + 1] &&
      this.tokens[this.pos + 1].value === "="
    ) {
      return this.parseAssignment();
    }

    if (token.type === "keyword") {
      if (token.value === "if") {
        return this.parseIfStatement();
      } else if (token.value === "for") {
        return this.parseForLoop();
      } else if (token.value === "return") {
        this.consume("keyword", "return");

        if (
          !this.peek() ||
          this.peek().type === "semicolon" ||
          this.peek().value === "}"
        ) {
          return { type: "return", expression: null };
        }

        const expr = this.parseExpression();
        return { type: "return", expression: expr };
      }
    }

    return this.parseComparison();
  }

  parseAssignment() {
    const idToken = this.consume("identifier");

    this.consume("operator", "=");

    if (this.peek()?.type === "parenthesis" && this.peek()?.value === "(") {
      return this.parseFunctionDefinition(idToken.value);
    }

    return {
      type: "assignment",
      name: idToken.value,
      expression: this.parseExpression(),
    };
  }

  parseComparison() {
    let node = this.parseAdditive();

    while (this.peek() && this.peek().type === "comparator") {
      const operator = this.consume("comparator");
      const right = this.parseAdditive();
      node = {
        type: "binary",
        operator: operator.value,
        left: node,
        right,
      };
    }

    return node;
  }

  parseAdditive() {
    let node = this.parseMultiplicative();
    while (
      this.peek() &&
      this.peek().type === "operator" &&
      (this.peek().value === "+" || this.peek().value === "-")
    ) {
      const op = this.consume("operator");
      const right = this.parseMultiplicative();
      node = {
        type: "binary",
        operator: op.value,
        left: node,
        right: right,
      };
    }
    return node;
  }

  parseMultiplicative() {
    let node = this.parsePrimary();
    while (
      this.peek() &&
      this.peek().type === "operator" &&
      (this.peek().value === "*" || this.peek().value === "/")
    ) {
      const operator = this.consume("operator");
      const right = this.parsePrimary();
      node = {
        type: "binary",
        operator: operator.value,
        left: node,
        right: right,
      };
    }
    return node;
  }

  parseFunctionCall(callee) {
    if (typeof callee === "string") {
      callee = { type: "identifier", name: callee };
    }

    this.consume("parenthesis", "(");
    const args = [];

    while (
      this.peek() &&
      this.peek().value !== ")" &&
      this.peek().value !== "."
    ) {
      args.push(this.parseExpression());
      if (this.peek().value === ",") {
        this.consume("comma");
      } else {
        break;
      }
    }

    this.consume("parenthesis", ")");
    return {
      type: "call",
      callee,
      arguments: args,
    };
  }

  parseFunctionCallArgs() {
    this.consume("parenthesis", "(");
    const args = [];

    while (this.peek() && this.peek().value !== ")") {
      args.push(this.parseExpression());
      if (this.peek().value === ",") {
        this.consume("comma");
      } else {
        break;
      }
    }

    this.consume("parenthesis", ")");
    return args;
  }

  parseFunctionDefinition(name) {
    this.consume("parenthesis", "(");
    const params = [];

    while (this.peek() && this.peek().value !== ")") {
      const paramToken = this.consume("identifier");
      params.push(paramToken.value);
      if (this.peek().value === ",") {
        this.consume("comma");
      } else {
        break;
      }
    }

    this.consume("parenthesis", ")");
    const body = this.parseBlock();

    return {
      type: "assignment",
      name,
      expression: {
        type: "function",
        params,
        body,
      },
    };
  }

  parseBlock() {
    this.consume("bracket", "{");
    const statements = [];

    while (this.peek() && this.peek().value !== "}") {
      const statement = this.parseExpression();
      statements.push(statement);

      if (this.peek()?.type === "semicolon") {
        this.consume("semicolon");
      }
    }

    this.consume("bracket", "}");

    return {
      type: "block",
      arguments: statements,
      value: statements[statements.length - 1] ?? null,
    };
  }

  parseIfStatement() {
    this.consume("keyword", "if");
    this.consume("parenthesis", "(");
    const condition = this.parseExpression();
    this.consume("parenthesis", ")");

    const ifBlock = this.parseBlock();
    let elseBlock = null;

    const next = this.peek();

    if (next && next.type === "keyword") {
      if (next.value === "elseif") {
        this.consume("keyword", "elseif");
        this.consume("parenthesis", "(");
        const elseifCondition = this.parseExpression();
        this.consume("parenthesis", ")");
        elseBlock = {
          type: "if",
          condition: elseifCondition,
          arguments: this.parseBlock(),
        };
      } else if (next.value === "else") {
        this.consume("keyword", "else");
        elseBlock =
          this.peek().value === "{"
            ? this.parseBlock()
            : this.parseIfStatement();
      }
    }

    return {
      type: "if",
      condition,
      arguments: ifBlock,
      else: elseBlock,
    };
  }

  parseForLoop() {
    this.consume("keyword", "for");
    this.consume("parenthesis", "(");

    const itemToken = this.consume("identifier");
    let indexToken = null;

    if (this.peek().type === "comma") {
      this.consume("comma");
      indexToken = this.consume("identifier");
    }

    this.consume("parenthesis", ")");
    this.consume("keyword", "in");

    let iterable;
    if (this.peek().type === "identifier") {
      iterable = this.consume("identifier").value;
    } else {
      iterable = this.parseExpression();
    }

    const body = this.parseBlock();

    return {
      type: "for",
      item: itemToken.value,
      index: indexToken?.value ?? null,
      iterable,
      body,
    };
  }

  parsePrimary() {
    const token = this.peek();
    if (!token) throw new Error("unexpected end of input");

    let node;
    switch (token.type) {
      case "keyword":
        if (token.value === "null") {
          this.consume("keyword", "null");
          return { type: "null", value: null };
        }
        break;
      case "bracket":
        if (token.value === "{") {
          return this.parseBlock();
        }
        break;
      case "number":
        this.consume("number");
        node = { type: "number", value: Number(token.value) };
        break;
      case "string":
        this.consume("string");
        node = { type: "string", value: token.value };
        break;
      case "boolean":
        this.consume("boolean");
        node = { type: "boolean", value: token.value };
        break;
      case "parenthesis":
        this.consume("parenthesis", "(");
        node = this.parseExpression();
        this.consume("parenthesis", ")");
        break;
      case "identifier":
        const name = token.value;
        this.consume("identifier");

        if (this.peek()?.type === "parenthesis" && this.peek().value === "(") {
          node = this.parseFunctionCall(name);
        } else {
          node = { type: "identifier", name };
        }
        break;
      default:
        throw new Error("unexpected token: " + JSON.stringify(token));
    }

    while (true) {
      const next = this.peek();
      if (!next) break;

      if (
        (next.type === "parenthesis" && next.value === ")") ||
        (next.type === "bracket" && next.value === "}")
      )
        break;

      if (next.type === "squarebracket" && next.value === "[") {
        this.consume("squarebracket", "[");
        const idx = this.parseExpression();
        this.consume("squarebracket", "]");
        node = { type: "index", object: node, index: idx };
        continue;
      }

      if (next.value === ".") {
        this.consume(next.type, ".");
        const prop = this.consume("identifier").value;

        if (this.peek()?.type === "parenthesis" && this.peek().value === "(") {
          const propAst = { type: "property", object: node, property: prop };
          return this.parseFunctionCall(propAst);
        } else {
          node = { type: "property", object: node, property: prop };
          continue;
        }
      }
      break;
    }
    return node;
  }

  parse() {
    const ast = [];

    while (this.pos < this.tokens.length) {
      if (this.peek().type === "semicolon") {
        this.consume("semicolon");
        continue;
      }

      ast.push(this.parseExpression());
    }

    return ast;
  }
}
