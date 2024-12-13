(async function () {
    // Wait until + New Material button is visible
    // This might require observing DOM changes or waiting for a selector:
    function waitForSelector(selector) {
        return new Promise(resolve => {
            const check = () => {
                const el = document.querySelector(selector);
                if (el && el.offsetParent !== null) {
                    resolve(el);
                } else {
                    requestAnimationFrame(check);
                }
            };
            check();
        });
    }

    // Get CSV data from storage
    const materialsData = await new Promise(resolve => {
        chrome.runtime.sendMessage({ type: 'getData' }, (response) => {
            resolve(response);
        });
    });

    if (!materialsData || !materialsData.length) {
        console.log("No material data found in storage");
        return;
    }

    const newMaterialButton = await waitForSelector('button[data-test="Button.Part.New"]');
    if (!newMaterialButton) {
        console.log("Cannot find '+ New Material' button");
        return;
    }

    function inputByLabelText(txt) {
        const labels = document.querySelectorAll('label');
        let priceInput = null;

        for (const label of labels) {
            if (label.textContent.trim() === txt) {
                // If the label uses a `for` attribute, we can use that to find the input.
                const forValue = label.getAttribute('for');
                if (forValue) {
                    priceInput = document.getElementById(forValue);
                    break;
                } else {
                    // If there's no `for` attribute, we may need to find a related input nearby.
                    // For example, if the input is a sibling of the label:
                    const parent = label.parentNode;
                    priceInput = parent.querySelector('input[type="text"]');
                    break;
                }
            }
        }
        return priceInput;
        //DEBUGGING: if (priceInput) { console.log('Found price input:', priceInput); } else { console.log('Price input not found.'); }
    }
    function findElementByText(selector, searchText) {
        // Get all elements that match the selector
        const elements = document.querySelectorAll(selector);

        // Iterate through the elements
        for (let element of elements) {
            if (element.textContent.includes(searchText)) {
                return element; // Return the matching element
            }
        }

        return null; // Return null if no match is found
    }

    async function createMaterial(material) {
        const [productId, rawName, description, price, qty, location, partNumber, date] = material;

        // Construct name with Year + Month (assuming date is YYYY-MM-DD or similar):
        //const d = new Date(date);
        const d = new Date();
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const finalName = `${rawName} ${year}${month}`;

        // Click the New Material button to open the form
        newMaterialButton.click();

        // Wait for modal/form to appear - adjust selectors as needed
        //await waitForSelector('input[name="materialName"]');
        await waitForSelector('input[placeholder="Enter Material Name"]');

        const nameInput = document.querySelector('input[placeholder="Enter Material Name"]');
        const priceInput = inputByLabelText("Unit Cost");
        const qtyInput = inputByLabelText("Units in Stock");
        const locationInput = inputByLabelText("Location");

        // Fill in the form
        nameInput.value = finalName;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));

        priceInput.value = price;
        priceInput.dispatchEvent(new Event('input', { bubbles: true }));

        qtyInput.value = qty;
        qtyInput.dispatchEvent(new Event('input', { bubbles: true }));


        const locationLabel = inputByLabelText("Location");
        locationLabel.dispatchEvent(new Event('click', { bubbles: true }));

        const overallLocationInput = document.querySelector('[data-test="Select.Location"]');
        const chevronLocation = overallLocationInput.querySelector('svg[data-test="Select.Chevron"]');

        if (locationInput) {
            locationInput.value = location.trim();

            const spaceEvent = new KeyboardEvent('keydown', {
                key: ' ',        // Represents the character for the Space key
                code: 'Space',   // The physical key code for the Space key
                keyCode: 32,     // Legacy keyCode for the Space key
                bubbles: true,   // Ensures the event bubbles up the DOM
                cancelable: true // Allows the event to be canceled
            });
            locationInput.dispatchEvent(spaceEvent);

            //await waitForSelector('[data-test="Select.Options"]');


            const locationOptions = document.querySelector('[data-test="Select.Options"]');
            console.log("options %o", locationOptions);
            var locationOption = findElementByText(location.trim());
            console.log("option %o", locationOption);
            //locationOption.dispatchEvent(new Event('change', { bubbles: true }));
            /*
                        for (const opt of locationInput.options) {
                            if (opt.textContent.trim() === location.trim()) {
                                opt.selected = true;
                                locationInput.dispatchEvent(new Event('change', { bubbles: true }));
                                break;
                            }
                        }
            */
        }

        const createButton = document.evaluate(
            "//*[text()='Create']",
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;
        if (createButton) {
            createButton.click();
        }

        // Wait for creation to complete (this might require observing a success message or DOM change)
        // For now, just wait a bit before proceeding to next material
        await new Promise(res => setTimeout(res, 2000));
    }

    // Loop through each row, skip header if present
    for (let i = 1; i < materialsData.length; i++) {
        const row = materialsData[i];
        if (row && row.length > 1) {
            await createMaterial(row);
        }
    }

    console.log("All materials processed");
})();