// Optionally handle messages from content or popup if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'getData') {
        chrome.storage.sync.get('materialsData', (data) => {
            sendResponse(data.materialsData || []);
        });
        return true; // indicates async response
    }
});