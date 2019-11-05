const puppeteer = require('puppeteer');
const CREDS = require('./creds');
const SELECTORS = require('./selectors');
const baseURI = 'https://backoffice.ipayafrica.com/index.php';

async function getCredits(page, data) {
    return await page.evaluate((table, data) => {
        let headers = document.querySelector(`${table} thead tr`).children;
        let rows = document.querySelector(`${table} tbody`).children;

        for (let i = 0; i < rows.length; i++) {
            const tr = rows[i];
            const cr = tr.cells[1].innerText;
            const ref = tr.cells[4].innerText;
            const isReversal = ref.includes('R-');

            if (Number(cr) > 0 && !isReversal) {
                const cell = {};
                for (let j = 0; j < tr.cells.length; j++) {
                    const key = headers[j].innerText.toLowerCase().replace(' ', '');
                    cell[key] = tr.cells[j].innerText;
                }
                data.push(cell);
            }
        }
        return data;
    }, SELECTORS.BULKPAY_TABLE, data);
}

async function run(lastCreditReference) {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            devtools: false
        });
        const page = await browser.newPage();
        await page.goto(`${baseURI}/login`);

        const navigationEnd = page.waitForNavigation();

        await page.click(SELECTORS.USERNAME_SELECTOR);
        await page.keyboard.type(CREDS.username);
        await page.click(SELECTORS.PASSWORD_SELECTOR);
        await page.keyboard.type(CREDS.password);
        await page.click(SELECTORS.BUTTON_SELECTOR);
        await navigationEnd;

        let data = [];
        let navigate = true;
        let count = 0;

        while (navigate) {
            const searchTerm = count > 0 ? `?&per_page=${count * 20}` : '';
            await page.goto(`${baseURI}/bulkpay/view${searchTerm}`);
            // await page.waitForSelector(SELECTORS.BULKPAY_TABLE); 

            data = await getCredits(page, data);
            console.log('page: ', count);

            const lastItem = data[data.length - 1];
            if (lastItem && lastItem['reference'] === lastCreditReference) {
                data.pop();

                navigate = false;
            }
            count++;
        }

        console.log('data: ', data);

        await browser.close();
    } catch (error) {
        console.log('Caught Error: ', error);
    }
}

run('MAN20191018161623');