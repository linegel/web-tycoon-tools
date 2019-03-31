const puppeteer = require("puppeteer");
const express = require("express");
const ua = require("useragent-generator");
require("dotenv").config();

const auth = require("./helpers/auth");
const tasks = require("./libs/tasks");
const workers = require("./libs/workers");
const spam = require("./libs/spam");

const app = express();

let lastResult = ["..."];

const addLog = (type, text) => {
  console[type](text);

  lastResult.push(
    `[${new Date(Date.now()).toLocaleString()}] ${type}: ${text}`
  );
  if (lastResult.length > 200) {
    lastResult.shift();
  }
};

const logger = {
  log: addLog.bind(null, "log"),
  info: addLog.bind(null, "info"),
  warn: addLog.bind(null, "warn"),
  error: addLog.bind(null, "error")
};

(async () => {
  let config = {};
  config.userAgent = ua.chrome(72);
  while (true) {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--override-plugin-power-saver-for-testing=never",
        "--disable-extensions-http-throttling"
      ]
    });

    config = {
      ...config,
      ...(await auth(browser, config))
    };
    try {
      await Promise.all([
        tasks(browser, logger, config),
        workers(browser, logger, config)
        // spam(console, config)
      ]);
    } catch (e) {
      console.error(`Ой, беда!`, (e && e.response && e.response.data) || e);
    }
    await browser.close();
  }
})();

app.get("/", function(req, res) {
  res.send(
    `<pre>${lastResult
      .slice()
      .reverse()
      .join("\n")}</pre>
      <script>setTimeout(location.reload.bind(location), 5000)</script>`
  );
});

app.listen(process.env.PORT || 8080, function() {
  console.log("App listening on port ", process.env.PORT);
});
