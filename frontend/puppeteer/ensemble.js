const puppeteer = require('puppeteer');

(async () => {
  const browser= await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:8000/");
  await page.screenshot({path: '01-dashboard.png'})
  await page.goto("http://127.0.0.1:8000/ensembles");
  await page.waitForSelector(".list-group-item");
  await page.screenshot({path: '02-ensemble-list.png'});
  await page.waitForSelector('#createEnsembleLink');
  await page.click('#createEnsembleLink');
  await page.waitForSelector("#formEnsembleName")
  await page.waitForSelector("#formEnsembleAddress")
  await page.waitForSelector("#formEnsembleAdministrator")
  await page.waitForSelector("#formEnsembleCoordinator")
  await page.waitForSelector("#formEnsembleSubmitButton")
  await page.type("#formEnsembleName", "Test Ensemble")
  await page.type("#formEnsembleAddress", "123 Fake Street")
  await page.type("#formEnsembleAdministrator", "1")
  await page.type("#formEnsembleCoordinator", "1")
  await page.screenshot({path: '03-create-new.png'});
  await page.click('#formEnsembleSubmitButton');
  await page.goto("http://127.0.0.1:8000/ensembles");
  await page.waitForSelector(".list-group-item");
  await page.screenshot({path: '04-new-ensemble-list.png'});
  
  await browser.close();
})();