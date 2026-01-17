let isSelectionMode = false;
let selectionBox = null;
let captureButton = null;
let overlay = null;
let isResizing = false;
let resizeHandle = null;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Listen for messages from the popup
window.addEventListener('message', (event) => {
    if (event.data.type === 'ACTIVATE_SELECTION_MODE') {
        activateSelectionMode();
    }
});

function activateSelectionMode() {
    if (isSelectionMode) return;
    
    isSelectionMode = true;
    createOverlay();
    createSelectionBox();
    createCaptureButton();
    showCenteredSelectionBox();
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'screenshot-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.3);
        z-index: 999998;
        cursor: default;
    `;
    document.body.appendChild(overlay);
}

function createSelectionBox() {
    selectionBox = document.createElement('div');
    selectionBox.id = 'screenshot-selection-box';
    selectionBox.style.cssText = `
        position: fixed;
        border: 2px dashed #4CAF50;
        background-color: rgba(76, 175, 80, 0.1);
        z-index: 999999;
        display: none;
        box-sizing: border-box;
        cursor: move;
    `;
    
    // Create resize handles
    const handles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
    handles.forEach(position => {
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        handle.dataset.position = position;
        handle.style.cssText = getHandleStyles(position);
        selectionBox.appendChild(handle);
    });
    
    selectionBox.addEventListener('mousedown', onBoxMouseDown);
    
    document.body.appendChild(selectionBox);
}

function getHandleStyles(position) {
    const size = '10px';
    const offset = '-5px';
    let styles = `
        position: absolute;
        background-color: #4CAF50;
        z-index: 1000000;
    `;
    
    if (position.includes('n')) styles += `top: ${offset};`;
    if (position.includes('s')) styles += `bottom: ${offset};`;
    if (position.includes('e')) styles += `right: ${offset};`;
    if (position.includes('w')) styles += `left: ${offset};`;
    
    if (position.length === 1) {
        // Edge handles
        if (position === 'n' || position === 's') {
            styles += `left: 50%; transform: translateX(-50%); width: 20px; height: ${size}; cursor: ns-resize;`;
        } else {
            styles += `top: 50%; transform: translateY(-50%); width: ${size}; height: 20px; cursor: ew-resize;`;
        }
    } else {
        // Corner handles
        styles += `width: ${size}; height: ${size}; cursor: ${position}-resize;`;
    }
    
    return styles;
}

function showCenteredSelectionBox() {
    // Try to load the last saved box dimensions and position
    chrome.storage.local.get(['lastSnapBox'], (result) => {
        let width = 300;
        let height = 400;
        let left = (window.innerWidth - width) / 2;
        let top = (window.innerHeight - height) / 2;
        
        // Use saved dimensions if available
        if (result.lastSnapBox) {
            width = result.lastSnapBox.width;
            height = result.lastSnapBox.height;
            left = result.lastSnapBox.left;
            top = result.lastSnapBox.top;
            
            // Ensure the box is still within viewport bounds
            if (left + width > window.innerWidth) {
                left = window.innerWidth - width - 20;
            }
            if (top + height > window.innerHeight) {
                top = window.innerHeight - height - 20;
            }
            if (left < 0) left = 10;
            if (top < 0) top = 10;
        }
        
        updateSelectionBox(left, top, width, height);
        
        // Position capture button
        captureButton.style.display = 'block';
        captureButton.style.left = `${left}px`;
        captureButton.style.top = `${top + height + 10}px`;
    });
}

function createCaptureButton() {
    captureButton = document.createElement('button');
    captureButton.id = 'screenshot-capture-btn';
    captureButton.textContent = 'Take Snapshot';
    captureButton.style.cssText = `
        position: fixed;
        padding: 10px 20px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        z-index: 1000000;
        display: none;
    `;
    
    captureButton.addEventListener('click', captureScreenshot);
    document.body.appendChild(captureButton);
}

function onBoxMouseDown(e) {
    if (e.target.classList.contains('resize-handle')) {
        isResizing = true;
        resizeHandle = e.target.dataset.position;
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    
    // Start dragging the box
    isDragging = true;
    const rect = selectionBox.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    e.preventDefault();
    e.stopPropagation();
}

function onMouseMove(e) {
    if (isResizing) {
        resizeSelection(e);
    } else if (isDragging) {
        moveSelection(e);
    }
}

function onMouseUp(e) {
    if (isDragging || isResizing) {
        const rect = selectionBox.getBoundingClientRect();
        captureButton.style.left = `${rect.left}px`;
        captureButton.style.top = `${rect.bottom + 10}px`;
        
        // Save the current box dimensions and position
        saveSnapBoxState(rect);
    }
    
    isDragging = false;
    isResizing = false;
    resizeHandle = null;
}

function moveSelection(e) {
    const left = e.clientX - dragOffsetX;
    const top = e.clientY - dragOffsetY;
    const rect = selectionBox.getBoundingClientRect();
    
    updateSelectionBox(left, top, rect.width, rect.height);
}

function resizeSelection(e) {
    const rect = selectionBox.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top;
    let width = rect.width;
    let height = rect.height;
    
    const pos = resizeHandle;
    
    if (pos.includes('n')) {
        const newTop = e.clientY;
        height = rect.bottom - newTop;
        top = newTop;
    }
    if (pos.includes('s')) {
        height = e.clientY - rect.top;
    }
    if (pos.includes('w')) {
        const newLeft = e.clientX;
        width = rect.right - newLeft;
        left = newLeft;
    }
    if (pos.includes('e')) {
        width = e.clientX - rect.left;
    }
    
    if (width > 20 && height > 20) {
        updateSelectionBox(left, top, width, height);
    }
}

function updateSelectionBox(left, top, width, height) {
    selectionBox.style.display = 'block';
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
}

async function captureScreenshot() {
    const rect = selectionBox.getBoundingClientRect();

    //const rect = selectionBox.getBoundingClientRect();
    saveSnapBoxState(rect);
    
    // Hide the selection UI temporarily
    selectionBox.style.display = 'none';
    captureButton.style.display = 'none';
    overlay.style.display = 'none';
    
    // Wait a bit for the UI to hide
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Capture the visible tab
    chrome.runtime.sendMessage({
        type: 'CAPTURE_SCREENSHOT',
        area: {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
            devicePixelRatio: window.devicePixelRatio
        }
    }, (response) => {
        if (response && response.imageUrl) {
            // Crop the image in the content script (has DOM access)
            cropAndDownload(response.imageUrl, response.area);
        }
        
        // Clean up
        deactivateSelectionMode();
    });
}

function cropAndDownload(dataUrl, area) {
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Account for device pixel ratio
        const dpr = area.devicePixelRatio || 1;
        
        canvas.width = area.width * dpr;
        canvas.height = area.height * dpr;
        
        // Draw the cropped portion
        ctx.drawImage(
            img,
            area.x * dpr,
            area.y * dpr,
            area.width * dpr,
            area.height * dpr,
            0,
            0,
            area.width * dpr,
            area.height * dpr
        );
        
        // Download the cropped image
        const croppedImageUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = croppedImageUrl;
        
        // Generate filename with page title and formatted date
        const pageTitle = document.title.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 50);
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const period = hours >= 12 ? 'pm' : 'am';
        const displayHours = String(hours % 12 || 12).padStart(2, '0');
        const formattedDate = `${day}-${month}-${year}-${displayHours}-${minutes}${period}`;
        
        //link.download = `${pageTitle}-${formattedDate}.png`;
        link.download = `${pageTitle}.png`;
        link.click();
    };
    img.src = dataUrl;
}

function saveSnapBoxState(rect) {
    const boxState = {
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top
    };
    
    chrome.storage.local.set({ lastSnapBox: boxState });
}

function deactivateSelectionMode() {
    isSelectionMode = false;
    
    // Save the final box state before cleanup
    if (selectionBox) {
        const rect = selectionBox.getBoundingClientRect();
        //saveSnapBoxState(rect);
    }
    
    if (overlay) overlay.remove();
    if (selectionBox) {
        selectionBox.removeEventListener('mousedown', onBoxMouseDown);
        selectionBox.remove();
    }
    if (captureButton) captureButton.remove();
    
    overlay = null;
    selectionBox = null;
    captureButton = null;
    
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}
