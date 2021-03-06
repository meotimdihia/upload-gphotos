import { CookieJar, Cookie } from "tough-cookie";
// import { isNull } from 'option-t/cjs/Nullable';
// import { unwrapOrElseFromUndefinable } from 'option-t/cjs/Undefinable/unwrapOrElse';

import { USER_AGENT } from "./constants";
// import { getChromePath } from './get_chrome_path';
const puppeteer = require("puppeteer-extra");

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

type LoginParams = {
  username: string;
  password: string;
  jar: CookieJar;
};

async function setCookie({
  cookie,
  url,
  jar,
}: {
  cookie: any;
  url: string;
  jar: CookieJar;
}) {
  return new Promise((resolve, reject) => {
    jar.setCookie(
      new Cookie({
        key: cookie.name,
        value: cookie.value,
        expires: new Date(cookie.expires * 1000),
        domain: cookie.domain.replace(/^\./, ""),
        path: cookie.path,
      }),
      url,
      {
        http: cookie.httpOnly,
        secure: cookie.secure,
        ignoreError: true,
      },
      (err) => (err ? reject(err) : resolve(true))
    );
  });
}

async function signinViaPuppeteer({ username, password, jar }: LoginParams) {
  //  const chromePath = unwrapOrElseFromUndefinable(process.env.PUPPETEER_EXECUTABLE_PATH, () => getChromePath());
  //  if (isNull(chromePath)) {
  //    throw new Error(
  //      'Chrome / Chromium binary was not found. Please set binary path to PUPPETEER_EXECUTABLE_PATH envrionment manually.',
  //    );
  //  }

  const browser = await puppeteer.launch({
    //executablePath: chromePath,
    // headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setRequestInterception(true);
    page.on("request", (req: any) => {
      if (
        req.resourceType() == "stylesheet" ||
        req.resourceType() == "font" ||
        req.resourceType() == "image"
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await Promise.all([
      page.waitForSelector('input[type="email"]', { visible: true }),
      page.goto("https://accounts.google.com/ServiceLogin", {
        waitUntil: "networkidle2",
      }),
    ]);

    const $email = await page.$('input[type="email"]');
    if ($email === null) {
      throw new Error("An email input was not found.");
    }

    await $email.type(username);
    await Promise.all([
      page.waitForSelector('input[type="password"]', { visible: true }),
      $email.press("Enter"),
    ]);

    const $password = await page.$('input[type="password"]');
    if ($password === null) {
      throw new Error("A password input was not found.");
    }

    await $password.type(password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2" }),
      $password.press("Enter"),
    ]);
    await page.goto("https://photos.google.com/");
    const cookies = await page.cookies();
    await Promise.all(
      cookies.map((cookie: any) => setCookie({ cookie, jar, url: page.url() }))
    );
  } finally {
    await browser.close();
  }
}

export { signinViaPuppeteer };
