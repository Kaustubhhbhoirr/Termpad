(function () {
    const vscode = acquireVsCodeApi();
    
    let currentButtons = [];
    let currentPlatform = 'win32';

    // Per-OS commands — auto-detected, no visible UI
    const osCommands = {
        win32: {
            clear: [
                { cmd: "cls", label: "🧹 clear" },
                { cmd: "cls & echo.", label: "🧨 hard reset" }
            ],
            navigate: [
                { cmd: "cd -", label: "↩️ cd -" },
                { cmd: "cd ..", label: "⬆️ cd .." },
                { cmd: "cd", label: "📍 pwd" },
                { cmd: "dir", label: "📂 dir" }
            ],
            process: [
                { cmd: "tasklist | findstr ", label: "🔎 ps grep" },
                { cmd: "taskkill /PID ", label: "☠️ kill" },
                { cmd: "taskmgr", label: "📈 taskmgr" }
            ],
            git: [
                { cmd: "git status", label: "👀 status" },
                { cmd: "git add .", label: "➕ add ." },
                { cmd: 'git commit -m ""', label: "📝 commit", isCommit: true },
                { cmd: "git push", label: "🚀 push" },
                { cmd: "git pull", label: "📥 pull" },
                { cmd: "git log --oneline -10", label: "📜 log" },
                { cmd: "git diff", label: "🔍 diff" },
                { cmd: "git stash", label: "📦 stash" }
            ]
        },
        darwin: {
            clear: [
                { cmd: "clear", label: "🧹 clear" },
                { cmd: 'printf "\\033c"', label: "🧨 hard reset" }
            ],
            navigate: [
                { cmd: "cd ~", label: "🏠 cd ~" },
                { cmd: "cd ..", label: "⬆️ cd .." },
                { cmd: "cd -", label: "↩️ cd -" },
                { cmd: "pwd", label: "📍 pwd" },
                { cmd: "ls -la", label: "📂 ls -la" }
            ],
            process: [
                { cmd: "ps aux | grep ", label: "🔎 ps grep" },
                { cmd: "kill -9 ", label: "☠️ kill" },
                { cmd: "top", label: "📈 top" }
            ],
            git: [
                { cmd: "git status", label: "👀 status" },
                { cmd: "git add .", label: "➕ add ." },
                { cmd: 'git commit -m ""', label: "📝 commit", isCommit: true },
                { cmd: "git push", label: "🚀 push" },
                { cmd: "git pull", label: "📥 pull" },
                { cmd: "git log --oneline -10", label: "📜 log" },
                { cmd: "git diff", label: "🔍 diff" },
                { cmd: "git stash", label: "📦 stash" }
            ]
        },
        linux: {
            clear: [
                { cmd: "clear", label: "🧹 clear" },
                { cmd: 'printf "\\033c"', label: "🧨 hard reset" }
            ],
            navigate: [
                { cmd: "cd ~", label: "🏠 cd ~" },
                { cmd: "cd ..", label: "⬆️ cd .." },
                { cmd: "cd -", label: "↩️ cd -" },
                { cmd: "pwd", label: "📍 pwd" },
                { cmd: "ls -la", label: "📂 ls -la" },
                { cmd: "df -h", label: "💾 df -h" }
            ],
            process: [
                { cmd: "ps aux | grep ", label: "🔎 ps grep" },
                { cmd: "kill -9 ", label: "☠️ kill" },
                { cmd: "top", label: "📈 top" },
                { cmd: "htop", label: "📊 htop" }
            ],
            git: [
                { cmd: "git status", label: "👀 status" },
                { cmd: "git add .", label: "➕ add ." },
                { cmd: 'git commit -m ""', label: "📝 commit", isCommit: true },
                { cmd: "git push", label: "🚀 push" },
                { cmd: "git pull", label: "📥 pull" },
                { cmd: "git log --oneline -10", label: "📜 log" },
                { cmd: "git diff", label: "🔍 diff" },
                { cmd: "git stash", label: "📦 stash" }
            ]
        }
    };

    function renderBuiltInCommands() {
        const cmds = osCommands[currentPlatform] || osCommands['linux'];
        ['clear', 'navigate', 'process', 'git'].forEach(sectionId => {
            const grid = document.getElementById(`${sectionId}-grid`);
            if (!grid) return;
            
            grid.innerHTML = cmds[sectionId].map(cmd => {
                const isCommit = cmd.isCommit ? 'git-commit-btn' : '';
                return `<button class="cmd-btn ${isCommit}" data-cmd='${cmd.cmd}'>${cmd.label}</button>`;
            }).join('');
        });

        // Render terminal type buttons
        const terminalTypes = osTerminals[currentPlatform] || osTerminals['linux'];
        const termGrid = document.getElementById('terminal-grid');
        if (termGrid) {
            termGrid.innerHTML = terminalTypes.map(t =>
                `<button class="cmd-btn open-terminal-btn" data-shell="${t.shell}" data-name="${t.name}">${t.label}</button>`
            ).join('');
        }
    }

    // Per-OS terminal types
    const osTerminals = {
        win32: [
            { shell: "powershell.exe", name: "PowerShell", label: "⚡ PowerShell" },
            { shell: "cmd.exe", name: "CMD", label: "🖥️ CMD" },
            { shell: "C:\\Program Files\\Git\\bin\\bash.exe", name: "Git Bash", label: "🐙 Git Bash" },
            { shell: "wsl.exe", name: "WSL", label: "🐧 WSL" }
        ],
        darwin: [
            { shell: "/bin/zsh", name: "zsh", label: "🐚 zsh" },
            { shell: "/bin/bash", name: "bash", label: "💻 bash" },
            { shell: "/usr/local/bin/fish", name: "fish", label: "🐟 fish" }
        ],
        linux: [
            { shell: "/bin/bash", name: "bash", label: "💻 bash" },
            { shell: "/bin/zsh", name: "zsh", label: "🐚 zsh" },
            { shell: "/usr/bin/fish", name: "fish", label: "🐟 fish" },
            { shell: "/bin/sh", name: "sh", label: "📜 sh" }
        ]
    };

    // Handle terminal open button clicks
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('open-terminal-btn')) {
            const shell = e.target.getAttribute('data-shell');
            const name = e.target.getAttribute('data-name');
            vscode.postMessage({
                type: 'openTerminal',
                shellPath: shell,
                shellName: name
            });
        }
    });

    // --- Search functionality ---
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    searchInput.addEventListener('input', () => {
        filterButtons(searchInput.value.toLowerCase());
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterButtons('');
    });

    function filterButtons(query) {
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            const buttons = section.querySelectorAll('.cmd-btn, .custom-btn-wrapper');
            let hasVisible = false;
            
            buttons.forEach(btn => {
                let text = '';
                if (btn.classList.contains('custom-btn-wrapper')) {
                    text = btn.querySelector('.cmd-btn').textContent.toLowerCase();
                } else {
                    text = btn.textContent.toLowerCase();
                }
                
                if (text.includes(query)) {
                    btn.style.display = 'flex';
                    hasVisible = true;
                } else {
                    btn.style.display = 'none';
                }
            });
            
            if (!hasVisible && buttons.length > 0) {
                section.style.display = 'none';
            } else if (buttons.length > 0) {
                if (section.id === 'section-recent' && document.getElementById('history-container').children.length === 0) {
                    section.style.display = 'none';
                } else {
                    section.style.display = 'flex';
                }
            }
        });
    }

    // --- Import / Export ---
    document.getElementById('import-btn').addEventListener('click', () => {
        vscode.postMessage({ type: 'importButtons' });
    });

    document.getElementById('export-btn').addEventListener('click', () => {
        vscode.postMessage({ type: 'exportButtons' });
    });

    // --- Git Commit Popup ---
    const gitCommitPopup = document.getElementById('git-commit-popup');
    const gitCommitMsg = document.getElementById('git-commit-msg');
    
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('git-commit-btn')) {
            e.stopPropagation();
            gitCommitPopup.style.display = 'flex';
            gitCommitMsg.focus();
        }
    });

    document.getElementById('git-commit-cancel').addEventListener('click', () => {
        gitCommitPopup.style.display = 'none';
        gitCommitMsg.value = '';
    });

    document.getElementById('git-commit-confirm').addEventListener('click', () => {
        submitGitCommit();
    });

    gitCommitMsg.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            submitGitCommit();
        } else if (e.key === 'Escape') {
            gitCommitPopup.style.display = 'none';
            gitCommitMsg.value = '';
        }
    });

    function submitGitCommit() {
        const msg = gitCommitMsg.value.replace(/"/g, '\\"');
        vscode.postMessage({
            type: 'runCommand',
            command: `git commit -m "${msg}"`
        });
        gitCommitPopup.style.display = 'none';
        gitCommitMsg.value = '';
    }

    // --- Add custom button & Multi-step ---
    const multiCmdContainer = document.getElementById('multi-cmd-container');
    document.getElementById('add-step-link').addEventListener('click', (e) => {
        e.preventDefault();
        const step = document.createElement('div');
        step.className = 'cmd-step';
        step.innerHTML = `<input type="text" class="custom-cmd-input" placeholder="Command (e.g. npm run build)">`;
        multiCmdContainer.appendChild(step);
    });

    document.getElementById('add-custom-btn').addEventListener('click', () => {
        const labelInput = document.getElementById('custom-label');
        const cmdInputs = document.querySelectorAll('.custom-cmd-input');
        
        const label = labelInput.value.trim();
        const commands = Array.from(cmdInputs).map(inp => inp.value.trim()).filter(val => val);
        const command = commands.join(' && ');

        if (label && command) {
            vscode.postMessage({
                type: 'addCustomButton',
                label: label,
                command: command
            });
            
            labelInput.value = '';
            multiCmdContainer.innerHTML = `<div class="cmd-step"><input type="text" class="custom-cmd-input" placeholder="Command (e.g. npm run build)"></div>`;
        }
    });

    // --- General Event Delegation ---
    document.addEventListener('click', (e) => {
        const cmdBtn = e.target.closest('.cmd-btn');
        if (cmdBtn && !cmdBtn.classList.contains('git-commit-btn')) {
            const command = cmdBtn.getAttribute('data-cmd');
            if (command) {
                vscode.postMessage({
                    type: 'runCommand',
                    command: command
                });
            }
        }
        
        if (e.target && e.target.classList.contains('delete-btn')) {
            const id = e.target.getAttribute('data-id');
            if (id) {
                vscode.postMessage({
                    type: 'deleteCustomButton',
                    id: id
                });
            }
        }
    });

    // --- Drag and Drop Sections ---
    let draggedSection = null;
    const sectionsContainer = document.getElementById('sections-container');

    sectionsContainer.addEventListener('dragstart', (e) => {
        if (e.target.closest('.section-header')) {
            const section = e.target.closest('.section');
            if (section) {
                draggedSection = section;
                setTimeout(() => section.classList.add('section-dragging'), 0);
            }
        }
    });

    sectionsContainer.addEventListener('dragend', () => {
        if (draggedSection) {
            draggedSection.classList.remove('section-dragging');
            document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
            
            const orderedSections = Array.from(sectionsContainer.querySelectorAll('.section'))
                                        .map(s => s.getAttribute('data-section-id'));
            
            vscode.postMessage({
                type: 'reorderSections',
                order: orderedSections
            });
            
            draggedSection = null;
        }
    });

    sectionsContainer.addEventListener('dragover', (e) => {
        if (!draggedSection) return;
        e.preventDefault();
        
        const afterElement = getDragAfterSection(sectionsContainer, e.clientY);
        document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
        
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        
        if (afterElement == null) {
            sectionsContainer.appendChild(indicator);
            sectionsContainer.appendChild(draggedSection);
        } else {
            sectionsContainer.insertBefore(indicator, afterElement);
            sectionsContainer.insertBefore(draggedSection, afterElement);
        }
    });

    function getDragAfterSection(container, y) {
        const draggableElements = [...container.querySelectorAll('.section:not(.section-dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // --- Drag and Drop Custom Buttons ---
    let draggedButton = null;
    const customContainer = document.getElementById('custom-buttons-container');

    function initButtonDragAndDrop(container) {
        container.addEventListener('dragstart', (e) => {
            if (e.target.closest('.drag-handle')) {
                const wrapper = e.target.closest('.custom-btn-wrapper');
                if (wrapper) {
                    draggedButton = wrapper;
                    wrapper.setAttribute('draggable', 'true');
                    setTimeout(() => wrapper.classList.add('dragging'), 0);
                }
            } else {
                e.preventDefault();
            }
        });

        container.addEventListener('dragend', () => {
            if (draggedButton) {
                draggedButton.classList.remove('dragging');
                draggedButton.removeAttribute('draggable');
            }
            draggedButton = null;
            
            const wrappers = Array.from(container.querySelectorAll('.custom-btn-wrapper'));
            const newOrder = wrappers.map(w => w.getAttribute('data-id'));
            
            vscode.postMessage({
                type: 'reorderButtons',
                ids: newOrder
            });
        });

        container.addEventListener('dragover', (e) => {
            if (!draggedButton) return;
            e.preventDefault();
            const afterElement = getDragAfterButton(container, e.clientX, e.clientY);
            if (afterElement == null) {
                container.appendChild(draggedButton);
            } else {
                container.insertBefore(draggedButton, afterElement);
            }
        });
    }

    function getDragAfterButton(container, x, y) {
        const draggableElements = [...container.querySelectorAll('.custom-btn-wrapper:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const dist = Math.sqrt(Math.pow(x - (box.left + box.width / 2), 2) + Math.pow(y - (box.top + box.height / 2), 2));
            if (dist < closest.offset) {
                return { offset: dist, element: child };
            }
            return closest;
        }, { offset: Number.POSITIVE_INFINITY }).element;
    }

    initButtonDragAndDrop(customContainer);

    // --- Message Handling ---
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'updateCustomButtons':
                currentButtons = message.buttons || [];
                renderCustomButtons();
                break;
            case 'updateHistory':
                renderHistory(message.history);
                break;
            case 'workspaceInfo':
                currentPlatform = message.platform || 'win32';
                if (message.sectionOrder) {
                    const container = document.getElementById('sections-container');
                    message.sectionOrder.forEach(sectionId => {
                        const sec = document.getElementById('section-' + sectionId);
                        if (sec) container.appendChild(sec);
                    });
                }
                renderBuiltInCommands();
                renderCustomButtons();
                break;
        }
    });

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function createButtonHTML(btn) {
        const isMulti = btn.command.includes('&&');
        const badge = isMulti ? '<span class="multi-badge">⚡</span>' : '';
        const escapedCmd = escapeHtml(btn.command);
        return `
            <div class="custom-btn-wrapper" data-id="${btn.id}">
                <div class="drag-handle" title="Drag to reorder">⠿</div>
                <button class="cmd-btn" data-cmd="${escapedCmd}" title="${escapedCmd}">
                    ${badge}${escapeHtml(btn.label)}
                </button>
                <button class="delete-btn" data-id="${btn.id}" title="Delete button">🗑️</button>
            </div>
        `;
    }

    function renderCustomButtons() {
        customContainer.innerHTML = currentButtons.map(btn => createButtonHTML(btn)).join('');
        filterButtons(searchInput.value.toLowerCase());
    }

    function renderHistory(history) {
        const container = document.getElementById('history-container');
        const section = document.getElementById('section-recent');
        
        if (!history || history.length === 0) {
            section.style.display = 'none';
            return;
        }
        
        section.style.display = 'flex';
        container.innerHTML = history.map(cmd => {
            const isMulti = cmd.includes('&&');
            const badge = isMulti ? '<span class="multi-badge">⚡</span>' : '';
            const escaped = escapeHtml(cmd);
            return `<button class="cmd-btn" data-cmd="${escaped}" title="${escaped}">🕒 ${badge}${escaped}</button>`;
        }).join('');
        
        filterButtons(searchInput.value.toLowerCase());
    }

    // Request initial data
    vscode.postMessage({ type: 'getWorkspaceInfo' });
    vscode.postMessage({ type: 'getCustomButtons' });
    vscode.postMessage({ type: 'getHistory' });

}());
