var express = require("express"),
    app = express(),
    bodyParser = require('body-parser'),
    errorHandler = require('errorhandler'),
    methodOverride = require('method-override');

var MongoJs = require('mongojs');

var _Db = MongoJs.connect("mongodb://localhost:27017/gauge_db");

var hostname = 'localhost';
var port = 4567;
var publicDir = __dirname + '/public';

app.get("/", function (req, res) {
  res.redirect("/index.html");
});

app.use(methodOverride());

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static(publicDir));

app.get('/data/data.json', function (req, res) {
  _Db.collection('data').find({ level: { $exists: true } }, { _id: true, level: true }).sort({ _id: 1 }).limit(2000, function (err, results) {
    var retval = results.map(function (currentValue) {
      var mapped = [];
      mapped.push(currentValue._id * 1000);
      mapped.push(currentValue.level);
      return mapped;
    });

    res.send(JSON.stringify(retval));
  });
});

app.use(errorHandler({
  dumpExceptions: true,
  showStack: true
}));

console.log("Simple static server showing %s listening at http://%s:%s", publicDir, hostname, port);

app.listen(port, hostname);