const puppeteer = require("puppeteer");
const fs = require("fs");

(async () => {
  const date = process.argv[2]; // Capture the date argument from command line
  // console.log(`Running scraper for date: ${date}`);

  // Launch a browser instance
  const browser = await puppeteer.launch({ headless: false }); // headless: true for background operation
  const page = await browser.newPage();

  // Navigate to the dental clinic site
  await page.goto("https://oralmed.flexi-dent.hu/");
  await page.type(".form-control[name=emailaddress]", "username"); // Adjust the selector
  await page.type(".form-control[name=password]", "password");
  await page.click(".form-control[type=submit]");
  await page.waitForNavigation(); // Wait for page to load after login

  const [year, month, day] = date.split("-"); // Split the input date into components
  await page.evaluate((year, month, day) => {
    Calendar.changeDate(year, month, day); // Call the calendar change function
  }, year, month, day);

  // Ensure that the appointment boxes are loaded
  await page.waitForSelector(".calendarTreatmentBox");

  // Select all appointment-like boxes
  const appointmentData = await page.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll(".calendarTreatmentBox")); // Adjust selector for boxes

    return boxes
      .map((box) => {
        const patientID = box.getAttribute("data-patient") || "0"; // Extract patient ID (default to '0' for messages)
        return { patientID };
      })
      .filter((appointment) => appointment.patientID !== "0"); // Filter out message boxes
  });

  // Navigate to each patient's cardboard page for valid IDs
  const results = [];

  for (const appointment of appointmentData) {
    const patientID = appointment.patientID;
    const patientURL = `https://oralmed.flexi-dent.hu/hu/patients/cardboard/master-data?id=${patientID}`;

    await page.goto(patientURL);

    // Adjust this selector based on the actual element on the patient page
    await page
      .waitForSelector("#pt_dental_discount", { timeout: 5000 })
      .catch(() => {
        return; // Skip to the next patient if the element is not found
      });

    // Extract additional information as needed
    const discount = await page.evaluate(() => {
      const discountElement = document.querySelector("#pt_dental_discount");
      return discountElement ? discountElement.value : "No discount";
    });

    const name = await page.evaluate(() => {
      const nameElement = document.querySelector("#misc_functions");
      return nameElement ? nameElement.innerHTML : "No name";
    });

    results.push({ patientID, name, discount });
  }

  const filteredResults = results.filter(result => result.discount !== '0');

  // Output only the JSON results
  console.log(JSON.stringify(filteredResults, null, 2)); // Output valid JSON

  const now = new Date();
  const dateString = now.toISOString().split("T")[0]; // Format as YYYY-MM-DD

  // Create a dynamic file name
  const fileName = `results_${dateString}.json`;

  // Save results to the JSON file with the dynamic name
  const resultsJSON = JSON.stringify(filteredResults, null, 2); // Pretty print JSON

  fs.writeFile(fileName, resultsJSON, (err) => {
    if (err) {
      console.error("Error writing to file", err);
    } else {
      // console.log(`Results saved to ${fileName}`);
    }
  });

  // Close the browser
  await browser.close();
})();
