chrome.webNavigation.onCommitted.addListener(async (details) => {
    injectLogic(details.tabId, details.frameId, details.url);
});

async function injectLogic(tabId, frameId, urlStr) {
    try {
        const url = new URL(urlStr);
        const data = await chrome.storage.sync.get(['settings']);
        const settings = data.settings || {};
        const domainSettings = settings[url.hostname];

        if (domainSettings && domainSettings.forceSameTab) {
            chrome.scripting.executeScript({
                target: { tabId: tabId, frameIds: [frameId] },
                files: ["inject.js"],
                world: "MAIN",
                injectImmediately: true
            }).catch(err => {
                // Ignore errors for frames where we lack permission or that are closed
                console.debug("Injection failed for frame", frameId, err);
            });
        }
    } catch (e) {
        console.error("Error in injectLogic:", e);
    }
}

// Re-inject on setting change 
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.settings) {
    }
});

// Listener for on-demand script execution from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXECUTE_SCRIPT_ON_TAB') {
        executeScriptOnTab(request.tabId, request.code, request.name)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ success: false, error: err.message || 'Execution failed' }));
        return true; // Keep message channel open for async response
    }
});

async function executeScriptOnTab(tabId, code, name) {
    if (!tabId || !code) {
        return { success: false, error: "Missing tabId or script code." };
    }

    const scriptTitle = name || 'Custom Script';

    // 1. Try chrome.userScripts.execute if available (Chrome 135+, bypasses strict CSP)
    if (typeof chrome !== 'undefined' && chrome.userScripts && typeof chrome.userScripts.execute === 'function') {
        try {
            const wrappedCode = `/* [Web Tweaker] ${scriptTitle} */\n(function() {\n  try {\n${code}\n  } catch (err) {\n    console.error("[Web Tweaker] Runtime error in '${scriptTitle.replace(/'/g, "\\'")}':", err);\n  }\n})();`;
            await chrome.userScripts.execute({
                target: { tabId },
                js: [{ code: wrappedCode }]
            });
            return { success: true };
        } catch (e) {
            console.debug("chrome.userScripts.execute unavailable or failed, falling back to scripting:", e);
        }
    }

    // 2. Try chrome.scripting.executeScript in MAIN world
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            world: "MAIN",
            func: (codeToInject, title) => {
                try {
                    const el = document.createElement('script');
                    el.textContent = `/* [Web Tweaker] ${title} */\n(function() {\n  try {\n${codeToInject}\n  } catch (err) {\n    console.error("[Web Tweaker] Runtime error in '${title.replace(/'/g, "\\'")}':", err);\n  }\n})();`;
                    (document.head || document.documentElement).appendChild(el);
                    el.remove();
                } catch (err) {
                    console.error("[Web Tweaker] Script injection error:", err);
                }
            },
            args: [code, scriptTitle]
        });
        return { success: true };
    } catch (scriptingErr) {
        // 3. Fallback: try messaging content script directly in that tab
        try {
            const response = await chrome.tabs.sendMessage(tabId, {
                action: 'EXECUTE_SCRIPT_CONTENT',
                code: code,
                name: scriptTitle
            });
            if (response && response.success) {
                return { success: true };
            }
        } catch (msgErr) {
            console.debug("Content script fallback message failed:", msgErr);
        }
        return { success: false, error: scriptingErr.message || "Failed to execute script on page." };
    }
}

