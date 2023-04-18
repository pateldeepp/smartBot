require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const { Configuration, OpenAIApi } = require("openai");


const dbUrl = 'mongodb://localhost:27017';
const dbName = 'KnowledgeBases';
const collectionName = 'KBCustomNew';
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

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);


const collection = client.db(dbName).collection(collectionName);

async function readDocuments() {
    try {
        return await collection.find({}).toArray();
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

async function main() {
    const records = await readDocuments();
    records.forEach(async (record) => {
        console.log(record._id + ' ' + record.kbNumber + ' ' + record.title);

        try {
            /*
            const responseOfEmbedding = await openai.createEmbedding({
                model: "text-embedding-ada-002",
                input: record.title,
            });
    
            console.log(responseOfEmbedding.status + responseOfEmbedding.statusText);
            // console.log(responseOfEmbedding.data.data[0].embedding);
            */

            const responseOfContentEmbedding = await openai.createEmbedding({
                model: "text-embedding-ada-002",
                input: record.sanitizedContent,
            });

            const objToSave = {
                // 'adaTitleTokens': responseOfEmbedding.data.data[0].embedding.toString(), 
                // 'adaTitleTokenLen': parseInt(responseOfEmbedding.data.usage.total_tokens),
                'adaContentTokens': responseOfContentEmbedding.data.data[0].embedding.toString(), 
                'adaContentTokenLen': parseInt(responseOfContentEmbedding.data.usage.total_tokens) 
            };
            const updatedRecord = await updateDocument(record._id, objToSave);
            console.log(updatedRecord);
            
        } catch (error) {
            console.log(` ${record.kbNumber} ${error.status} ${error.statusText} `);
        }
    });

}

main();



