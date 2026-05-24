const vscode = require('vscode');

class TermpadViewProvider {
    static viewType = 'termpad.panel';

    constructor(extensionUri, context) {
        this._extensionUri = extensionUri;
        this._context = context;
        this._view = undefined;
    }

    resolveWebviewView(webviewView, context, token) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'runCommand':
                    this._runCommand(data.command);
                    break;
                case 'openTerminal':
                    this._openTerminal(data.shellPath, data.shellName);
                    break;
                case 'addCustomButton':
                    this._addCustomButton(data.label, data.command);
                    break;
                case 'deleteCustomButton':
                    this._deleteCustomButton(data.id);
                    break;
                case 'getCustomButtons':
                    this._sendCustomButtons();
                    break;
                case 'reorderButtons':
                    this._reorderButtons(data.ids);
                    break;
                case 'exportButtons':
                    await this._exportButtons();
                    break;
                case 'importButtons':
                    await this._importButtons();
                    break;
                case 'getHistory':
                    this._sendHistory();
                    break;
                case 'getWorkspaceInfo':
                    this._sendWorkspaceInfo();
                    break;
                case 'reorderSections':
                    this._reorderSections(data.order);
                    break;
            }
        });
    }

    _runCommand(command) {
        let terminal = vscode.window.activeTerminal;
        if (!terminal) {
            terminal = vscode.window.createTerminal("TermPad");
        }
        terminal.show();
        terminal.sendText(command);
        this._addHistory(command);
    }

    _openTerminal(shellPath, shellName) {
        const terminal = vscode.window.createTerminal({
            name: shellName || 'Terminal',
            shellPath: shellPath || undefined
        });
        terminal.show();
    }

    _addHistory(command) {
        let history = this._context.globalState.get('termpad.history') || [];
        history = history.filter(c => c !== command);
        history.unshift(command);
        if (history.length > 5) {
            history.pop();
        }
        this._context.globalState.update('termpad.history', history).then(() => {
            this._sendHistory();
        });
    }

    _sendHistory() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateHistory',
                history: this._context.globalState.get('termpad.history') || []
            });
        }
    }

    _getCustomButtonsList() {
        return this._context.globalState.get('termpad.customButtons') || [];
    }

    _addCustomButton(label, command) {
        const buttons = this._getCustomButtonsList();
        const newButton = { id: Date.now().toString(), label, command };
        buttons.push(newButton);
        this._context.globalState.update('termpad.customButtons', buttons).then(() => {
            this._sendCustomButtons();
        });
    }

    _deleteCustomButton(id) {
        let buttons = this._getCustomButtonsList();
        buttons = buttons.filter(btn => btn.id !== id);
        this._context.globalState.update('termpad.customButtons', buttons).then(() => {
            this._sendCustomButtons();
        });
    }

    _reorderButtons(ids) {
        const buttons = this._getCustomButtonsList();
        const newButtons = [];
        ids.forEach(id => {
            const btn = buttons.find(b => b.id === id);
            if (btn) newButtons.push(btn);
        });
        this._context.globalState.update('termpad.customButtons', newButtons);
    }

    async _exportButtons() {
        const buttons = this._getCustomButtonsList();
        const uri = await vscode.window.showSaveDialog({
            filters: { 'JSON': ['json'] },
            defaultUri: vscode.Uri.file('termpad-buttons.json')
        });
        if (uri) {
            const uint8Array = new TextEncoder().encode(JSON.stringify(buttons, null, 2));
            await vscode.workspace.fs.writeFile(uri, uint8Array);
            vscode.window.showInformationMessage('TermPad buttons exported successfully!');
        }
    }

    async _importButtons() {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { 'JSON': ['json'] }
        });
        if (uris && uris.length > 0) {
            try {
                const uint8Array = await vscode.workspace.fs.readFile(uris[0]);
                const content = new TextDecoder().decode(uint8Array);
                const data = JSON.parse(content);
                
                let incomingButtons = [];
                if (Array.isArray(data)) {
                    incomingButtons = data;
                } else if (data.global) {
                    incomingButtons = data.global;
                }

                if (!Array.isArray(incomingButtons)) return;

                const currentButtons = this._getCustomButtonsList();
                const currentCommands = new Set(currentButtons.map(b => b.command));
                
                let added = 0;
                incomingButtons.forEach(btn => {
                    if (btn.label && btn.command && !currentCommands.has(btn.command)) {
                        currentButtons.push({
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                            label: btn.label,
                            command: btn.command
                        });
                        added++;
                    }
                });

                await this._context.globalState.update('termpad.customButtons', currentButtons);
                this._sendCustomButtons();
                vscode.window.showInformationMessage(`Imported ${added} new buttons.`);
            } catch (err) {
                vscode.window.showErrorMessage('Failed to parse JSON file.');
            }
        }
    }

    _sendCustomButtons() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateCustomButtons',
                buttons: this._getCustomButtonsList()
            });
        }
    }

    _reorderSections(order) {
        this._context.globalState.update('termpad.sectionOrder', order);
    }

    _sendWorkspaceInfo() {
        const sectionOrder = this._context.globalState.get('termpad.sectionOrder') || [
            'recent', 'terminal', 'clear', 'navigate', 'git', 'process', 'own'
        ];

        if (this._view) {
            this._view.webview.postMessage({
                type: 'workspaceInfo',
                platform: process.platform,
                sectionOrder
            });
        }
    }

    _getHtmlForWebview(webview) {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'panel.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <link href="${styleUri}" rel="stylesheet">
                <title>TermPad</title>
            </head>
            <body>
                <div class="container">
                    <div class="panel-header">
                        <span class="panel-title">TermPad</span>
                        <span class="panel-version">v1.0.0</span>
                    </div>
                    <div class="top-bar">
                        <div class="search-container">
                            <span class="search-icon">🔍</span>
                            <input type="text" id="search-input" placeholder="Search commands...">
                            <button id="clear-search-btn" title="Clear search">✕</button>
                        </div>
                    </div>



                    <div class="sections-container" id="sections-container">
                        <div class="section" id="section-recent" data-section-id="recent" style="display: none;">
                            <div class="section-header" draggable="true">
                                <div class="section-drag-handle" title="Drag to reorder section">⠿</div>
                                <h3>Recent</h3>
                            </div>
                            <div class="button-grid" id="history-container">
                            </div>
                        </div>

                        <div class="section" id="section-terminal" data-section-id="terminal">
                            <div class="section-header" draggable="true">
                                <div class="section-drag-handle" title="Drag to reorder section">⠿</div>
                                <h3>Open Terminal</h3>
                            </div>
                            <div class="button-grid" id="terminal-grid">
                            </div>
                        </div>

                        <div class="section" id="section-clear" data-section-id="clear">
                            <div class="section-header" draggable="true">
                                <div class="section-drag-handle" title="Drag to reorder section">⠿</div>
                                <h3>Clear & Reset</h3>
                            </div>
                            <div class="button-grid" id="clear-grid">
                            </div>
                        </div>

                        <div class="section" id="section-navigate" data-section-id="navigate">
                            <div class="section-header" draggable="true">
                                <div class="section-drag-handle" title="Drag to reorder section">⠿</div>
                                <h3>Navigate</h3>
                            </div>
                            <div class="button-grid" id="navigate-grid">
                            </div>
                        </div>

                        <div class="section" id="section-git" data-section-id="git">
                            <div class="section-header" draggable="true">
                                <div class="section-drag-handle" title="Drag to reorder section">⠿</div>
                                <h3>Git</h3>
                            </div>
                            <div class="button-grid" id="git-grid">
                            </div>
                            <div id="git-commit-popup" class="inline-popup" style="display: none;">
                                <input type="text" id="git-commit-msg" placeholder="Commit message..." />
                                <div class="popup-actions">
                                    <button id="git-commit-confirm">Commit</button>
                                    <button id="git-commit-cancel">Cancel</button>
                                </div>
                            </div>
                        </div>

                        <div class="section" id="section-process" data-section-id="process">
                            <div class="section-header" draggable="true">
                                <div class="section-drag-handle" title="Drag to reorder section">⠿</div>
                                <h3>Process</h3>
                            </div>
                            <div class="button-grid" id="process-grid">
                            </div>
                        </div>

                        <div class="section" id="section-own" data-section-id="own">
                            <div class="section-header" draggable="true">
                                <div class="section-drag-handle" title="Drag to reorder section">⠿</div>
                                <h3>Your Own</h3>
                            </div>
                            <div class="button-grid" id="custom-buttons-container">
                                <!-- Custom buttons will be injected here -->
                            </div>
                            
                            <div class="add-custom-container">
                                <input type="text" id="custom-label" placeholder="Label (e.g. build)">
                                <div id="multi-cmd-container">
                                    <div class="cmd-step">
                                        <input type="text" class="custom-cmd-input" placeholder="Command (e.g. npm run build)">
                                    </div>
                                </div>
                                <a href="#" id="add-step-link">+ Add step</a>
                                <button id="add-custom-btn">✨ Add Command</button>
                            </div>
                        </div>
                    </div>

                    <div class="import-export-footer">
                        <button id="import-btn" title="Import buttons from JSON">📥 Import</button>
                        <button id="export-btn" title="Export buttons to JSON">📤 Export</button>
                    </div>
                </div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

module.exports = {
    TermpadViewProvider
};
