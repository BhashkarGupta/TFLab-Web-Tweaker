(async () => {
    // --- Constants ---
    const OFFICE_DOMAINS = [
        'officeapps.live.com',
        'office.com',
        'cloud.microsoft',
        'onedrive.live.com'
    ];

    // const OFFICE_HEADER_CSS = `
    //     #Header, #AppHeaderPanel, #WacFrame_Excel_0_Header, div[data-role="header"],
    //     #OneNoteWeb_Header, .cui-ribbonTopBars, #sp-appBar, /* Additional potential selectors */
    //     div[id$="Header"], div[class*="header-"], header
    //     { display: none !important; }
    // `;
    const OFFICE_HEADER_CSS = `
        #Header, #AppHeaderPanel, #WacFrame_Excel_0_Header, 
        #OneNoteWeb_Header, #O365_NavHeader, 
        div[data-role="header"], 
        .o365cs-base
        { display: none !important; }
    `;

    let styleElement = null;
    let customStyleElement = null;
    let observer = null;

    // --- Main Execution ---

    // 1. Initial Load
    const data = await chrome.storage.sync.get(['global_office_fix', 'settings']);
    applySettings(data, false);

    // 2. Storage Listener (Real-time updates)
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync') {
            chrome.storage.sync.get(['global_office_fix', 'settings'], (newData) => {
                applySettings(newData, true);
            });
        }
    });

    // 3. Message Listener for On-Demand Script Execution
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'EXECUTE_SCRIPT_CONTENT') {
            try {
                runScriptCode(request.code, request.name || 'Manual Script');
                sendResponse({ success: true });
            } catch (err) {
                sendResponse({ success: false, error: err.message });
            }
            return true;
        }
    });

    // --- Functions ---

    function applySettings(data, isUpdate = false) {
        const hostname = window.location.hostname;
        const globalOfficeFix = data.global_office_fix !== false; // Default true
        const domainSettings = (data.settings && data.settings[hostname]) || {};

        // A. Office Header Hiding
        handleOfficeFix(hostname, globalOfficeFix);

        // B. Custom Element Hider
        handleCustomSelectors(domainSettings.customSelectors || []);

        // C. Custom JavaScript Execution
        handleCustomScripts(domainSettings.customScripts || [], isUpdate);

        // D. Force Same Tab handled by background.js
    }

    function handleOfficeFix(hostname, isEnabled) {
        // Check if current hostname is an Office domain
        const isOffice = OFFICE_DOMAINS.some(d => hostname.endsWith(d));

        if (isOffice && isEnabled) {
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = 'web-tweaker-office-fix';
                document.head.appendChild(styleElement);
            }
            styleElement.textContent = OFFICE_HEADER_CSS; // Use the const
        } else {
            if (styleElement) {
                styleElement.textContent = '';
            }
        }
    }

    function handleCustomSelectors(selectors) {
        if (!customStyleElement) {
            customStyleElement = document.createElement('style');
            customStyleElement.id = 'web-tweaker-custom-css';
            document.head.appendChild(customStyleElement);
        }

        if (!selectors || selectors.length === 0) {
            customStyleElement.textContent = '';
            return;
        }

        const activeSelectors = selectors
            .filter(s => s.active)
            .map(s => s.selector)
            .join(', ');

        if (activeSelectors) {
            customStyleElement.textContent = `${activeSelectors} { display: none !important; }`;
        } else {
            customStyleElement.textContent = '';
        }
    }

    function handleCustomScripts(scripts, isUpdate = false) {
        // Only trigger auto-run scripts on initial page load to prevent duplicate runs on settings change
        if (isUpdate) return;
        if (!scripts || !Array.isArray(scripts) || scripts.length === 0) return;

        const autoScripts = scripts.filter(s => s.active && s.autoRun !== false);

        autoScripts.forEach(script => {
            const timing = script.runAt || 'dom_ready';

            if (timing === 'start') {
                runScriptCode(script.code, script.name);
            } else if (timing === 'load') {
                if (document.readyState === 'complete') {
                    runScriptCode(script.code, script.name);
                } else {
                    window.addEventListener('load', () => {
                        runScriptCode(script.code, script.name);
                    }, { once: true });
                }
            } else {
                // 'dom_ready' (default)
                if (document.readyState !== 'loading') {
                    runScriptCode(script.code, script.name);
                } else {
                    document.addEventListener('DOMContentLoaded', () => {
                        runScriptCode(script.code, script.name);
                    }, { once: true });
                }
            }
        });
    }

    function runScriptCode(code, name = 'Custom Script') {
        if (!code || typeof code !== 'string' || !code.trim()) return;
        try {
            const scriptEl = document.createElement('script');
            scriptEl.className = 'web-tweaker-injected-script';
            scriptEl.textContent = `/* [Web Tweaker] ${(name || 'Custom Script').replace(/[*\/]/g, '')} */\n(function() {\n  try {\n${code}\n  } catch (err) {\n    console.error("[Web Tweaker] Runtime error in '${(name || 'Script').replace(/'/g, "\\'")}':", err);\n  }\n})();`;
            (document.head || document.documentElement).appendChild(scriptEl);
            scriptEl.remove();
        } catch (e) {
            console.error(`[Web Tweaker] Injection failed for '${name}':`, e);
        }
    }

})();

