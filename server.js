const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();
const port = 3000;

// Use body-parser middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (CSS, JS, etc.)
app.use(express.static("public"));

// Serve the HTML form page
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Handle form submission and run the scraper with the selected date
app.post("/run-scraper", (req, res) => {
    const { username, password, date } = req.body; // Capture username, password, and date from the form

    exec(`node scraper.js ${username} ${password} ${date}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing scraper.js: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        res.status(500).send(`
          <h2>Error running the scraper</h2>
          <p>${error.message}</p>
          <pre>${stderr}</pre>
          <br>
          <a href="/">Go back</a>
        `);
        return;
      }

      let results;
      try {
        results = JSON.parse(stdout.trim());
      } catch (parseError) {
        console.error('Error parsing results:', parseError);
        console.error('Output was:', stdout);
        return res.status(500).send('Error processing results.');
      }

      // Build HTML table
      let htmlTable = `<table border="1" style="width: 100%; border-collapse: collapse;">
                        <thead>
                          <tr>
                            <th>Patient ID</th>
                            <th>Name</th>
                            <th>Discount</th>
                          </tr>
                        </thead>
                        <tbody>`;
      
      results.forEach(result => {
        htmlTable += `<tr>
                        <td>${result.patientID}</td>
                        <td>${result.name}</td>
                        <td>${result.discount}</td>
                      </tr>`;
      });
      
      htmlTable += `</tbody></table>`;

      // Send back the formatted results
      res.send(`
        <h2>Scraper Results for ${date}</h2>
        ${htmlTable}
        <br>
        <a href="/">Go back</a>
      `);
    });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
