const puppeteer = require('puppeteer');
const fs = require('fs');



async function scrapeWebsite(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const allLinks = [];
    const writeStream = fs.createWriteStream("allLinks.txt", { flags: 'a' }); // Create write stream in append mode


    while (true) {
        await page.goto(url, { waitUntil: 'networkidle2' });
        await page.waitForSelector('ul.pagination', {
            visible: true,
        });
        // Now you can use Puppeteer's API to manipulate the page
        const title = await page.title();
        console.log('Title:', title);

        const links = await page.$$eval('div.kb-fmlist-list > a.kb-fmlist-list-hdr', (elements) => elements.map(el => el.href));
        allLinks.push(...links);
        writeStream.write(links.join('\n') + '\n'); // Write extracted links to file
        // console.log('Links:', links);
        console.log('Links Length:', links.length);
        console.log('All Links Length:', allLinks.length);

        // Look for the "Next" button on the page
        const nextButton = await page.$('a[aria-label*="Next"]');
        if (!nextButton) {
            break;
        }
        // If found, click it and wait for the next page to load
        await Promise.all([
            nextButton.click(),
            page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);
        url = page.url();
    }
    await browser.close();
    writeStream.end(); // Close write stream when finished
}

scrapeWebsite('https://support.servicenow.com/kb?id=public_kb');