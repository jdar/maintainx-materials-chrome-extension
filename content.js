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


    async function checkIfAlreadyExists(finalName) {
        await new Promise(async (res2) => {
            var search = document.querySelector('input[placeholder="Search Materiales"]');
            search.value = finalName;
            search.dispatchEvent(new Event('input', { bubbles: true }));
            search.dispatchEvent(new Event('change', { bubbles: true }));
            search.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'a',
                bubbles: true,
                cancelable: true
            }));
            setTimeout(res2, 1000);
        });//.finally
        const labels = document.querySelectorAll('[data-test="ListElement.Label"]');
        for (var found of labels) {
            console.log(found.innerText);
            if (found.innerText == finalName) {
                return true;
            }
        }
        return false;
    }

    async function tryCreateMaterial(material) {
        await new Promise(async (res, rej) => {
            const [rawName, price, qty, location, partNumber, date] = material;

            // Construct name with Year + Month (assuming date is YYYY-MM-DD or similar):
            //const d = new Date(date);
            const d = new Date();
            const year = d.getFullYear();
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            //const finalName = `${rawName}-${year}-${month}`;
            const finalName = `${rawName}`;


            var found = await checkIfAlreadyExists(finalName);
            if (found) {
                res();
            } else {

                newMaterialButton.click();
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


                await new Promise(async (res) => {
                    if (locationInput) {
                        //locationInput.value = location.trim();
                        /*
                                    const spaceEvent = new KeyboardEvent('keydown', {
                                        key: ' ',        // Represents the character for the Space key
                                        code: 'Space',   // The physical key code for the Space key
                                        keyCode: 32,     // Legacy keyCode for the Space key
                                        bubbles: true,   // Ensures the event bubbles up the DOM
                                        cancelable: true // Allows the event to be canceled
                                    });
                        */
                        const spaceEvent = new KeyboardEvent('keydown', {
                            key: 'a',
                            bubbles: true,
                            cancelable: true
                        });
                        locationInput.dispatchEvent(spaceEvent);
                        locationInput.click();
                        locationInput.focus();

                        await waitForSelector('[data-test="Select.Row"]');

                        const locationOptions = document.querySelectorAll('[data-test="Select.Row"]');
                        for (const opt of locationOptions) {
                            console.log("option %o", opt);
                            if (opt.textContent.trim() === location.trim()) {
                                //opt.selected = true;
                                opt.click();
                                locationInput.value = location.trim(); // redundant?
                                opt.dispatchEvent(new Event('click', { bubbles: true }));
                                locationInput.dispatchEvent(new Event('click', { bubbles: true }));
                                locationInput.dispatchEvent(new Event('change', { bubbles: true }));
                                console.log('selected: ' + opt.textContent);
                                break;
                            }
                        }
                    }
                    setTimeout(res, 2000);
                });
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

                setTimeout(res, 1000);
            }
        });
    }

    // Loop through each row, skip header if present
    for (let i = 1; i < materialsData.length; i++) {
        const row = materialsData[i];
        if (row && row.length > 1) {
            await tryCreateMaterial(row);
        }
    }

    console.log("All (new) materials processed");
})();