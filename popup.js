document.addEventListener('DOMContentLoaded', async () => {
    // --- Elements ---
    const globalOfficeFixToggle = document.getElementById('global-office-fix');
    const officeSection = document.getElementById('office-section');
    const forceSameTabToggle = document.getElementById('force-same-tab');
    const currentDomainDisplay = document.getElementById('current-domain-display');

    // CSS Selector Elements
    const selectorInput = document.getElementById('selector-input');
    const addSelectorBtn = document.getElementById('add-selector-btn');
    const cancelSelectorEditBtn = document.getElementById('cancel-selector-edit-btn');
    const selectorList = document.getElementById('selector-list');

    // Custom Script Elements
    const openAddScriptBtn = document.getElementById('open-add-script-btn');
    const scriptEditor = document.getElementById('script-editor');
    const editorTitle = document.getElementById('editor-title');
    const closeEditorBtn = document.getElementById('close-editor-btn');
    const scriptNameInput = document.getElementById('script-name-input');
    const scriptAutorunInput = document.getElementById('script-autorun-input');
    const autorunHint = document.getElementById('autorun-hint');
    const scriptRunatSelect = document.getElementById('script-runat-select');
    const scriptCodeInput = document.getElementById('script-code-input');
    const testRunBtn = document.getElementById('test-run-btn');
    const cancelScriptBtn = document.getElementById('cancel-script-btn');
    const saveScriptBtn = document.getElementById('save-script-btn');
    const scriptList = document.getElementById('script-list');

    // Theme Elements
    const themeToggleBtn = document.getElementById('theme-toggle');
    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');

    // Data Elements
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');

    // Feedback Toast Element
    const toastEl = document.getElementById('toast');

    // --- State ---
    let currentDomain = '';
    let currentTabId = null;
    let settings = {};
    let editingScriptId = null;
    let editingSelectorId = null;
    let toastTimeout = null;

    const OFFICE_DOMAINS = [
        'officeapps.live.com',
        'office.com',
        'cloud.microsoft',
        'onedrive.live.com'
    ];

    // --- Initialization ---

    // 1. Theme Logic
    chrome.storage.local.get(['theme'], (result) => {
        const theme = result.theme || 'dark'; // Default to dark
        applyTheme(theme);
    });

    function applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            iconSun.classList.add('hidden');
            iconMoon.classList.remove('hidden');
        } else {
            document.body.classList.remove('light-theme');
            iconSun.classList.remove('hidden');
            iconMoon.classList.add('hidden');
        }
    }

    themeToggleBtn.addEventListener('click', () => {
        const isLight = document.body.classList.contains('light-theme');
        const newTheme = isLight ? 'dark' : 'light';
        applyTheme(newTheme);
        chrome.storage.local.set({ theme: newTheme });
    });

    // 2. Get current active tab data
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url) {
        currentTabId = tabs[0].id;
        try {
            const url = new URL(tabs[0].url);
            currentDomain = url.hostname;
            currentDomainDisplay.textContent = currentDomain;

            // Check if Office Domain to show/hide Global Section
            const isOffice = OFFICE_DOMAINS.some(d => currentDomain.endsWith(d));
            officeSection.style.display = isOffice ? 'block' : 'none';

        } catch (e) {
            currentDomainDisplay.textContent = 'Invalid URL';
            officeSection.style.display = 'none';
        }
    } else {
        currentDomainDisplay.textContent = 'Unknown';
        officeSection.style.display = 'none';
    }

    // 3. Load settings from storage
    chrome.storage.sync.get(['global_office_fix', 'settings'], (data) => {
        // Global Office Fix
        if (data.global_office_fix === undefined) {
            globalOfficeFixToggle.checked = true; // Default to true
        } else {
            globalOfficeFixToggle.checked = data.global_office_fix;
        }

        settings = data.settings || {};

        // Domain specific settings
        if (currentDomain && settings[currentDomain]) {
            forceSameTabToggle.checked = !!settings[currentDomain].forceSameTab;
            renderSelectors(settings[currentDomain].customSelectors || []);
            renderScripts(settings[currentDomain].customScripts || []);
        } else {
            forceSameTabToggle.checked = false;
            renderSelectors([]);
            renderScripts([]);
        }
    });

    // --- Toast Notification ---
    function showToast(message, isError = false) {
        if (!toastEl) return;
        if (toastTimeout) clearTimeout(toastTimeout);

        toastEl.textContent = message;
        toastEl.className = 'toast';
        if (isError) {
            toastEl.classList.add('toast-error');
        } else {
            toastEl.classList.add('toast-success');
        }

        toastTimeout = setTimeout(() => {
            toastEl.classList.add('hidden');
        }, 2200);
    }

    // --- Event Listeners ---

    // Global Office Fix
    globalOfficeFixToggle.addEventListener('change', () => {
        chrome.storage.sync.set({ global_office_fix: globalOfficeFixToggle.checked });
        showToast('Office fix setting updated');
    });

    // Force Same Tab
    forceSameTabToggle.addEventListener('change', () => {
        if (!currentDomain) return;
        updateDomainSetting(currentDomain, 'forceSameTab', forceSameTabToggle.checked);
        showToast('Same tab setting updated');
    });

    // CSS Selectors
    addSelectorBtn.addEventListener('click', addOrUpdateSelector);
    selectorInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addOrUpdateSelector();
    });
    if (cancelSelectorEditBtn) {
        cancelSelectorEditBtn.addEventListener('click', cancelSelectorEdit);
    }

    // Custom Scripts
    openAddScriptBtn.addEventListener('click', () => openScriptEditor());
    closeEditorBtn.addEventListener('click', closeScriptEditor);
    cancelScriptBtn.addEventListener('click', closeScriptEditor);
    saveScriptBtn.addEventListener('click', saveScript);
    testRunBtn.addEventListener('click', testRunCurrentCode);

    // Support Tab indentation in code editor textarea
    scriptCodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = scriptCodeInput.selectionStart;
            const end = scriptCodeInput.selectionEnd;
            scriptCodeInput.value = scriptCodeInput.value.substring(0, start) + '  ' + scriptCodeInput.value.substring(end);
            scriptCodeInput.selectionStart = scriptCodeInput.selectionEnd = start + 2;
        }
    });

    // Export / Import
    exportBtn.addEventListener('click', exportSettings);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importSettings);

    // --- CSS Selector Functions ---

    function addOrUpdateSelector() {
        const selectorText = selectorInput.value.trim();
        if (!selectorText || !currentDomain) return;

        const domainSettings = settings[currentDomain] || {};
        const selectors = domainSettings.customSelectors || [];

        if (editingSelectorId) {
            // Update existing
            const target = selectors.find(s => s.id === editingSelectorId);
            if (target) {
                target.selector = selectorText;
            }
            updateDomainSetting(currentDomain, 'customSelectors', selectors);
            cancelSelectorEdit();
            showToast('Selector updated');
        } else {
            // Add new
            selectors.push({
                id: Date.now(),
                selector: selectorText,
                active: true
            });
            updateDomainSetting(currentDomain, 'customSelectors', selectors);
            selectorInput.value = '';
            showToast('Selector added');
        }

        renderSelectors(selectors);
    }

    function startEditSelector(id) {
        const domainSettings = settings[currentDomain] || {};
        const selectors = domainSettings.customSelectors || [];
        const target = selectors.find(s => s.id === id);
        if (!target) return;

        editingSelectorId = id;
        selectorInput.value = target.selector;
        addSelectorBtn.textContent = 'Update';
        if (cancelSelectorEditBtn) cancelSelectorEditBtn.classList.remove('hidden');
        selectorInput.focus();
    }

    function cancelSelectorEdit() {
        editingSelectorId = null;
        selectorInput.value = '';
        addSelectorBtn.textContent = 'Add';
        if (cancelSelectorEditBtn) cancelSelectorEditBtn.classList.add('hidden');
    }

    function removeSelector(id) {
        if (!currentDomain) return;
        if (editingSelectorId === id) cancelSelectorEdit();

        const domainSettings = settings[currentDomain] || {};
        const selectors = domainSettings.customSelectors || [];
        const newSelectors = selectors.filter(s => s.id !== id);
        updateDomainSetting(currentDomain, 'customSelectors', newSelectors);
        renderSelectors(newSelectors);
        showToast('Selector removed');
    }

    function toggleSelector(id, isActive) {
        if (!currentDomain) return;
        const domainSettings = settings[currentDomain] || {};
        const selectors = domainSettings.customSelectors || [];
        const selector = selectors.find(s => s.id === id);
        if (selector) {
            selector.active = isActive;
            updateDomainSetting(currentDomain, 'customSelectors', selectors);
        }
    }

    function renderSelectors(selectors) {
        selectorList.innerHTML = '';

        if (!selectors || selectors.length === 0) {
            selectorList.innerHTML = '<div class="empty-state">No custom rules for this domain</div>';
            return;
        }

        selectors.forEach(item => {
            const el = document.createElement('div');
            el.className = 'selector-item';

            // Name
            const name = document.createElement('span');
            name.className = 'selector-name';
            name.textContent = item.selector;
            name.title = item.selector;

            // Controls
            const controls = document.createElement('div');
            controls.className = 'selector-controls';

            // Edit Button
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-icon btn-edit';
            editBtn.title = 'Edit selector';
            editBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            `;
            editBtn.addEventListener('click', () => startEditSelector(item.id));

            // Toggle
            const toggleLabel = document.createElement('label');
            toggleLabel.className = 'toggle-switch toggle-sm';

            const toggleInput = document.createElement('input');
            toggleInput.type = 'checkbox';
            toggleInput.checked = item.active;
            toggleInput.addEventListener('change', () => toggleSelector(item.id, toggleInput.checked));

            const slider = document.createElement('span');
            slider.className = 'slider';

            toggleLabel.appendChild(toggleInput);
            toggleLabel.appendChild(slider);

            // Delete Button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-delete btn-icon';
            deleteBtn.title = 'Delete selector';
            deleteBtn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            `;
            deleteBtn.addEventListener('click', () => removeSelector(item.id));

            controls.appendChild(editBtn);
            controls.appendChild(toggleLabel);
            controls.appendChild(deleteBtn);

            el.appendChild(name);
            el.appendChild(controls);

            selectorList.appendChild(el);
        });
    }

    // --- Custom JavaScript Functions ---

    function updateAutorunHint() {
        if (!autorunHint) return;
        const isChecked = scriptAutorunInput.checked;
        autorunHint.textContent = isChecked ? 'Enabled' : 'Disabled';
        autorunHint.style.color = isChecked ? 'var(--accent-color)' : 'var(--text-secondary)';
    }

    scriptAutorunInput.addEventListener('change', updateAutorunHint);

    function openScriptEditor(script = null) {
        if (script) {
            // Edit Mode
            editingScriptId = script.id;
            editorTitle.textContent = 'Edit Script';
            scriptNameInput.value = script.name || '';
            scriptAutorunInput.checked = script.autoRun !== false;
            scriptRunatSelect.value = script.runAt || 'dom_ready';
            scriptCodeInput.value = script.code || '';
            saveScriptBtn.textContent = 'Update Script';
        } else {
            // New Script Mode
            editingScriptId = null;
            editorTitle.textContent = 'New Script';
            scriptNameInput.value = '';
            scriptAutorunInput.checked = true;
            scriptRunatSelect.value = 'dom_ready';
            scriptCodeInput.value = '';
            saveScriptBtn.textContent = 'Save Script';
        }

        updateAutorunHint();
        scriptEditor.classList.remove('hidden');
        scriptNameInput.focus();
    }

    function closeScriptEditor() {
        editingScriptId = null;
        scriptEditor.classList.add('hidden');
    }

    function saveScript() {
        if (!currentDomain) return;

        const name = scriptNameInput.value.trim() || 'Untitled Script';
        const code = scriptCodeInput.value.trim();
        const autoRun = scriptAutorunInput.checked;
        const runAt = scriptRunatSelect.value;

        if (!code) {
            showToast('Please enter JavaScript code', true);
            scriptCodeInput.focus();
            return;
        }

        const domainSettings = settings[currentDomain] || {};
        const scripts = domainSettings.customScripts || [];

        if (editingScriptId) {
            // Update existing
            const target = scripts.find(s => s.id === editingScriptId);
            if (target) {
                target.name = name;
                target.code = code;
                target.autoRun = autoRun;
                target.runAt = runAt;
            }
            showToast('Script updated');
        } else {
            // Add new
            scripts.push({
                id: Date.now(),
                name: name,
                code: code,
                active: true,
                autoRun: autoRun,
                runAt: runAt
            });
            showToast('Script saved');
        }

        updateDomainSetting(currentDomain, 'customScripts', scripts);
        renderScripts(scripts);
        closeScriptEditor();
    }

    function removeScript(id) {
        if (!currentDomain) return;
        if (editingScriptId === id) closeScriptEditor();

        const domainSettings = settings[currentDomain] || {};
        const scripts = domainSettings.customScripts || [];
        const newScripts = scripts.filter(s => s.id !== id);

        updateDomainSetting(currentDomain, 'customScripts', newScripts);
        renderScripts(newScripts);
        showToast('Script deleted');
    }

    function toggleScriptActive(id, isActive) {
        if (!currentDomain) return;
        const domainSettings = settings[currentDomain] || {};
        const scripts = domainSettings.customScripts || [];
        const script = scripts.find(s => s.id === id);
        if (script) {
            script.active = isActive;
            updateDomainSetting(currentDomain, 'customScripts', scripts);
        }
    }

    async function runScriptNow(script, playBtn) {
        if (!currentTabId) {
            showToast('No active tab found', true);
            return;
        }

        if (playBtn) {
            playBtn.classList.remove('success', 'error');
            playBtn.classList.add('running');
        }

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'EXECUTE_SCRIPT_ON_TAB',
                tabId: currentTabId,
                code: script.code,
                name: script.name
            });

            if (playBtn) playBtn.classList.remove('running');

            if (response && response.success) {
                if (playBtn) {
                    playBtn.classList.add('success');
                    setTimeout(() => playBtn.classList.remove('success'), 1500);
                }
                showToast(`Executed: "${script.name}"`);
            } else {
                if (playBtn) {
                    playBtn.classList.add('error');
                    setTimeout(() => playBtn.classList.remove('error'), 2500);
                }
                showToast(`Error: ${response?.error || 'Failed to execute'}`, true);
            }
        } catch (err) {
            if (playBtn) {
                playBtn.classList.remove('running');
                playBtn.classList.add('error');
                setTimeout(() => playBtn.classList.remove('error'), 2500);
            }
            showToast(`Error: ${err.message}`, true);
        }
    }

    async function testRunCurrentCode() {
        const code = scriptCodeInput.value.trim();
        const name = scriptNameInput.value.trim() || 'Test Script';

        if (!code) {
            showToast('Enter code before testing', true);
            return;
        }

        if (!currentTabId) {
            showToast('No active tab found', true);
            return;
        }

        testRunBtn.textContent = 'Running...';
        testRunBtn.style.opacity = '0.7';

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'EXECUTE_SCRIPT_ON_TAB',
                tabId: currentTabId,
                code: code,
                name: name
            });

            testRunBtn.textContent = '▶ Test Run';
            testRunBtn.style.opacity = '1';

            if (response && response.success) {
                showToast('Test execution succeeded on page!');
            } else {
                showToast(`Error: ${response?.error || 'Execution failed'}`, true);
            }
        } catch (err) {
            testRunBtn.textContent = '▶ Test Run';
            testRunBtn.style.opacity = '1';
            showToast(`Error: ${err.message}`, true);
        }
    }

    function renderScripts(scripts) {
        scriptList.innerHTML = '';

        if (!scripts || scripts.length === 0) {
            scriptList.innerHTML = '<div class="empty-state">No custom scripts for this domain</div>';
            return;
        }

        scripts.forEach(item => {
            const el = document.createElement('div');
            el.className = 'script-item';

            // Script Info
            const info = document.createElement('div');
            info.className = 'script-info';

            const titleRow = document.createElement('div');
            titleRow.className = 'script-title-row';

            const name = document.createElement('span');
            name.className = 'script-name';
            name.textContent = item.name || 'Untitled Script';
            name.title = item.name || 'Untitled Script';

            const badge = document.createElement('span');
            if (item.autoRun !== false) {
                badge.className = 'badge badge-autorun';
                badge.textContent = 'Auto';
                badge.title = `Runs automatically on ${item.runAt === 'start' ? 'Document Start' : item.runAt === 'load' ? 'Page Load' : 'DOM Ready'}`;
            } else {
                badge.className = 'badge badge-manual';
                badge.textContent = 'Manual';
                badge.title = 'Run on demand via Play button';
            }

            titleRow.appendChild(name);
            titleRow.appendChild(badge);

            const preview = document.createElement('div');
            preview.className = 'script-preview';
            const firstLine = (item.code || '').replace(/[\r\n]+/g, ' ').trim();
            preview.textContent = firstLine || '// empty';
            preview.title = item.code || '';

            info.appendChild(titleRow);
            info.appendChild(preview);

            // Controls
            const controls = document.createElement('div');
            controls.className = 'script-controls';

            // Play Button (Run Once)
            const playBtn = document.createElement('button');
            playBtn.className = 'btn-icon btn-play';
            playBtn.title = 'Run this script now on the current page';
            playBtn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
            `;
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                runScriptNow(item, playBtn);
            });

            // Edit Button
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-icon btn-edit';
            editBtn.title = 'Edit script';
            editBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            `;
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openScriptEditor(item);
            });

            // Active Toggle
            const toggleLabel = document.createElement('label');
            toggleLabel.className = 'toggle-switch toggle-sm';
            toggleLabel.title = item.active ? 'Disable script' : 'Enable script';

            const toggleInput = document.createElement('input');
            toggleInput.type = 'checkbox';
            toggleInput.checked = !!item.active;
            toggleInput.addEventListener('change', () => toggleScriptActive(item.id, toggleInput.checked));

            const slider = document.createElement('span');
            slider.className = 'slider';

            toggleLabel.appendChild(toggleInput);
            toggleLabel.appendChild(slider);

            // Delete Button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-delete btn-icon';
            deleteBtn.title = 'Delete script';
            deleteBtn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            `;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeScript(item.id);
            });

            controls.appendChild(playBtn);
            controls.appendChild(editBtn);
            controls.appendChild(toggleLabel);
            controls.appendChild(deleteBtn);

            el.appendChild(info);
            el.appendChild(controls);

            scriptList.appendChild(el);
        });
    }

    // --- Domain Settings Storage Helper ---

    function updateDomainSetting(domain, key, value) {
        if (!settings[domain]) settings[domain] = {};
        settings[domain][key] = value;
        chrome.storage.sync.set({ settings: settings });
    }

    // --- Import / Export ---

    function exportSettings() {
        chrome.storage.sync.get(null, (items) => {
            chrome.storage.local.get(['theme'], (localItems) => {
                const exportData = {
                    ...items,
                    theme: localItems.theme
                };

                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'web-tweaker-settings.json';
                a.click();
                URL.revokeObjectURL(url);
                showToast('Config exported successfully');
            });
        });
    }

    function importSettings(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                // Separate local vs sync data
                const theme = data.theme;
                delete data.theme; // Remove theme from sync data object

                // 1. Update Sync Storage (Site settings, Office fix, Custom Selectors, Custom Scripts)
                chrome.storage.sync.clear(() => {
                    chrome.storage.sync.set(data, () => {
                        // 2. Update Local Storage (Theme)
                        if (theme) {
                            chrome.storage.local.set({ theme }, () => {
                                applyTheme(theme);
                                location.reload();
                            });
                        } else {
                            location.reload();
                        }
                    });
                });
            } catch (err) {
                console.error("Import failed:", err);
                alert("Failed to import settings. Invalid JSON file.");
            }
        };
        reader.readAsText(file);
        // Reset file input so change event fires again if same file selected
        importFile.value = '';
    }
});
