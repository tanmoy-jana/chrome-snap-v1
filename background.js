// Listen for keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'take-screenshot') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: activateSelectionMode
        });
    }
});

// Listen for extension icon click
chrome.action.onClicked.addListener(async (tab) => {
    // Activate selection mode on the current tab
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: activateSelectionMode
    });
});

function activateSelectionMode() {
    // Send message to content script to activate selection mode
    window.postMessage({ type: 'ACTIVATE_SELECTION_MODE' }, '*');
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'CAPTURE_SCREENSHOT') {
        captureScreenshot(request.area, sendResponse);
        return true; // Keep the message channel open for async response
    }
});

async function captureScreenshot(area, sendResponse) {
    try {
        // Capture the visible tab
        const dataUrl = await chrome.tabs.captureVisibleTab(null, {
            format: 'png'
        });
        
        sendResponse({ imageUrl: dataUrl, area: area });
    } catch (error) {
        console.error('Error capturing screenshot:', error);
        sendResponse({ error: error.message });
    }
}
