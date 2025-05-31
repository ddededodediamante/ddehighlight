const vscode = require("vscode");
const { tokenize } = require("./src/tokenization");
const { Parser } = require("./src/parser");
const { scriptFunctions, evaluate } = require("./src/evaluator");

function interpret(code, outputChannel) {
  const tokens = tokenize(code);
  const parser = new Parser(tokens);
  const ast = parser.parse();

  let lastResult;
  const environment = {};

  const functions = scriptFunctions((msg) => outputChannel.appendLine(msg));

  ast.forEach((node, index) => {
    try {
      lastResult = evaluate(node, environment, functions);
    } catch (error) {
      outputChannel.appendLine(`Error at line ${index + 1}: ${error.message}`);
    }
  });

  return { result: lastResult, environment };
}

function extractFunctionArgs(input) {
  if (typeof input !== "function") return [];
  const source = input.toString();
  const match = source.match(/\(([^)]*)\)/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s);
}

function activate(context) {
  const outputChannel = vscode.window.createOutputChannel("DDE Run");

  const provider = vscode.languages.registerCompletionItemProvider(
    "dde",
    {
      provideCompletionItems(document) {
        const text = document.getText();

        let ast = [];
        try {
          const tokens = tokenize(text);
          ast = new Parser(tokens).parse();
        } catch {}

        const variables = [];
        const functions = [];
        for (const node of ast) {
          if (node.type === "assignment") {
            if (node.expression.type === "function") {
              functions.push(node.name);
            } else {
              variables.push(node.name);
            }
          }
        }

        return [
          ...Object.keys(scriptFunctions()).map((name) => {
            const item = new vscode.CompletionItem(
              name,
              vscode.CompletionItemKind.Function
            );
            item.detail = "Built-in";
            return item;
          }),
          ...functions.map((name) => {
            const item = new vscode.CompletionItem(
              name,
              vscode.CompletionItemKind.Function
            );
            item.detail = "User-defined";
            return item;
          }),
          ...variables.map((name) => {
            const item = new vscode.CompletionItem(
              name,
              vscode.CompletionItemKind.Variable
            );
            item.detail = "Variable";
            return item;
          }),
        ];
      },
    },
    "" 
  );
  context.subscriptions.push(provider);

  const signatureProvider = vscode.languages.registerSignatureHelpProvider(
    "dde",
    {
      provideSignatureHelp(document, position) {
        const code = document.getText();
        let ast = [];
        try {
          ast = new Parser(tokenize(code)).parse();
        } catch {
          return null;
        }

        const allFunctions = {};
        for (const [name, input] of Object.entries(scriptFunctions())) {
          allFunctions[name] = extractFunctionArgs(input);
        }

        for (const node of ast) {
          if (
            node.type === "assignment" &&
            node.expression.type === "function"
          ) {
            allFunctions[node.name] = node.expression.params || [];
          }
        }

        const line = document
          .lineAt(position.line)
          .text.slice(0, position.character);

        const callMatch = line.match(/([a-zA-Z_][\w]*)\s*\(([^)]*)$/);
        if (!callMatch) return null;

        const [, functionName, argsSoFar] = callMatch;
        const params = allFunctions[functionName];
        if (!params) return null;

        const info = new vscode.SignatureInformation(
          `${functionName}(${params.join(", ")})`
        );
        info.parameters = params.map((p) => new vscode.ParameterInformation(p));

        const activeParameter = Math.min(
          argsSoFar.split(",").length - 1,
          params.length - 1
        );

        const signatureHelp = new vscode.SignatureHelp();
        signatureHelp.signatures = [info];
        signatureHelp.activeSignature = 0;
        signatureHelp.activeParameter = activeParameter;
        return signatureHelp;
      },
    },
    {
      triggerCharacters: ["(", ","],
      retriggerCharacters: [",", " "],
    }
  );
  context.subscriptions.push(signatureProvider);

  const command = vscode.commands.registerCommand("dde.runFile", () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return vscode.window.showErrorMessage("No active editor");

    const document = editor.document;
    if (!document.fileName.endsWith(".dde")) {
      return vscode.window.showErrorMessage("Not a .dde file");
    }

    outputChannel.clear();
    const { result } = interpret(document.getText(), outputChannel);
    outputChannel.appendLine("\n=== Result ===");
    outputChannel.appendLine(JSON.stringify(result, null, 2));
    outputChannel.show(true);
  });
  context.subscriptions.push(command);

  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBar.command = "dde.runFile";
  statusBar.text = "$(play) Run DDE";
  statusBar.tooltip = "Run current DDE file";
  statusBar.show();
  context.subscriptions.push(statusBar);
}

function deactivate() {}

module.exports = { activate, deactivate };
