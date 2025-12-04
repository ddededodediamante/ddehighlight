#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parse } = require("../src/parser.js");
const { evaluate } = require("../src/evaluator.js");
const { scriptFunctions } = require("../src/functions.js");

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: dde <file.dde>");
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), args[0]);
if (!fs.existsSync(filePath)) {
  console.error("File not found:", filePath);
  process.exit(1);
}

const code = fs.readFileSync(filePath, "utf-8");

let ast;
try {
  ast = parse(code);
} catch (err) {
  console.error("Parse error:", err.message);
  process.exit(1);
}

const environment = {};
const functions = scriptFunctions(console.log);
let result = null;

try {
  for (const stmt of ast.body) {
    result = evaluate(stmt, environment, functions);
  }
} catch (err) {
  if (err.__return !== undefined) {
    result = err.__return;
  } else {
    console.error("Runtime error:", err.message);
    process.exit(1);
  }
}

console.log("=== Result ===");
console.log(result);
