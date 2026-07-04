// Helpers comunes para las pruebas de navegador (Playwright).
// Estas pruebas corren en el entorno de desarrollo con Claude, donde
// Playwright está instalado globalmente y Chromium vive en /opt/pw-browsers.
// Si se corren en otra máquina, ajustar CHROMIUM_PATH / PLAYWRIGHT_PATH por
// variables de entorno.

const PLAYWRIGHT_PATH = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE_URL = process.env.BASE_URL || 'http://localhost:8180';

const { chromium } = require(PLAYWRIGHT_PATH);

let failures = 0;
let checks = 0;

function assert(cond, msg) {
  checks++;
  if (cond) {
    console.log(`  ok - ${msg}`);
  } else {
    failures++;
    console.log(`  FAIL - ${msg}`);
  }
}

async function withPage(fn) {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const page = await browser.newPage();
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push('PAGEERROR: ' + e.message));

  await page.goto(BASE_URL + '/index.html');
  await page.waitForTimeout(300);

  try {
    await fn(page);
  } finally {
    // Los errores de red por fuentes externas bloqueadas no cuentan;
    // cualquier pageerror de JS sí es un fallo.
    assert(jsErrors.length === 0, `sin errores de JS en la página (${jsErrors.join('; ') || 'ninguno'})`);
    await browser.close();
  }
}

function finish(name) {
  if (failures > 0) {
    console.log(`\n${name}: ${failures}/${checks} checks FALLARON`);
    process.exit(1);
  }
  console.log(`\n${name}: ${checks} checks OK`);
}

async function clickTab(page, label) {
  await page.click(`button:has-text("${label}")`).catch(() => {});
  await page.waitForTimeout(200);
}

module.exports = { assert, withPage, finish, clickTab };
