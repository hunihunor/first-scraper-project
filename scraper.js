const puppeteer = require("puppeteer");
const fs = require("fs");

(async () => {
  const username = process.argv[2]; // Capture the username argument
  const password = process.argv[3]; // Capture the password argument
  const date = process.argv[4]; // Capture the date argument

  // Launch a browser instance
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate to the dental clinic site
  await page.goto("https://oralmed.flexi-dent.hu/");
  await page.type(".form-control[name=emailaddress]", username); // Use the username from the input field
  await page.type(".form-control[name=password]", password); // Use the password from the input field
  await page.click(".form-control[type=submit]");
  await page.waitForNavigation();

  const [year, month, day] = date.split("-"); // Split the input date into components
  await page.evaluate((year, month, day) => {
    Calendar.changeDate(year, month, day); // Call the calendar change function
  }, year, month, day);

  // Ensure that the appointment boxes are loaded
  await page.waitForSelector(".calendarTreatmentBox");

  // Select all appointment-like boxes
  const appointmentData = await page.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll(".calendarTreatmentBox"));
    return boxes
      .map((box) => {
        const patientID = box.getAttribute("data-patient") || "0";
        return { patientID };
      })
      .filter((appointment) => appointment.patientID !== "0");
  });

  const results = [];

  for (const appointment of appointmentData) {
    const patientID = appointment.patientID;
    const patientURL = `https://oralmed.flexi-dent.hu/hu/patients/cardboard/master-data?id=${patientID}`;

    await page.goto(patientURL);

    await page
      .waitForSelector("#pt_dental_discount", { timeout: 5000 })
      .catch(() => {
        return;
      });

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

  console.log(JSON.stringify(filteredResults, null, 2));

  const now = new Date();
  const dateString = now.toISOString().split("T")[0];

  const fileName = `results_${dateString}.json`;

  const resultsJSON = JSON.stringify(filteredResults, null, 2);

  fs.writeFile(fileName, resultsJSON, (err) => {
    if (err) {
      console.error("Error writing to file", err);
    }
  });

  await browser.close();
})();
