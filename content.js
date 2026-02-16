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
    // Being a bit aggressive with the selector list to ensure it hits.
    // Refined based on prompt: "#Header, #AppHeaderPanel, #WacFrame_Excel_0_Header, div[data-role='header']"

    let styleElement = null;
    let customStyleElement = null;
    let observer = null;

    // --- Main Execution ---

    // 1. Initial Load
    const data = await chrome.storage.sync.get(['global_office_fix', 'settings']);
    // Window.open override is now handled by background.js (MAIN world injection)
    applySettings(data);

    // 2. Storage Listener (Real-time updates)
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync') {
            chrome.storage.sync.get(['global_office_fix', 'settings'], (newData) => {
                applySettings(newData);
            });
        }
    });

    // --- Functions ---

    function applySettings(data) {
        const hostname = window.location.hostname;
        const globalOfficeFix = data.global_office_fix !== false; // Default true
        const domainSettings = (data.settings && data.settings[hostname]) || {};

        // A. Office Header Hiding
        handleOfficeFix(hostname, globalOfficeFix);

        // B. Custom Element Hider
        handleCustomSelectors(domainSettings.customSelectors || []);

        // C. Force Same Tab handled by background.js, 
        // but we assume dynamic toggling might need reload for window.open,
        // or we could signal background? 
        // For now, removing isolated world implementation.
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

})();
