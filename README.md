# TFLab Web Tweaker

TFLab Web Tweaker is a powerful Chrome Extension designed to give you more control over your web browsing experience. It offers tools to declutter web pages, specifically targeting Microsoft Office Web Apps, and allows for custom element hiding on any domain.

## Features

### 🛠️ Office Web App Fixes
- **Hide MS Office Header:** reclaimed screen space by hiding the bulky top header in Microsoft Office Web Apps (Word, Excel, PowerPoint Online, etc.).

### 🌐 Navigation Control
- **Force Same-Tab Navigation:** Optionally force links to open in the current tab instead of a new window/tab (automatically strips `target="_blank"` from links).

### 🎨 UI Customization
- **Custom Element Hider:** easily hide distracting elements (like ads, banners, or sidebars) on any website by entering their CSS selectors.
- **Per-Domain Settings:** customizations are saved specifically for the domain you are visiting.

### ⚙️ Management & Extras
- **Dark/Light Mode:** meaningful support for both dark and light themes.
- **Import/Export:** backup and share your configuration settings.

## Installation

1.  **Download:** Clone this repository or download the source code to your computer.
2.  **Open Extensions:** Open Google Chrome and navigate to `chrome://extensions/`.
3.  **Developer Mode:** Toggle the **Developer mode** switch in the top right corner.
4.  **Load Extension:** Click automatically **Load unpacked** button.
5.  **Select Folder:** Browse to and select the folder containing the extension files (where `manifest.json` is located).

## Usage

1.  Click the extension icon in your browser toolbar.
2.  Use the toggles to enable/disable features.
3.  To hide an element, enter its CSS selector (e.g., `.ad-banner`, `#sidebar`) in the input field and click **Add**.
4.  Your settings are automatically saved for the current site.

## Privacy

All settings and customizations are stored locally on your device using Chrome's storage API. No data is sent to external servers.

---
Powered by [TechFixerLab](https://www.techfixerlab.com/)
