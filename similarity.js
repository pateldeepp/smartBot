// const natural = require('natural');
var consineSimilarity  = require('compute-cosine-similarity');
const {MongoClient, ObjectId}  = require('mongodb');
require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');


const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const dbUrl = 'mongodb://localhost:27017';
const dbName = 'KnowledgeBases';
const collectionName = 'KBCustomNew';
const client = new MongoClient(dbUrl); // Create MongoDB client

// const inputQuery = "How to restrict user during upgrade of instance?"
// const inputQuery = "Do you know how to make record producer and catalog item public ?"
// const inputQuery = "In Oracle Database what is the maximum number of columns allowed per table?"
// const inputQuery = "What is the workaround when system user more than maximum number of columns allowed per table?"
// const inputQuery = "What benefits will I get from NowSupport new user management interface?"
// const inputQuery = "How can I deselect all roles in new user management interface of NowSupport?";
// const inputQuery = "In new user management of NowSupport, Is it possbile to have user is active, but at same time he is locked out?";
const inputQuery = "when did narendra modi became prime minister?";




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

async function readDocuments() {
    try {
        return await collection.find({}).limit(200).toArray();
    } catch (err) {
        console.error(err);
    }
}

async function scanKB () {
    const records = await readDocuments();

    const responseOfQueryEmbedding = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: inputQuery,
    });

    const queryAdaTokens = responseOfQueryEmbedding.data.data[0].embedding.toString();

    records.forEach(async (record) => {
        const vector1 = queryAdaTokens.split(','); // convert string to array.
        const vector2 = record.adaContentTokens.split(',');
        // Compute cosine similarity between the documents
        // const similarity = natural.VectorSpaceModel.cosineSimilarity(vector1, vector2);
        const similarity = consineSimilarity(vector1, vector2);
        // console.log(similarity); // Output: 0
        // Add the similarity score to the document object
        record.similarity = similarity;
    });

    // Sort the documents by similarity score
    records.sort((a, b) => b.similarity - a.similarity);
    // Get the top 5 documents
    const top5 = records.slice(0, 5);
    top5.forEach(r => console.log(`${r._id} ${r.title} ${r.similarity} ${r.sanitizedContent.length}/${r.adaContentTokenLen} `));
    return top5;
}

async function queryGPT(promptWithContext) {
    const messages = [
        { role: "system", content: "You are Q&A bot. A highly intelligent system that answers user questions based on user provided CONTEXT. If you could not answer please say I do not know." },
        { role: "user", content: promptWithContext }
    ];
    console.log(messages);
    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages : messages,
        temperature: 0.3
    });
    console.log(completion.data.choices[0].message.content);
}

function getAllContent(records) {
    const allContent = [];
    records.forEach((record) => {
        allContent.push(record.sanitizedContent);
    });
    return allContent.join('\n');
}

function getPromptWithContext(allContent) {
    const promptWithContext = `CONTEXT: ${allContent} 
    QUESTION: ${inputQuery}`;
    return promptWithContext;
}

async function main() {
    const foundRecords =  await scanKB();
    const allContentText = getAllContent(foundRecords);
    const promptWithContext = getPromptWithContext(allContentText);
    await queryGPT(promptWithContext);
}

main();
