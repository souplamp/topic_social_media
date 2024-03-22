const { MongoClient } = require("mongodb");

// The uri string must be the connection string for the database (obtained on Atlas).
const uri = "mongodb+srv://<user>:<password>@ckmdb.5oxvqja.mongodb.net/?retryWrites=true&w=majority";

// --- This is the standard stuff to get it to work on the browser
const express = require('express');
const app = express();
const port = 3000;
app.listen(port);
console.log('Server started at http://localhost:' + port);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes will go here

// Default route.
// Provides a selection of routes to go to as links.
app.get('/', function(req, res) {
  var outstring = 'Default endpoint starting on date: ' + Date.now();
  outstring += '<p><a href=\"./task1\">Go to Task 1</a>';
  outstring += '<p><a href=\"./task2\">Go to Task 2</a>';
  res.send(outstring);
});

app.get('/task1', function(req, res) {
  var outstring = 'Starting Task 1 on date: ' + Date.now();
  res.send(outstring);
});

app.get('/task2', function(req, res) {
  var outstring = 'Starting Task 2 on date: ' + Date.now();
  res.send(outstring);
});

app.get('/say/:name', function(req, res) {
  res.send('Hello ' + req.params.name + '!');
});


// Access Example-1
// Route to access database using a parameter:
// access as ...app.github.dev/api/mongo/9876
app.get('/api/mongo/:item', function(req, res) {
const client = new MongoClient(uri);

async function run() {
  try {
    const database = client.db('ckmdb');
    const parts = database.collection('cmps415');

    // Here we make a search query where the key is hardwired to 'partID' 
    // and the value is picked from the input parameter that comes in the route
     const query = { partID: req.params.item };
     console.log("Looking for: " + query);

    const part = await parts.findOne(query);
    console.log(part);
    res.send('Found this: ' + JSON.stringify(part));  //Use stringify to print a json

  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);
});


// Access Example-2
// Route to access database using two parameters:
app.get('/api/mongo2/:inpkey&:item', function(req, res) {
// access as ...app.github.dev/api/mongo2/partID&12345
console.log("inpkey: " + req.params.inpkey + " item: " + req.params.item);

const client = new MongoClient(uri);

async function run() {
  try {
    const database = client.db('ckmdb');
    const where2look = database.collection('cmps415');

    // Here we will make a query object using the parameters provided with the route
    // as they key:value pairs
    const query = {};
    query[req.params.inpkey]= req.params.item;

    console.log("Looking for: " + JSON.stringify(query));

    const part = await where2look.findOne(query);
    console.log('Found this entry: ', part);
    res.send('Found this: ' + JSON.stringify(part));  //Use stringify to print a json

  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);
});


// Route to write to the database:
// Access like this:  https://.....app.github.dev/api/mongowrite/partID&54321
// References:
// https://www.mongodb.com/docs/drivers/node/current/usage-examples/insertOne
// https://www.mongodb.com/docs/drivers/node/current/usage-examples/insertMany

app.get('/api/mongowrite/:inpkey&:inpval', function(req, res) {
console.log("PARAMS: inpkey: " + req.params.inpkey + " inpval: " + req.params.inpval);

const client = new MongoClient(uri);

// The following is the document to insert (made up with input parameters) :
// First I make a document object using static fields
const doc2insert = { 
  name: 'Cris', 
  Description: 'This is a test', };
// Additional fields using inputs:
  doc2insert[req.params.inpkey] = req.params.inpval;

console.log("Adding: " + doc2insert);

async function run() {
  try {
    const database = client.db('ckmdb');
    const where2put = database.collection('cmps415');

    const doit = await where2put.insertOne(doc2insert);
    console.log(doit);
    res.send('Got this: ' + JSON.stringify(doit));  //Use stringify to print a json

  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);
});
