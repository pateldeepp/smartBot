const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));
const { MongoClient } = require('mongodb');
const { link } = require('fs/promises');

const dbUrl = 'mongodb://localhost:27017';
const dbName = 'KnowledgeBases';
const collectionName = 'KBCustom';

const client = new MongoClient(dbUrl); // Create MongoDB client
client.connect(); // Connect to MongoDB server
const db = client.db(dbName); // Select MongoDB database
const collection = db.collection(collectionName);

async function scrapeKBPage(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.waitForSelector('div.ns-kb-title-info', {
        visible: true,
    });
    // Now you can use Puppeteer's API to manipulate the page
    const title = await page.title();
    let bodyHTML = await page.evaluate(() => document.documentElement.outerHTML);
    await browser.close();
    return bodyHTML;

}

function processHTML(bodyHTML) {
    try {
        const $ = cheerio.load(bodyHTML);
        const kbNumber = $('div.ns-kb-number-info span.ns-kb-number').text().trim();
        const kbTitle = $('h1.ns-kb-title').text().trim();
        const views = $('div.ns-kb-secondary-header span:nth-child(2)').text().trim().replace("Views", "").trim();
        const lastUpdated = $('div.ns-kb-secondary-header span:nth-child(3)').text().trim().replace("Last updated : ", "");
        let kbContent = $('article.kb-article-content').html();

        //sanitize the content.
        // kbContent = kbContent.replace(/\s\s+/g, ' ').replace(/[\t]/g, ' ').trim();
        // kbContent = kbContent.replace(/\s\s+/g, ' ').trim();


        const pageObject = {
            kbNumber: kbNumber,
            title: kbTitle,
            views: parseInt(views),
            lastUpdated: new Date(lastUpdated),
            kbContent: kbContent
        }
        // console.log(pageObject);
        return pageObject;
    } catch (error) {
        
    }
}

async function saveToDB(pageObj) {
    if (pageObj && pageObj.kbNumber) {
        console.log('Saving...' + pageObj.kbNumber);
        await collection.insertOne(pageObj);
    }
    // if (collection.find({ "kbNumber": pageObj.kbNumber }).limit(1).length > 0) {
    //     console.log(pageObj.kbNumber + ' is found');
    // } else {
    //     await collection.insertOne(pageObj);
    // }
}


async function scrapePages(urls) {
    const browser = await puppeteer.launch({headless: false});
    const pages = await Promise.all(urls.map(url => browser.newPage()));

    const responses = await Promise.all(pages.map(async (page, index) => {
        const url = urls[index];
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });
            await page.waitForSelector('div.ns-kb-title-info', {
                visible: true,
            });
            const title = await page.title();
            let bodyHTML = await page.evaluate(() => document.documentElement.outerHTML);
            return bodyHTML;
        } catch {
            
        }
    }));
    await browser.close();
    return responses;
}


// console.log(linksArray);

// scrapePages(linksArray).then(responses => {
//     //const parsedData = processHTML(responses);
//     responses.forEach((item, index) => {
//         // console.log(processHTML(item), index);
//         processHTML(item);
//     });
// }).catch(error => console.error(error));

async function processArrayInBatches(array, batchSize) {
    for (let i = 0; i < array.length; i += batchSize) {
        // process each batch of size batchSize synchronously
        const batch = array.slice(i, i + batchSize);
        console.log(batch, i);
        const responses = await processBatchSync(batch);
        responses.forEach((item, index) => {
            if (item) {
                const pageData = processHTML(item);
                if (pageData) {
                    saveToDB(pageData);
                }
            }
        });

    }
}

function processBatchSync(batch) {
    return scrapePages(batch);
}

let linksArray = [];
const urlsArgs = argv['urls'];
if (urlsArgs) {
    linksArray = urlsArgs.split(' ');
} else {
    linksArray = fs.readFileSync('link_0_250.txt').toString().split("\n");
}

processArrayInBatches(linksArray, 10);



// (async () => {
//     const response = await scrapeKBPage('https://support.servicenow.com/kb?id=kb_article_view&sysparm_article=KB0726425')
//     processHTML(response);
// })();

;

// var promiseAll = [];
// var linksArray = fs.readFileSync('firstFile.txt').toString().split("\n");
// for (const url of linksArray) {
//     console.log(url);
//     promiseAll.push(scrapeKBPage(url));
// }


// (async () => {
//     const responses = await Promise.all(promiseAll);
//     for (const pageHTML of responses) {
//         console.log(pageHTML);
//         // const parsedData = processHTML(responses);
//     }
// })();