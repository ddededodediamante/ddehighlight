const vscode = require("vscode");
const { parse } = require("./src/parser");
const { evaluate } = require("./src/evaluator");
const { scriptFunctions, Environment } = require("./src/functions");

function interpret(code, outputChannel) {
  let ast;
  try {
    ast = parse(code);
  } catch (error) {
    outputChannel.appendLine(`error on parse: ${error.message}`);
    return { result: null, environment: new Environment() };
  }

  const environment = new Environment();
  const functions = scriptFunctions((msg) => outputChannel.appendLine(msg));

  let lastValue = null;

  for (const stmt of ast.body) {
    try {
      lastValue = evaluate(stmt, environment, functions);
    } catch (err) {
      if (err.__return !== undefined) {
        lastValue = err.__return;
        break;
      } else if (!err.__exit) {
        outputChannel.appendLine(`error: ${err.message}`);
        break;
      }
    }
  }

  return { result: lastValue, environment };
}

function getDefinitions(code) {
  let ast;
  try {
    ast = parse(code);
  } catch {
    return { variables: [], functions: [] };
  }

  const variables = [];
  const functions = [];

  for (const stmt of ast.body) {
    if (stmt.type === "AssignmentStatement") {
      variables.push(stmt.name);
    }
    if (stmt.type === "FunctionDeclaration") {
      functions.push(stmt.id.name);
    }
  }

  return { variables, functions };
}

function extractFunctionArgs(fn) {
  const src = fn.toString();
  const m = src.match(/\(([^)]*)\)/);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function activate(context) {
  const outputChannel = vscode.window.createOutputChannel("DDE Run");
  const diagnostics = vscode.languages.createDiagnosticCollection("dde");
  context.subscriptions.push(diagnostics);

  function validateDocument(doc) {
    if (doc.languageId !== "dde") return;
    try {
      parse(doc.getText());
      diagnostics.set(doc.uri, []);
    } catch (err) {
      const line = (err.line || 1) - 1;
      const col = (err.column || 1) - 1;
      const range = new vscode.Range(line, col, line, col + 1);
      const diag = new vscode.Diagnostic(
        range,
        err.message,
        vscode.DiagnosticSeverity.Error
      );
      diagnostics.set(doc.uri, [diag]);
    }
  }

  vscode.workspace.textDocuments.forEach(validateDocument);
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(validateDocument),
    vscode.workspace.onDidChangeTextDocument((e) =>
      validateDocument(e.document)
    ),
    vscode.workspace.onDidCloseTextDocument((doc) =>
      diagnostics.delete(doc.uri)
    )
  );

  const completionProvider = vscode.languages.registerCompletionItemProvider(
    "dde",
    {
      provideCompletionItems(document, position) {
        const text = document.getText();
        const { variables, functions } = getDefinitions(text);
        const keywords = [
          "if",
          "else",
          "for",
          "in",
          "while",
          "return",
          "function",
          "null",
        ].map((i) => {
          const item = new vscode.CompletionItem(
            i,
            vscode.CompletionItemKind.Keyword
          );
          return item;
        });
        const vars = variables.map((name) => {
          const item = new vscode.CompletionItem(
            name,
            vscode.CompletionItemKind.Variable
          );
          item.detail = "Defined variable";
          return item;
        });
        const funcs = functions.map((name) => {
          const item = new vscode.CompletionItem(
            name,
            vscode.CompletionItemKind.Function
          );
          item.detail = "Defined function";
          return item;
        });
        const builtins = Object.keys(scriptFunctions()).map((name) => {
          const item = new vscode.CompletionItem(
            name,
            vscode.CompletionItemKind.Function
          );
          item.detail = "Built-in function";
          return item;
        });
        return [...vars, ...funcs, ...keywords, ...builtins];
      },
    },
    ".",
    " "
  );
  context.subscriptions.push(completionProvider);

  const signatureProvider = vscode.languages.registerSignatureHelpProvider(
    "dde",
    {
      provideSignatureHelp(document, position) {
        const text = document.getText();

        const line = document.lineAt(position.line).text;
        const prefix = line.slice(0, position.character);
        const m = prefix.match(/([a-zA-Z_]\w*)\s*\($/);
        if (!m) return null;
        const name = m[1];

        let params = [];
        const builtins = scriptFunctions();
        if (builtins[name]) params = extractFunctionArgs(builtins[name]);
        else {
          const { functions } = getDefinitions(text);
          if (functions.includes(name)) {
            const ast = parse(text);
            for (const stmt of ast.body) {
              if (
                stmt.type === "FunctionDeclaration" &&
                stmt.id.name === name
              ) {
                params = stmt.params.map((p) => p.name);
                break;
              }
            }
          }
        }

        if (!params.length) return null;

        const signature = new vscode.SignatureInformation(
          `${name}(${params.join(", ")})`
        );
        signature.parameters = params.map(
          (p) => new vscode.ParameterInformation(p)
        );
        const help = new vscode.SignatureHelp();
        help.signatures = [signature];
        help.activeSignature = 0;
        help.activeParameter = 0;
        return help;
      },
    },
    "(",
    ","
  );
  context.subscriptions.push(signatureProvider);

  const runCmd = vscode.commands.registerCommand("dde.runFile", () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return vscode.window.showErrorMessage("No active editor");

    const document = editor.document; 

    if (!document.fileName.endsWith(".dde")) {
      return vscode.window.showErrorMessage("Not a .dde file");
    }

    outputChannel.clear();

    const { result } = interpret(document.getText(), outputChannel);

    outputChannel.appendLine("=== Result ===");
    outputChannel.appendLine(JSON.stringify(result, null, 2));
    outputChannel.show(true);
  });

  context.subscriptions.push(runCmd);

  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBar.command = "dde.runFile";
  statusBar.tooltip = "Run DDE file and show environment";
  context.subscriptions.push(statusBar);

  statusBar.show();
}

function deactivate() {}

module.exports = { activate, deactivate };
