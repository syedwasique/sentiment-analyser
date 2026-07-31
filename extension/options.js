/**
 * MindPulse Chrome Extension — Options Script (options.js)
 */

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("extensionToggle");
  const saveMsg = document.getElementById("saveMsg");

  // Load current toggle state (default: true)
  chrome.storage.sync.get({ extensionEnabled: true }, (items) => {
    toggle.checked = items.extensionEnabled;
  });

  // Save toggle state on change
  toggle.addEventListener("change", () => {
    const enabled = toggle.checked;
    chrome.storage.sync.set({ extensionEnabled: enabled }, () => {
      saveMsg.style.opacity = "1";
      setTimeout(() => {
        saveMsg.style.opacity = "0";
      }, 1500);
    });
  });
});
