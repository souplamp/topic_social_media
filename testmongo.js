const { MongoClient } = require("mongodb");

/*

routes:
  default - check for cookie
    if none, go to login
    if so, print details
  login - login form that creates existing cookie
    set so it lasts 1 minute
  register - register form that inserts record and sets cookie after validation
    set so it lasts 1 minute

  (_) create form for login page

*/

// The uri string must be the connection string for the database (obtained on Atlas).

const uri = "mongodb+srv://<user>:<[password]>@cluster0.6k7ugaa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// --- This is the standard stuff to get it to work on the browser
const cookieParser = require('cookie-parser');
const express = require('express');

const app = express();
const port = 3000;
app.listen(port);
console.log('Server started at http://localhost:' + port);

app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // need this to show cookies

// ROUTES //

app.get('/', function(req, res) {
  const myquery = req.query;

  var mycookies = req.cookies;
  var content = "";

  console.log(mycookies);

  if (JSON.stringify(mycookies) != "{}") { // is it empty?
   content += "Results: " + JSON.stringify(mycookies);
  } else {
    content += "NO RESULTS! <br> Redirecting to <a href='/login'>login page</a>...";
    content += "<script>setTimeout(function(){window.location='/login';},2000)</script>" // redirect to login
  }

  res.send(content);

});

/*
const asyncFunc = () => {
  return new Promise((resolve) => {
    setTimeout(() => resolve("Hello World!"), 1000)
  })
}

app.get('/', async (req, res) => {
  const result = await asyncFunc()
  return res.send(result)
})
*/

async function query_database (query) {
  content = "";
  const client = new MongoClient(uri);
  try {
    const database = client.db('Database');
    const users = database.collection('MyStuff');
    const q = { username: query.username, password: query.password };
    const result = await users.findOne(q);
    content = result;
    console.log(content);
  } finally {
    await client.close();
    
    return content;
    console.log(content);
    //return new Promise((resolve) => {
    //  setTimeout(() => resolve(content), 1000);
    //})
  }
}

app.get('/login', async (req, res) => {
  //stringified_query = JSON.stringify(req.query);
  //const content = await JSON.stringify(query_database(req.query));
  content = JSON.stringify(await query_database(req.query))
  res.render("login", { bigchunkus: content });
});

  // run try catch block, if in database

  //res.render("login");
//});

/* use this to access teh database

// database access route:
app.get('/api/mongo/:item', function(req, res) {
  const client = new MongoClient(uri);

  const searchKey = "{ partID: '" + req.params.item + "' }";
  console.log("Looking for: " + searchKey);

  async function run() {
    try {

      const database = client.db('Database');
      const parts = database.collection('MyStuff');

      const query = { partID: req.params.item };

      const part = await parts.findOne(query);
      console.log(part);
      res.send('Found this: ' + JSON.stringify(part));

    } finally {
      await client.close();
    }
  }
    run().catch(console.dir);
});

*/

app.get('/set', function(req, res) {
  res.cookie('name', 'value', {maxAge : 20000});
  //res.send("set!");
  res.render("sam");
});

app.get('/show', function(req, res) {
  mycookies = req.cookies;
  res.send("here: ", mycookies);
});











app.get('/say/:name', function(req, res) {
  res.send('Hello ' + req.params.name + '!');
});


// Route to access database:
app.get('/api/mongo/:item', function(req, res) {
const client = new MongoClient(uri);
const searchKey = "{ partID: '" + req.params.item + "' }";
console.log("Looking for: " + searchKey);

async function run() {
  try {
    const database = client.db('ckmdb');
    const parts = database.collection('cmps415');

    // Hardwired Query for a part that has partID '12345'
    // const query = { partID: '12345' };
    // But we will use the parameter provided with the route
    const query = { partID: req.params.item };

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
