export function parse(input) {
  const tokens = tokenize(input);
  let pos = 0;

  function peek() {
    return tokens[pos];
  }

  function next() {
    return tokens[pos++];
  }

  function match(type, value) {
    const t = peek();
    if (!t) return false;
    if (t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    pos++;
    return true;
  }

  function Node(type, props = {}) {
    return Object.assign({ type }, props);
  }

  const PRECEDENCE = {
    "||": 1,
    "&&": 2,
    "==": 3,
    "!=": 3,
    "===": 3,
    "!==": 3,
    ">": 4,
    "<": 4,
    ">=": 4,
    "<=": 4,
    "+": 5,
    "-": 5,
    "*": 6,
    "/": 6,
    "%": 6,
    "^": 7,
  };

  function parseProgram() {
    const body = [];
    while (peek().type !== "EOF") {
      body.push(parseStatement());
    }
    return Node("Program", { body });
  }

  function parseStatement() {
    const t = peek();
    if (t.type === "KEYWORD") {
      if (t.value === "let") return parseLet();
      if (t.value === "function") return parseFunctionDeclaration();
      if (t.value === "return") return parseReturn();
      if (t.value === "if") return parseIf();
      if (t.value === "while") return parseWhile();
    }

    if (t.type === "OP" && t.value === "{") return parseBlock();

    const expr = parseExpression();
    match("OP", ";"); 
    return Node("ExpressionStatement", { expression: expr });
  }

  function parseLet() {
    next(); 
    const id = expectIdent("Expected identifier after let");
    match("OP", "=");
    const init = parseExpression();
    match("OP", ";");
    return Node("VariableDeclaration", { id, init });
  }

  function parseFunctionDeclaration() {
    next(); 
    const id = expectIdent("Expected function name");
    expectOp("(");
    const params = [];
    if (!peekIs("OP", ")")) {
      do {
        params.push(expectIdent("Expected parameter name"));
      } while (match("OP", ","));
    }
    expectOp(")");
    const body = parseBlock();
    return Node("FunctionDeclaration", { id, params, body });
  }

  function parseReturn() {
    next();
    const arg = parseExpression();
    match("OP", ";");
    return Node("ReturnStatement", { argument: arg });
  }

  function parseIf() {
    next();
    expectOp("(");
    const test = parseExpression();
    expectOp(")");
    const consequent = parseStatement();
    let alternate = null;
    if (peek().type === "KEYWORD" && peek().value === "else") {
      next();
      alternate = parseStatement();
    }
    return Node("IfStatement", { test, consequent, alternate });
  }

  function parseWhile() {
    next();
    expectOp("(");
    const test = parseExpression();
    expectOp(")");
    const body = parseStatement();
    return Node("WhileStatement", { test, body });
  }

  function parseBlock() {
    expectOp("{");
    const body = [];
    while (!peekIs("OP", "}") && peek().type !== "EOF") {
      body.push(parseStatement());
    }
    expectOp("}");
    return Node("BlockStatement", { body });
  }

  function parseExpression(rbp = 0) {
    let t = next();
    let left = null;

    if (t.type === "NUMBER") left = Node("Literal", { value: Number(t.value) });
    else if (t.type === "STRING") left = Node("Literal", { value: t.value });
    else if (
      t.type === "KEYWORD" &&
      (t.value === "true" || t.value === "false" || t.value === "null")
    ) {
      const val =
        t.value === "true" ? true : t.value === "false" ? false : null;
      left = Node("Literal", { value: val });
    } else if (t.type === "IDENT") {
      left = Node("Identifier", { name: t.value });
    } else if (t.type === "OP" && t.value === "(") {
      left = parseExpression();
      expectOp(")");
    } else if (
      t.type === "OP" &&
      (t.value === "+" || t.value === "-" || t.value === "!")
    ) {
      const operator = t.value;
      const right = parseExpression(7);
      left = Node("UnaryExpression", { operator, argument: right });
    } else {
      throw new Error("Unexpected token in expression: " + JSON.stringify(t));
    }

    while (true) {
      const nextTok = peek();
      if (!nextTok || nextTok.type === "EOF") break;

      if (nextTok.type === "OP" && nextTok.value === "(") {
        next();
        const args = [];
        if (!peekIs("OP", ")")) {
          do {
            args.push(parseExpression());
          } while (match("OP", ","));
        }
        expectOp(")");
        left = Node("CallExpression", { callee: left, arguments: args });
        continue;
      }

      if (nextTok.type === "OP" && nextTok.value === ".") {
        next();
        const id = expectIdent("Property name expected after dot");
        left = Node("MemberExpression", { object: left, property: id });
        continue;
      }

      if (nextTok.type === "OP" && PRECEDENCE[nextTok.value] !== undefined) {
        const op = nextTok.value;
        const prec = PRECEDENCE[op];
        if (prec <= rbp) break;
        next();
        const right = parseExpression(prec);
        left = Node("BinaryExpression", { operator: op, left, right });
        continue;
      }

      if (nextTok.type === "OP" && nextTok.value === "=") {
        if (rbp >= 1) break;
        next();
        const right = parseExpression(0);
        left = Node("AssignmentExpression", { left, right });
        continue;
      }

      break;
    }

    return left;
  }

  function expectIdent(msg) {
    const t = next();
    if (!t || t.type !== "IDENT")
      throw new Error(msg + " (got " + JSON.stringify(t) + ")");
    return { type: "Identifier", name: t.value };
  }
  function expectOp(val) {
    const t = next();
    if (!t || t.type !== "OP" || t.value !== val)
      throw new Error(
        "Expected operator " + val + ", got " + JSON.stringify(t)
      );
    return t;
  }
  function peekIs(type, value) {
    const t = peek();
    if (!t) return false;
    if (t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  }

  return parseProgram();
}
