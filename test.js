const puppeteer = require("puppeteer");

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    console.log("Browser Started Successfully");

    const page = await browser.newPage();

    await page.setContent("<h1>Hello KV Projects</h1>");

    await page.pdf({
      path: "test.pdf",
      format: "A4",
    });

    await browser.close();

    console.log("PDF Created Successfully");
  } catch (err) {
    console.error(err);
  }
})();