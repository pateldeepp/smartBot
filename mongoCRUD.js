const { MongoClient, ObjectId } = require('mongodb');
const { convert } = require('html-to-text');
const { encode, decode } = require('gpt-3-encoder');
const { OpenAI } = require("langchain/llms/openai");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const fs = require('fs');



const dbUrl = 'mongodb://localhost:27017';
const dbName = 'KnowledgeBases';
const collectionName = 'KBCustom';
const collectionTranformedName = 'KBCustomNew';

const client = new MongoClient(dbUrl); // Create MongoDB client



async function connect() {
    try {
        await client.connect();
        console.log('Connected to the database');
    } catch (err) {
        console.error(err);
    }
}

connect();


const collection = client.db(dbName).collection(collectionName);
const collectionTransformed = client.db(dbName).collection(collectionTranformedName);

async function createDocument(document) {
    try {
        return await collectionTransformed.insertOne(document);
    } catch (err) {
        console.error(err);
    }
}

async function readDocuments() {
    try {
        return await collection.find({}).toArray();
    } catch (err) {
        console.error(err);
    }
}

async function readDocumentById(_id) {
    try {
        return await collection.findOne({ "_id": new ObjectId(_id) });
        //console.log(result);
    } catch (err) {
        console.error(err);
    }
}

async function updateDocument(id, updates) {
    try {
        return await collection.updateOne({ _id: new ObjectId(id) }, { $set: updates });
    } catch (err) {
        console.error(err);
    }
}

async function deleteDocument(id) {
    try {
        return await collection.deleteOne({ _id: new ObjectId(id) });
    } catch (err) {
        console.error(err);
    }
}

async function main() {
    const records = await readDocuments();
    records.forEach(async (record) => {
        const options = {
            selectors: [
                { selector: 'table', format: 'dataTable' }
            ]
        };
        const sanitizedContent = convert(record.kbContent, options);
        console.log(record._id + ' ' + record.kbNumber + ' ' + record.title);

        const text = sanitizedContent;
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 50,
        });

        const test1 = new RecursiveCharacterTextSplitter({ })

        const output = await splitter.createDocuments([text]);
        output.forEach( async (splittedDoc)  =>  {
            // console.log(splittedDoc.pageContent);
            // console.log('------------------------------------------------------------------------------------------------');


            const encodedTitle = encode(record.title);
            const encodedContent = encode(splittedDoc.pageContent);
            // for(let token of encodedTitle){
            //     console.log({token, string: decode([token])});
            // }
            // const decodedTitle = decode(encodedTitle);

            const objToSave = {
                'sanitizedContent': splittedDoc.pageContent,
                'contentTokens': encodedContent.toString(), 
                'contentTokenLen': encodedContent.length,
                'titleTokens': encodedTitle.toString(), 
                'titleTokenLen': encodedTitle.length
            };

            const cloneRecord = {...record};
            delete cloneRecord._id;
            delete cloneRecord.kbContent;

            const finalRecord = {...cloneRecord, ...objToSave}
            // console.log(finalRecord);

            const createdRecord = await createDocument(finalRecord);
            // const updatedRecord = await updateDocument(record._id, {'titleTokens': encodedTitle.toString(), 'titleTokenLen': encodedTitle.length });
            console.log(createdRecord);

        });
        
        /*
        fs.writeFile(`${record._id}-output.txt`, JSON.stringify(output), err => {
            if (err) {
                console.error(err);
            }
            // file written successfully
        });
        */
    });
}

main();