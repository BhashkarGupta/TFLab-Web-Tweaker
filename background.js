chrome.webNavigation.onCommitted.addListener(async (details) => {
    // We inject on committed to capture early window.open usage if possible, 
    // though the observer will handle dynamically added links.
    // We allow all frames because Office apps use iframes.

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

// Re-inject on setting change? 
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.settings) {
        // Optional: Implement dynamic re-injection if needed
    }
});
