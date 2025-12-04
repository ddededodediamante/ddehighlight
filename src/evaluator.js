class Environment {
  constructor(parent = null) {
    this.parent = parent;
    this.vars = Object.create(null);
  }
  has(name) {
    if (Object.prototype.hasOwnProperty.call(this.vars, name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }
  get(name) {
    if (Object.prototype.hasOwnProperty.call(this.vars, name))
      return this.vars[name];
    if (this.parent) return this.parent.get(name);
    throw new Error("Undefined variable " + name);
  }
  set(name, value) {
    if (Object.prototype.hasOwnProperty.call(this.vars, name)) {
      this.vars[name] = value;
      return;
    }
    if (this.parent && this.parent.has(name)) {
      this.parent.set(name, value);
      return;
    }

    this.vars[name] = value;
  }
  define(name, value) {
    this.vars[name] = value;
  }
}

export function evaluate(node, env, functions = {}) {
  switch (node.type) {
    case "Program": {
      let res;
      for (const stmt of node.body) res = evaluate(stmt, env, functions);
      return res;
    }
    case "BlockStatement": {
      let res;
      const scope = new Environment(env);
      for (const stmt of node.body) {
        res = evaluate(stmt, scope, functions);
        if (res && res.__return) return res; 
      }
      return res;
    }
    case "ExpressionStatement":
      return evaluate(node.expression, env, functions);
    case "Literal":
      return node.value;
    case "Identifier":
      return env.get(node.name);
    case "VariableDeclaration": {
      const name = node.id.name;
      const val = evaluate(node.init, env, functions);
      env.define(name, val);
      return val;
    }
    case "AssignmentExpression": {
      if (
        node.left.type !== "Identifier" &&
        node.left.type !== "MemberExpression"
      )
        throw new Error("Invalid assignment target");
      const val = evaluate(node.right, env, functions);
      if (node.left.type === "Identifier") {
        env.set(node.left.name, val);
      } else {
        const { object, property } = node.left;
        const obj = evaluate(object, env, functions);
        const prop = property.name;
        obj[prop] = val;
      }
      return val;
    }
    case "BinaryExpression": {
      const a = evaluate(node.left, env, functions);
      const b = evaluate(node.right, env, functions);
      switch (node.operator) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "/":
          return a / b;
        case "%":
          return a % b;
        case "^":
          return Math.pow(a, b);
        case "==":
          return a == b;
        case "!=":
          return a != b;
        case "===":
          return a === b;
        case "!==":
          return a !== b;
        case ">":
          return a > b;
        case "<":
          return a < b;
        case ">=":
          return a >= b;
        case "<=":
          return a <= b;
        case "&&":
          return a && b;
        case "||":
          return a || b;
      }
      throw new Error("Unknown binary operator " + node.operator);
    }
    case "UnaryExpression": {
      const v = evaluate(node.argument, env, functions);
      switch (node.operator) {
        case "+":
          return +v;
        case "-":
          return -v;
        case "!":
          return !v;
      }
      throw new Error("Unknown unary operator " + node.operator);
    }
    case "IfStatement": {
      const test = evaluate(node.test, env, functions);
      if (test) return evaluate(node.consequent, env, functions);
      if (node.alternate) return evaluate(node.alternate, env, functions);
      return null;
    }
    case "WhileStatement": {
      let r = null;
      while (evaluate(node.test, env, functions)) {
        r = evaluate(node.body, env, functions);
        if (r && r.__return) return r;
      }
      return r;
    }
    case "CallExpression": {
      const callee = evaluate(node.callee, env, functions);
      const args = node.arguments.map((a) => evaluate(a, env, functions));
      if (typeof callee === "function") return callee(...args);
      if (callee && callee.type === "UserFunction") {
        const fnEnv = new Environment(callee.env);

        for (let i = 0; i < callee.params.length; i++) {
          const pname = callee.params[i].name;
          fnEnv.define(pname, args[i]);
        }

        const res = evaluate(callee.body, fnEnv, functions);
        if (res && res.__return) return res.value;
        return null;
      }
      throw new Error("Not a function");
    }
    case "FunctionDeclaration": {
      const name = node.id.name;
      const fn = {
        type: "UserFunction",
        params: node.params,
        body: node.body,
        env: env,
      };
      env.define(name, fn);
      return fn;
    }
    case "ReturnStatement": {
      const val = evaluate(node.argument, env, functions);
      return { __return: true, value: val };
    }
    case "MemberExpression": {
      const obj = evaluate(node.object, env, functions);
      const prop = node.property.name;
      return obj ? obj[prop] : undefined;
    }
    default:
      throw new Error("Unhandled node type: " + node.type);
  }
}

function createGlobalEnv() {
  const env = new Environment(null);

  env.define("print", function (...args) {
    console.log(
      ...args.map((x) => (typeof x === "object" ? JSON.stringify(x) : x))
    );
  });
  env.define("random", function (max = 1) {
    return Math.random() * max;
  });
  env.define("exit", function (code = 0) {
    if (typeof process !== "undefined" && process.exit) process.exit(code);
    throw new Error("Exit called (no process.exit available)");
  });
  env.define("len", function (x) {
    if (Array.isArray(x) || typeof x === "string") return x.length;
    if (x && typeof x === "object") return Object.keys(x).length;
    return 0;
  });
  env.define("typeof", function (x) {
    return typeof x;
  });

  env.define("Math", Math);

  return env;
}

export function run(src, env = null) {
  const program = parse(src);
  const globalEnv = env || createGlobalEnv();
  return evaluate(program, globalEnv);
}
