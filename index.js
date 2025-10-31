import puppeteer from "puppeteer";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const FB_EMAIL = process.env.FB_EMAIL;
const FB_PASSWORD = process.env.FB_PASSWORD;
const FB_GROUP_URL = process.env.FB_GROUP_URL;
const FB_MESSAGE = process.env.FB_MESSAGE;

async function loginAndSaveCookies(page) {
  await page.goto("https://www.facebook.com", { waitUntil: "networkidle2" });
  await page.type("#email", FB_EMAIL);
  await page.type("#pass", FB_PASSWORD);
  await page.click('button[name="login"]');
  await page.waitForNavigation({ waitUntil: "networkidle2" });

  // Save cookies for reuse
  const cookies = await page.cookies();
  fs.writeFileSync("cookies.json", JSON.stringify(cookies, null, 2));
  console.log("✅ Login successful and cookies saved!");
}

async function loadCookies(page) {
  if (fs.existsSync("cookies.json")) {
    const cookies = JSON.parse(fs.readFileSync("cookies.json"));
    await page.setCookie(...cookies);
    console.log("✅ Cookies loaded.");
    return true;
  }
  return false;
}

async function postToGroup() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Load cookies or login
  const hasCookies = await loadCookies(page);
  if (!hasCookies) {
    await loginAndSaveCookies(page);
  }

  await page.goto(FB_GROUP_URL, { waitUntil: "networkidle2" });

  // Wait for the post box
  await page.waitForSelector('[role="textbox"]', { visible: true });
  await page.click('[role="textbox"]');
  await page.keyboard.type(FB_MESSAGE);

  await page.waitForTimeout(2000);
  const buttons = await page.$x("//span[contains(text(),'Post')]");
  if (buttons.length > 0) {
    await buttons[0].click();
    console.log("✅ Post submitted successfully!");
  } else {
    console.log("⚠️ Post button not found.");
  }

  await page.waitForTimeout(5000);
  await browser.close();
}

postToGroup().catch(console.error);
