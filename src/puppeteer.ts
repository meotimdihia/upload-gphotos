const vanillaPuppeteer = require("puppeteer");
import { addExtra } from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const puppeteer = addExtra(vanillaPuppeteer);
puppeteer.use(StealthPlugin());

export { puppeteer };
