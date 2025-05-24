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

function activate(context) {
  const outputChannel = vscode.window.createOutputChannel("DDE Run");

  const provider = vscode.languages.registerCompletionItemProvider(
    "dde",
    {
      provideCompletionItems(document) {
        const text = document.getText();
        const variables = [];
        try {
          const tokens = tokenize(text);
          const parser = new Parser(tokens);
          const ast = parser.parse();
          for (const node of ast) {
            if (node.type === "assignment") {
              variables.push(node.name);
            }
          }
        } catch {}

        const suggestions = [
          ...Object.keys(scriptFunctions()).map((name) => {
            const item = new vscode.CompletionItem(
              name,
              vscode.CompletionItemKind.Function
            );
            item.detail = "Built-in function";
            return item;
          }),
          ...variables.map((name) => {
            const item = new vscode.CompletionItem(
              name,
              vscode.CompletionItemKind.Variable
            );
            item.detail = "Declared variable";
            return item;
          }),
        ];

        return suggestions;
      },
    },
    ""
  );
  context.subscriptions.push(provider);

  const command = vscode.commands.registerCommand("dde.runFile", () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor to run");
      return;
    }

    const doc = editor.document;
    if (!doc.fileName.endsWith(".dde")) {
      vscode.window.showErrorMessage("This command only works with .dde files");
      return;
    }

    outputChannel.clear();
    const code = doc.getText();
    const { result, environment } = interpret(code, outputChannel);

    outputChannel.appendLine("\n=== Final Result ===");
    outputChannel.appendLine(JSON.stringify(result, null, 2));
    outputChannel.appendLine("=== Environment ===");
    outputChannel.appendLine(JSON.stringify(environment, null, 2));
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
