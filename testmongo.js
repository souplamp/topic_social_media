const { MongoClient, Double } = require("mongodb");
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

// (_) Upon logic, user can see 2 most recent messages posted in each subscribed topic. //
app.get('/', function(req, res) {  
  const myquery = req.query;

  var mycookies = req.cookies;
  var content = "";

  if (JSON.stringify(mycookies) != "{}") {
    content += "Results: " + JSON.stringify(mycookies);
    content += "<br><a href='/print'>Print all cookies.</a><br><a href='/clear'>Clear current cookie.</a>"
  } else {
    content += "You are currently logged out! <br> Redirecting to <a href='/login'>login page</a>...";
    content += "<script>setTimeout(function(){window.location='/login';},2000)</script>" // redirect to login route
  }

  res.send(content);
  return
});

// create a 'default' page:
// show most recent messages (2 at most) for each subscribed topics.
// so on default route, for each topic, show title with at least zero at most two
// after all topics have button to all topics

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

async function query_database (query) {
  content = "";
  try {
    const users = SingletonDatabase.get_database().collection("Users");
    const q = { username: query.username, password: query.password };
    const result = await users.findOne(q);
    content = result;
  } finally {
    return content;
  }
}

async function validate_user_exists(query) {
  try {
    const users = SingletonDatabase.get_database().collection("Users");
    const q = { username: query.username};
    const result = await users.findOne(q);
    var validation = false;
    if (result != null) {
      validation = true
    }
  } finally {
    return validation;
  }
}

async function get_subscribed_topics(query) {
  content = "";
  try {
    const users = SingletonDatabase.get_database().collection("Users");
    const q = { username: query.username };
    const result = await users.findOne(q);
    const topics = result.subscribed_topics;
    content = topics;
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

async function get_all_topics() {
  var r;
  try {
    const db = SingletonDatabase.get_database().collection("Topics");
    const result = await db.find().toArray();
    r = result;
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

    res.cookie('username', result.username, {maxAge : 100000});
    res.cookie('password', result.password, {maxAge : 100000});

    content += "Valid login! Redirecting..";
    content += "<script>setTimeout(function(){window.location='/';},2000)</script>" // redirect to default route
    res.send(content);
    return
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
    return
  }

  res.render("register", { insert: content });

});

// interpretting "show all cookies" as meaning all database info
app.get('/print', async(req, res) => {
  content = "Found -> <br>";
  content += await retrieve_database();
  res.send(content + "<br><a href='/clear'>Clear cookie.</a><br><a href='/'>Back to default route.</a>");
  return
});

app.get('/clear', function(req, res) {
  res.cookie('username', '', {expires: new Date(0)});
  res.cookie('password', '', {expires: new Date(0)});
  //console.log(req.cookies);
  res.send("Active authentication cookie was cleared. <br><a href='/print'>Print all.</a><br><a href='/'>Back to default route.</a>");
  return
});

async function subscribe_user(login, objectid) {
  try {
    var user_info = await query_database(login);
    var user_subscriptions = user_info.subscribed_topics;
    await user_subscriptions.push(objectid);
    //console.log(user_subscriptions);
    update_entry(login, {$set: {subscribed_topics: user_subscriptions}}, "Users");
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

  improper_login = !("username" in req.cookies);
  missing_keys = !("response" in req.query);
  empty_values = (req.query.response == "");

  if (!missing_keys && !empty_values) {

    var protocol = req.protocol + "://";
    var host = req.get('host');
    var path = req.url.split('?')[0];
    var url = protocol + host + path;

    // TODO: render this on top of the render as an insert instead.. would look better?
    // or use javascript to UNHIDE an element that says such. this would be waaay better.
    if (improper_login) {
      content += "You are not currently logged in.<br><a href='" + url + "'>Click here to go back to the topic.</a>";
      res.send(content);
      return
    }

    var topic_messages = [];

    for (message in topic_info.messages) {
      a = util.inspect(topic_info.messages[message][0]);
      t = util.inspect(topic_info.messages[message][1]);
      a = a.substring(1, a.length - 1);
      t = t.substring(1, t.length - 1);
      topic_messages.push([a, t]);
    }

    topic_messages.push([req.cookies.username, req.query.response]);

    update_entry({title: req.params.title}, {$set: {messages: topic_messages}}, "Topics");

    content += "Adding response to topic...";
    content += "<script>setTimeout(function(){window.location='" + url + "';},2000)</script>" // redirect to the same topic
    
    res.send(content);
    return;
  }

  // 3. render view
  res.render("topic", { insert: data });

});

app.get('/user/:username', async(req, res) => {
  var validation = await validate_user_exists({username: req.params.username});

  if (validation == false) {
    res.send("Username not valid.");
    return;
  }

  var subscribed_topic_titles = await get_subscribed_topics({username: req.params.username});
  var to_display = [];

  // with the array of subscribed_topic titles, iterate through each one
  for (title of subscribed_topic_titles) {

    // with each title, get that topic
    var topic = await find_topic({title: title});

    // collect the LAST two (if any) of messages posted (1-2).
    var messages = await topic.messages;

    // info to render
    var insert = {};
    insert.title = title;

    var next_to_last = messages[messages.length - 2];
    if (next_to_last != undefined) {
      insert.next_to_last_author = next_to_last[0];
      insert.next_to_last_text = next_to_last[1];
    }

    var the_last = messages[messages.length - 1];
    insert.the_last_author = the_last[0];
    insert.the_last_text = the_last[1];
    
    to_display.push(insert);
    
  };

  res.render("user", { insert: to_display });
  return;

});

app.get('/subscribe/:title', function(req, res) {
  content = "";

  improper_login = (!("username" in req.cookies) || !("password" in req.cookies));

  if (improper_login) {
    res.send("No login found..");
    return;
  }

  subscribe_user(req.cookies, req.params.title);
  content = "subscription to topic successful!" + " " + req.params.title;
  
  // redirect to said topic with js.
  res.send(content);
  return;

});

app.get('/list', async(req, res) => {

  var content = "";

  var topics = await get_all_topics();
  var data = [];

  for (topic in topics) {
    t = topics[topic].title;
    data.push({title: t});
  }

  // ?title=a&message=b&singlebutton=
  // console.log(req.query);

  improper_login = !("username" in req.cookies);
  missing_keys = (!("title" in req.query) || !("message" in req.query));
  empty_values = (req.query.title == "" || req.query.message == "");

  if (!missing_keys && !empty_values) {

    var protocol = req.protocol + "://";
    var host = req.get('host');
    var path = req.url.split('?')[0];
    var url = protocol + host + path;

    // TODO: render this on top of the render as an insert instead.. would look better?
    // or use javascript to UNHIDE an element that says such. this would be waaay better.
    if (improper_login) {
      content += "You are not currently logged in.<br><a href='" + url + "'>Click here to go back to the topics list.</a>";
      res.send(content);
      return
    }

    const topic = {
      title: req.query.title,
      messages: [[req.cookies.username, req.query.message]]
    };

    insert_database(topic, "Topics");
    subscribe_user(req.cookies, topic.title);

    content += "Creating topic...";
    content += "<script>setTimeout(function(){window.location='" + url + "';},2000)</script>" // redirect to the same topic
    // to change this make it subscribe instead, or just call the subscribe function?
    
    res.send(content);
    return
  }

  res.render("list", {insert: data});
  return

});