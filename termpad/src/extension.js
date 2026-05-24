const vscode = require('vscode');
const { TermpadViewProvider } = require('./panelProvider');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    const provider = new TermpadViewProvider(context.extensionUri, context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(TermpadViewProvider.viewType, provider)
    );
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
