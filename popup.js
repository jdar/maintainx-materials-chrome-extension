const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', () => {
    const statusElement = document.getElementById('status');
    const previewElement = document.getElementById('preview');

    if (!fileInput.files.length) {
        statusElement.textContent = "No data!";
        previewElement.innerHTML = ""; // Clear any previous preview
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const csv = e.target.result;
        const rows = csv.split('\n').map(line => line.trim().split(','));

        // Save data to Chrome storage
        chrome.storage.sync.set({ materialsData: rows }, () => {
            statusElement.textContent = "Data cargada.";

            const executeBtn = document.getElementById('executeBtn');
            executeBtn.removeAttribute('disabled');
        });

        // Clear the preview container and add a few rows to preview
        previewElement.innerHTML = ""; // Clear previous preview

        // Limit to the first 5 rows for the preview
        rows.slice(0, 5).forEach((row, index) => {
            const rowElement = document.createElement('div');
            rowElement.textContent = `Row ${index + 1}: ${row.join(' | ')}`;
            previewElement.appendChild(rowElement);
        });
    };

    reader.readAsText(file);
});
document.addEventListener('DOMContentLoaded', function () {
    const executeBtn = document.getElementById('executeBtn');
    executeBtn.addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content.js']  // or specify a function/code directly
            });
        });
    });
});