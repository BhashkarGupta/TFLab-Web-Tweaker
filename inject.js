(function () {
    // Check if we already injected to avoid duplicates
    if (window.webTweakerOpenOverridden) return;
    window.webTweakerOpenOverridden = true;

    // 1. Override window.open
    const originalOpen = window.open;
    window.open = function (url, target, features) {
        // Force target to _self
        return originalOpen.call(window, url, '_self', features);
    };

    // 2. Link Sanitizer
    if (window.webTweakerObserverActive) return;
    window.webTweakerObserverActive = true;

    const removeTargetBlank = () => {
        document.querySelectorAll('a[target="_blank"]').forEach(function (link) {
            link.removeAttribute("target");
        });
    };

    // Run on initial load
    removeTargetBlank();

    // Observe
    const observer = new MutationObserver(function (mutations) {
        let shouldScan = false;
        mutations.forEach(function (mutation) {
            if (mutation.type === 'childList') {
                if (mutation.addedNodes.length > 0) shouldScan = true;
            } else if (mutation.type === 'attributes' && mutation.attributeName === 'target') {
                shouldScan = true;
            }
        });
        if (shouldScan) removeTargetBlank();
    });

    observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['target']
    });

    console.log("Web Tweaker: Force Same Tab logic activated.");
})();
