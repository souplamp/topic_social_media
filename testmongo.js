const { MongoClient } = require("mongodb");
const util = require('util');

const uri = "mongodb+srv://guest:guest@cluster0.6k7ugaa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const cookieParser = require('cookie-parser');
const express = require('express');
const { takeCoverage } = require("v8");

const app = express();
const port = 3000;
app.listen(port);
console.log('Server started at http://localhost:' + port);

// ideas for observer:
// subscribe the database instance to the updates?
// may need more objects.. it'll fit in here somewhere.

class SingletonDatabase {

  // start client only once. //
  static client = new MongoClient(uri);
  static database = this.client.db("Database");
  
  // return database instance //
  static get_database() { 
    if (this.database) {
      return this.database;
    }
  }

}

app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ROUTES //

app.get('/', function(req, res) {
  const myquery = req.query;

  var mycookies = req.cookies;
  var content = "";

  //console.log(mycookies);

  if (JSON.stringify(mycookies) != "{}") {
    content += "Results: " + JSON.stringify(mycookies);
    content += "<br><a href='/print'>Print all cookies.</a><br><a href='/clear'>Clear current cookie.</a>"
  } else {
    content += "You are currently logged out! <br> Redirecting to <a href='/login'>login page</a>...";
    content += "<script>setTimeout(function(){window.location='/login';},2000)</script>" // redirect to login route
  }

  res.send(content);

});

async function retrieve_database() {
  all = "";
  try {
    const d = SingletonDatabase.get_database().collection("Users");
    const query = { };
    const cursor = d.find(query);
    for await (const doc of cursor) {
      all += doc.username + " | " + doc.password + "<br>";
    }
  } finally {
    return all;
  }
}

// TODO: future proof by sending whatever query presented in code..

async function query_database (query) {
  content = "";
  try {
    const users = SingletonDatabase.get_database().collection("Users");
    const q = { username: query.username, password: query.password };
    const result = await users.findOne(q);
    content = result;
    //console.log(content);
  } finally {
    return content;
  }
}

// TODO: future proof by sending whatever query presented in code..
// note big diff: below returns dictionary, not a string

async function find_topic (query) {
  var r;
  //content = "";
  try {
    const records = SingletonDatabase.get_database().collection("Topics");
    const q = { title: query.title };
    const result = await records.findOne(q);
    r = result;
    //content = result;
    //console.log(content);
  } finally {
    return r;
  }
}

async function insert_database(query, collection) {
  try {
    const accounts = SingletonDatabase.get_database().collection(collection);
    const doit = await accounts.insertOne(query);
  } finally {
    return;
  }
}

async function update_entry(filter, update, collection) {
  try {
    const records = SingletonDatabase.get_database().collection(collection);
    const doit = await records.updateOne(filter, update);
  } finally {
    return;
  }
}

app.get('/login', async (req, res) => {
  result = await query_database(req.query);
  content = "";

  if (JSON.stringify(result) != "null") {

    res.cookie('username', result.username, {maxAge : 20000});
    res.cookie('password', result.password, {maxAge : 20000});

    content += "Valid login! Redirecting..";
    content += "<script>setTimeout(function(){window.location='/';},2000)</script>" // redirect to default route
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
      password: req.query.password,
      subscribed_topics: []
    };
    //console.log(JSON.stringify(registration));
    insert_database(registration, "Users");
    res.cookie('username', req.query.username, {maxAge : 20000});
    res.cookie('password', req.query.password, {maxAge : 20000});

    content += "Registration accepted! Redirecting..";
    content += "<script>setTimeout(function(){window.location='/';},2000)</script>" // redirect to default reoute
    res.send(content);
  }

  res.render("register", { insert: content });

});

// interpretting "show all cookies" as meaning all database info
app.get('/print', async(req, res) => {
  content = "Found -> <br>";
  content += await retrieve_database();
  res.send(content + "<br><a href='/clear'>Clear cookie.</a><br><a href='/'>Back to default route.</a>");
});

app.get('/clear', function(req, res) {
  res.cookie('username', '', {expires: new Date(0)});
  res.cookie('password', '', {expires: new Date(0)});
  //console.log(req.cookies);
  res.send("Active authentication cookie was cleared. <br><a href='/print'>Print all.</a><br><a href='/'>Back to default route.</a>");
});

app.get('/insert_topic', function(req, res) {

  var content = "har";

  var our_title = "123";
  var our_message = ["bigchungus", "123"];
  var our_messages = [our_message];

  const topic = {
    title: our_title,
    messages: our_messages
  };

  //console.log(JSON.stringify(topic));
  insert_database(topic, "Topics");

  res.send(content);

});

async function subscribe_user(username, objectid) {
  try {

    const accounts = SingletonDatabase.get_database().collection("Users");

    // updateOne:
    // target the subscribed_ids field.. we don't want to overwrite,
    // but we do want to add one to the list.

    //const doit = await accounts.replaceOne(username, objectid);

    /*
    await db.collection('inventory').updateOne(
      { item: 'paper' },
      {
        $set: { 'size.uom': 'cm', status: 'P' },
        $currentDate: { lastModified: true }
      }
    );
    */

  } finally {
    return;
  }
}

app.get('/topic/:title', async(req, res) => {
  content = "";

  // 1. find corresponding title in database
  var topic_info = await find_topic({title: req.params.title});

  // 2. gather data to insert into view
  var data = [];
  
  t = util.inspect(topic_info.title);
  t = t.substring(1, t.length - 1);

  data.push({title: t});

  for (message in topic_info.messages) {
    a = util.inspect(topic_info.messages[message][0]);
    t = util.inspect(topic_info.messages[message][1]);
    a = a.substring(1, a.length - 1);
    t = t.substring(1, t.length - 1);
    data.push({author: a, text: t});
  }

  missing_keys = !("response" in req.query);
  empty_values = (req.query.response == "");

  if (!missing_keys && empty_values) {
    content += "Missing response information!";
  } else if (!missing_keys && !empty_values) {
    var topic_messages = [];
    
    for (message in topic_info.messages) {
      a = util.inspect(topic_info.messages[message][0]);
      t = util.inspect(topic_info.messages[message][1]);
      a = a.substring(1, a.length - 1);
      t = t.substring(1, t.length - 1);
      topic_messages.push([a, t]);
    }

    topic_messages.push(["dannygonzalez", req.query.response]);

    // DEBUG
    console.log(topic_messages);

    update_entry({title: req.params.title}, {$set: {messages: topic_messages}}, "Topics");

    var protocol = req.protocol + "://";
    var host = req.get('host');
    var path = req.url.split('?')[0];
    var url = protocol + host + path;

    content += "Adding response to topic...";
    content += "<script>setTimeout(function(){window.location='" + url + "';},2000)</script>" // redirect to the same topic
    
    res.send(content);
  }

  // 3. render view
  res.render("topic", { insert: data });

});

app.get('/subscribe_user', function(req, res) {
  var content = "garbar";

  // how can you modify an existing entry?

  subscribe_user("bigchungus", "123")

  /*
  1. all users made with "subscribed_ids" field as an array of objectids
  2. when user subscribes to topic, add that objectid to array of subscribed_ids
  */

  res.send(content);
});