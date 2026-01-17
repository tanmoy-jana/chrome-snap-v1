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
