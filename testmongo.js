const { MongoClient } = require("mongodb");

/*

routes:
  default - check for cookie
    if none, go to login
    if so, print details
  login - login form that creates existing cookie
    if query exists, then make a new cookie
    if it doesn't return proper error msg
  register - register form that inserts record and sets cookie after validation
    set so it lasts 1 minute

*/

const uri = "mongodb+srv://<user>:<password>@cluster0.6k7ugaa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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
    content += "You are currently logged out! <br> Redirecting to <a href='/login'>login page</a>...";
    content += "<script>setTimeout(function(){window.location='/login';},500)</script>" // redirect to login
  }

  res.send(content);

});

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
  }
}

async function insert_database(query) {
  const client = new MongoClient(uri);
  try {
    const database = client.db('Database');
    const accounts = database.collection('MyStuff');
    const doit = await accounts.insertOne(query);
  } finally {
    await client.close();
  }
}

app.get('/login', async (req, res) => {
  result = await query_database(req.query);
  content = "";

  if (JSON.stringify(result) != "null") {

    //content += JSON.stringify(result.username + " | " + result.password);
    res.cookie('username', result.username, {maxAge : 20000});
    res.cookie('password', result.password, {maxAge : 20000});

    content += "Valid login! Redirecting..";
    content += "<script>setTimeout(function(){window.location='/';},2000)</script>" // redirect to login
    res.send(content);

  } else {
    missing_keys = (!("username" in req.query) || !("password" in req.query));
    empty_values = (req.query.username == "" || req.query.password == "");
    if (!missing_keys && empty_values) {
      content += "Missing login information!";
    } else if (!missing_keys && !empty_values) {
      content += "No matching login found in database."
    }
  }

  res.render("login", { insert: content });
  
});

app.get('/register', async (req, res) => {
  content = "";

  missing_keys = (!("username" in req.query) || !("password" in req.query));
  empty_values = (req.query.username == "" || req.query.password == "");

  if (!missing_keys && empty_values) {
    content += "Missing registration information!";
  } else if (!missing_keys && !empty_values) {
    const registration = {
      username: req.query.username,
      password: req.query.password
    };
    console.log(JSON.stringify(registration));
    insert_database(registration);
  }

  res.render("register", { insert: content });

});













app.get('/set', function(req, res) {
  res.cookie('name', 'value', {maxAge : 20000});
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
