// @ts-nocheck
export function scriptFunctions(outputFunction = console.log) {
  return {
    print: (...args) => {
      if (args.length < 1) {
        throw new Error("expected 1 argument, got 0");
      }
      outputFunction(args.join(" "));
      return args;
    },
    typeof: (x) => {
      if (x === null) return "null";
      return typeof x;
    },
    exit: () => {
      return process.exit(0);
    },
    random: (min, max, isFloat = false) => {
      if (min === undefined && max === undefined) {
        return Math.random();
      } else if (max === undefined) [max, min] = [min, 0];

      if (min > max) [min, max] = [max, min];

      if (isFloat) {
        return Math.random() * (max - min) + min;
      } else {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
    },
    isFart: (value) => {
      return value === "fart";
    },
    array: (length, fill) => {
      if (typeof length !== "number") {
        throw new Error("expected number argument, got " + typeof length);
      }

      return Array(length).fill(fill);
    },
  };
}

export function evaluate(
  node,
  environment = {},
  functions = scriptFunctions()
) {
  switch (node.type) {
    case "number":
    case "string":
    case "boolean":
      return node.value;
    case "null":
      return null;
    case "identifier":
      if (!(node.name in environment)) {
        throw new Error("undefined variable: " + node.name);
      }
      return environment[node.name];
    case "binary": {
      const left = evaluate(node.left, environment, functions);
      const right = evaluate(node.right, environment, functions);

      switch (node.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "==":
          return left === right;
        case "!=":
          return left !== right;
        case ">":
          return left > right;
        case "<":
          return left < right;
        case ">=":
          return left >= right;
        case "<=":
          return left <= right;
        default:
          throw new Error("unknown operator " + node.operator);
      }
    }
    case "array":
      return node.arguments.map((arg) => evaluate(arg, environment, functions));
    case "assignment": {
      let { expression } = node,
        value;

      if (expression.type === "function") {
        if (node.name in functions) {
          throw new Error("cannot redefine function " + node.name);
        }

        value = {
          type: "userFunction",
          params: expression.params,
          body: node.expression.body,
        };
      } else {
        value = evaluate(expression, environment, functions);
      }

      environment[node.name] = value;
      return value;
    }
    case "call": {
      const args = node.arguments.map((arg) =>
        evaluate(arg, environment, functions)
      );

      if (node.callee && node.callee.type === "property") {
        const obj = evaluate(node.callee.object, environment, functions);
        const prop = node.callee.property;
        if (Array.isArray(obj) && prop === "push") {
          obj.push(...args);
          return obj;
        }
        const method = obj?.[prop];
        if (typeof method === "function") {
          return method.apply(obj, args);
        }
        throw new Error(`property "${prop}" is not a function`);
      }

      if (
        node.callee &&
        node.callee.type === "identifier" &&
        typeof functions[node.callee.name] === "function"
      ) {
        return functions[node.callee.name](...args);
      }

      if (
        node.callee &&
        node.callee.type === "identifier" &&
        environment[node.callee.name]?.type === "userFunction"
      ) {
        const fn = environment[node.callee.name];
        const local = { ...environment };
        fn.params.forEach((p, i) => (local[p] = args[i]));
        try {
          return evaluate(fn.body, local, functions);
        } catch (e) {
          if (e.type === "return") return e.value;
          throw e;
        }
      }

      throw new Error(
        "unknown function: " + (node.callee?.name ?? node.callee?.property)
      );
    }
    case "block": {
      let result = null;

      for (const statement of node.arguments) {
        result = evaluate(statement, environment, functions);
      }

      return result;
    }
    case "if": {
      const condition = evaluate(node.condition, environment, functions);
      if (condition) {
        return evaluate(node.arguments, environment, functions);
      } else if (node.else) {
        return evaluate(node.else, environment, functions);
      }

      return null;
    }
    case "for": {
      const { item, index, iterable, body } = node;

      const iterableValue = evaluate(iterable, environment, functions);

      if (!Array.isArray(iterableValue)) {
        throw new Error("expected iterable, got " + typeof iterableValue);
      }

      let result = null;

      for (let i = 0; i < iterableValue.length; i++) {
        let local = { ...environment };
        local[item] = iterableValue[i];
        if (index) {
          local[index] = i;
        }

        result = evaluate(body, local, functions);
      }

      return result;
    }
    case "return": {
      throw {
        type: "return",
        value: evaluate(node.expression, environment, functions),
      };
    }
    case "function":
      throw new Error("functions must be assigned to a variable");
    case "property": {
      const object = evaluate(node.object, environment, functions);
      const property = node.property;

      if (Array.isArray(object)) {
        if (property === "length") return object.length;
      }

      return object[property];
    }
    default:
      throw new Error("unknown node type " + node.type);
  }
}
