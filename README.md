# TFLab Web Tweaker

TFLab Web Tweaker is a powerful Chrome Extension designed to give you full control over your web browsing experience. It offers tools to declutter web pages, run custom JavaScript snippets on demand or on page load, target Microsoft Office Web Apps, force same-tab navigation, and hide custom elements on any domain.

## Features

### Custom JavaScript Snippets
- **Multi-Script Support:** Configure one or more custom JavaScript snippets per website/domain.
- **Flexible Execution Modes:**
  - **Auto-run on Page Load:** Scripts can run automatically whenever the page loads.
  - **Run Once via Play Button (▶):** Click the Play button in the popup to execute any script on demand on the active tab without having to reload the page.
- **Execution Timing Controls:**
  - *DOM Ready:* Executes when the DOM content is ready (ideal for manipulating elements).
  - *Immediate (Start):* Injected immediately at document start (ideal for intercepting window APIs).
  - *Page Loaded:* Executes after full window load (images, stylesheets).
- **Interactive Code Editor:**
  - In-popup script editor with syntax-friendly styling and 2-space Tab indentation support.
  - **▶ Test Run Button:** Test script code on the active page before saving.
  - Edit script name, code, auto-run state, and timing anytime.
  - Enable / disable toggle switch per script.
  - Remove / delete script option.

### UI Customization & CSS Element Hider
- **Custom Element Hider:** Easily hide distracting elements (like ads, cookie notices, or banners) on any website by entering CSS selectors.
- **Editable Rules:** Edit existing selectors, toggle them on/off, or remove them with a single click.
- **Per-Domain Settings:** Rules are saved specifically for the domain you are visiting.

### Office Web App Fixes
- **Hide MS Office Header:** Reclaim screen space by hiding the bulky top header in Microsoft Office Web Apps (Word, Excel, PowerPoint Online, OneNote, etc.).

### Navigation Control
- **Force Same-Tab Navigation:** Force links to open in the current tab instead of opening a new tab or window (automatically sanitizes `target="_blank"` and overrides `window.open`).

### Management & Extras
- **Dark/Light Mode:** Full dark and light theme support with quick toggle.
- **Import/Export:** Export all your custom CSS selectors, JavaScript snippets, domain rules, and settings into a single clean JSON backup file, and import it anytime.
- **Reliable MV3 Architecture:** Uses multi-tiered execution (`chrome.userScripts`, `chrome.scripting`, and isolated content script messaging) with full error boundaries so one error in a script never disrupts other scripts or the page.

## Installation

1. **Download:** Clone this repository or download the source code to your computer.
2. **Open Extensions:** Open Google Chrome and navigate to `chrome://extensions/`.
3. **Developer Mode:** Toggle the **Developer mode** switch in the top right corner.
4. **Load Extension:** Click the **Load unpacked** button.
5. **Select Folder:** Browse to and select the folder containing the extension files (where `manifest.json` is located).

## Usage

1. Click the extension icon in your browser toolbar on any webpage.
2. **To Add Custom JavaScript:**
   - Click **+ Add Script**.
   - Enter a name and your JavaScript code.
   - Choose whether to auto-run on page load, or use manual execution only.
   - Click **▶ Test Run** to see it run on your page immediately, then click **Save Script**.
   - Click the **▶ Play button** on any script in the list to execute it instantly on the current tab.
3. **To Hide Elements:**
   - Enter a CSS selector (e.g., `.ad-banner`, `#sidebar`) in the Custom Element Hider field and click **Add**.
   - Click the edit icon to tweak any selector.
4. **To Backup or Restore:**
   - Click **Export Config** to save your CSS and JavaScript configurations to a JSON file.
   - Click **Import Config** to restore settings on any machine.

## Privacy

All settings, selectors, and scripts are stored locally on your device using Chrome's storage API. No data is sent to external servers.

---
Powered by [TechFixerLab](https://www.techfixerlab.com/)
