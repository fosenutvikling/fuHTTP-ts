'use strict';

var fuhttp = require('../');
var cors = require('../dist/middlewares/Cors');
var json = require('../dist/middlewares/JsonResponse');
var form = require('../dist/middlewares/BodyJsonParse');

var r = new fuhttp.Route("app");
r.get("hello/{name}", function (req, res, name) {
    console.log("appget");
    res.json({ "hello": name });
});

r.get("", function (req, res) {
    res.json({ data: "my data" });
});

r.post("post", function (req, res) {
    res.json({ "json": "data",body:req.body });
});

var t = new fuhttp.Server(5000);
t.addRoute(r);
t.use(new cors.Middleware());
t.use(new json.Middleware());
t.use(new form.Middleware());
t.listen();