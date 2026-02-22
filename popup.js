document.addEventListener('DOMContentLoaded', async () => {
    // --- Elements ---
    const globalOfficeFixToggle = document.getElementById('global-office-fix');
    const officeSection = document.getElementById('office-section');
    const forceSameTabToggle = document.getElementById('force-same-tab');
    const currentDomainDisplay = document.getElementById('current-domain-display');
    const selectorInput = document.getElementById('selector-input');
    const addSelectorBtn = document.getElementById('add-selector-btn');
    const selectorList = document.getElementById('selector-list');

    // Theme Elements
    const themeToggleBtn = document.getElementById('theme-toggle');
    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');

    // Data Elements
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');

    // --- State ---
    let currentDomain = '';
    let settings = {};
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

    // 2. Get current tab data
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url) {
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
        } else {
            forceSameTabToggle.checked = false;
            renderSelectors([]);
        }
    });

    // --- Event Listeners ---

    // Global Office Fix
    globalOfficeFixToggle.addEventListener('change', () => {
        chrome.storage.sync.set({ global_office_fix: globalOfficeFixToggle.checked });
    });

    // Force Same Tab
    forceSameTabToggle.addEventListener('change', () => {
        if (!currentDomain) return;
        updateDomainSetting(currentDomain, 'forceSameTab', forceSameTabToggle.checked);
    });

    // Add Selector
    addSelectorBtn.addEventListener('click', addSelector);
    selectorInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addSelector();
    });

    // Top-level Export/Import Listeners
    exportBtn.addEventListener('click', exportSettings);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importSettings);

    // --- Functions ---

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
                delete data.theme; // Remove from sync data object

                // 1. Update Sync Storage (Site settings)
                chrome.storage.sync.clear(() => {
                    chrome.storage.sync.set(data, () => {
                        // 2. Update Local Storage (Theme)
                        if (theme) {
                            chrome.storage.local.set({ theme }, () => {
                                applyTheme(theme);
                                // Reload to reflect changes
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

    function addSelector() {
        const selector = selectorInput.value.trim();
        if (!selector || !currentDomain) return;

        // Get current selectors for this domain
        const domainSettings = settings[currentDomain] || {};
        const selectors = domainSettings.customSelectors || [];

        // Add new selector
        selectors.push({
            id: Date.now(),
            selector: selector,
            active: true
        });

        // Save
        updateDomainSetting(currentDomain, 'customSelectors', selectors);

        // Clear input and re-render
        selectorInput.value = '';
        renderSelectors(selectors);
    }

    function removeSelector(id) {
        if (!currentDomain) return;
        const domainSettings = settings[currentDomain] || {};
        const selectors = domainSettings.customSelectors || [];
        const newSelectors = selectors.filter(s => s.id !== id);
        updateDomainSetting(currentDomain, 'customSelectors', newSelectors);
        renderSelectors(newSelectors);
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

    function updateDomainSetting(domain, key, value) {
        if (!settings[domain]) settings[domain] = {};
        settings[domain][key] = value;
        chrome.storage.sync.set({ settings: settings });
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
            name.title = item.selector; // tooltip for long selectors

            // Controls
            const controls = document.createElement('div');
            controls.className = 'selector-controls';

            // Toggle
            const toggleLabel = document.createElement('label');
            toggleLabel.className = 'toggle-switch';
            toggleLabel.style.width = '32px'; // Smaller toggle
            toggleLabel.style.height = '18px';

            const toggleInput = document.createElement('input');
            toggleInput.type = 'checkbox';
            toggleInput.checked = item.active;
            toggleInput.addEventListener('change', () => toggleSelector(item.id, toggleInput.checked));

            const slider = document.createElement('span');
            slider.className = 'slider';
            // Adjust slider pseudo-element for smaller size via inline style or class modification
            toggleLabel.style.transform = "scale(0.8)";


            toggleLabel.appendChild(toggleInput);
            toggleLabel.appendChild(slider);

            // Delete
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-delete btn-icon';
            deleteBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            `;
            deleteBtn.addEventListener('click', () => removeSelector(item.id));

            controls.appendChild(toggleLabel);
            controls.appendChild(deleteBtn);

            el.appendChild(name);
            el.appendChild(controls);

            selectorList.appendChild(el);
        });
    }
});
