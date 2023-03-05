// Import modules
const express = require('express');
const DataFrame = require("dataframe-js").DataFrame;
const bodyParser = require('body-parser');
const authKeys = require("./auth_keys");

// Declare filepaths
const income_file = '/Datafiles/company_perfomances.csv';
let df;
DataFrame.fromCSV(__dirname + income_file).then(data => df = new DataFrame(data.toDict()));

// Start up the app
const port = process.env.PORT || 3000;
const app = express();
app.listen(port);

// JSON parser for post requests
var jsonParser = bodyParser.json();

// Check authorization header
app.use((req,res,next) => {
  console.log("Checking auth key.");

  var auth = req.headers["authorization"];
  if (typeof auth === 'undefined' || !authKeys.includes(auth)) {
    res.status(401).send("Warning - Tresspassing");
  }
  else {
    next();
  };
});


// Home endpoint
app.get("/", (req,res) => {
  console.log("Home page requested.")

  res.sendFile("home.html", {root:__dirname});
});

app.get("/home", (req,res) => {
  console.log("Home page explicitly requested. Initiating redirect.")

  res.redirect("/");
});


// Get list of companies
app.get("/companies", (req,res) => {
    var fiscalYear = req.query["fiscal_year"];

    res.set('Content-Type','text/plain');
    if (typeof fiscalYear === 'undefined') {
      console.log("List of companies requested");
      res.send(df.toText(","));
    }
    else {
      console.log("List of companies requested with fiscal year:", fiscalYear);
      res.send(df.filter(row => row.get('fiscal_year') === fiscalYear).toText(","));
    };
});


// Get income records for specific company
app.get("/company/:ticker", (req,res) => {
  var ticker = req.params.ticker;
  console.log("Requesting income records for ticker:", ticker);

  res.set('Content-Type','text/plain');
  res.send(df.filter(row => row.get('ticker') === ticker).toText(","));
});


// Post a company
app.post("/companies", jsonParser, (req,res) => {
  console.log("Adding a company record");

  var record = req.body;
  df = new DataFrame(df.toCollection().concat([record]));
  console.log(df.toText(","));
  df.toCSV(true, __dirname + income_file);
  res.status(201).send("Company data inserted: " + JSON.stringify(record));
});


// Update income of specific company
app.patch("/company/:ticker", jsonParser, (req,res) => {
  const ticker = req.params.ticker;
  var body = req.body;
  console.log("Updating income record for ticker:", ticker);

  for(var i in df.toArray()) {
    if (df.getRow(i).toDict()["ticker"] === ticker) {
      for (var j in body) {
        df = df.setRow(i,row => row.set(j, body[j]));
      };
    };
  };

  df.toCSV(true, __dirname + income_file);
  res.send("Updated income records for ticker:" + ticker);
});


// Delete specific company
app.delete("/company/:ticker", (req,res) => {
  var ticker = req.params.ticker;
  console.log("Deleting income records for ticker:", ticker);

  df = df.filter(row => row.get('ticker') !== ticker);
  df.toCSV(true, __dirname + income_file);
  console.log(df.toText(","));
  res.send("Deleted income records for ticker:" + ticker);
});


// Otherwise fire 404
app.use((req,res) => {
  console.log("Request has no known response.")

  res.status(404);
  res.send("404: Request unknown");
});