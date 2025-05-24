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

  parseFunctionCall(name) {
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

    return {
      type: "call",
      name,
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
    const { type, value } = token;
    let node;

    if (type === "number") {
      this.consume("number");
      node = { type, value: Number(value) };
    } else if (type === "string") {
      this.consume("string");
      node = { type, value: String(value) };
    } else if (type === "boolean") {
      this.consume("boolean");
      node = { type, value: Boolean(value) };
    } else if (type === "identifier") {
      const identToken = this.consume("identifier");
      if (this.peek()?.type === "parenthesis" && this.peek().value === "(") {
        return this.parseFunctionCall(identToken.value);
      }
      node = { type: "identifier", name: identToken.value };
    } else if (type === "parenthesis" && value === "(") {
      this.consume("parenthesis", "(");
      node = this.parseExpression();
      this.consume("parenthesis", ")");
    } else if (type === "bracket" && value === "{") {
      node = this.parseBlock();
    } else if (type === "squarebracket" && value === "[") {
      this.consume("squarebracket", "[");
      const values = [];
      while (this.peek() && this.peek().value !== "]") {
        values.push(this.parseExpression());
        if (this.peek().value === ",") {
          this.consume("comma");
        } else {
          break;
        }
      }
      this.consume("squarebracket", "]");
      node = { type: "array", arguments: values };
    } else {
      throw new Error("unexpected token: " + JSON.stringify(token));
    }

    while (true) {
      let next = this.peek();
      if (!next) break;

      if (
        (next.type === "parenthesis" && next.value === ")") ||
        (next.type === "bracket" && next.value === "}")
      ) {
        break;
      }

      if (next.type === "bracket" && next.value === "[") {
        this.consume("bracket", "[");
        const indexExpr = this.parseExpression();
        this.consume("bracket", "]");
        node = {
          type: "index",
          object: node,
          index: indexExpr,
        };
        continue;
      }

      if (next.type === "dot") {
        this.consume("dot");
        const propToken = this.consume("identifier");
        if (
          this.peek() &&
          this.peek().type === "parenthesis" &&
          this.peek().value === "("
        ) {
          const args = this.parseFunctionCallArgs();
          node = {
            type: "call",
            callee: {
              type: "property",
              object: node,
              property: propToken.value,
            },
            arguments: args,
          };
        } else {
          node = {
            type: "property",
            object: node,
            property: propToken.value,
          };
        }
        continue;
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
