document.getElementById('takeSnapshotBtn').addEventListener('click', async () => {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject the selection overlay into the current page
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: activateSelectionMode
    });
    
    // Close the popup
    window.close();
});

function activateSelectionMode() {
    // Send message to content script to activate selection mode
    window.postMessage({ type: 'ACTIVATE_SELECTION_MODE' }, '*');
}
