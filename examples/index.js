'use strict';

var fuhttp = require('../');
var cors = require('../dist/middlewares/Cors');
var json = require('../dist/middlewares/JsonResponse');

var r = new fuhttp.Route("app");
r.get("hello/{name}", function (req, res, name) {
    console.log("appget");
    res.json({ "hello": name });
    res.end();
});

r.get("", function (req, res) {
    res.json({ data: "my data" });
});

var t = new fuhttp.Server(5000);
t.addRoute(r);
t.use(new cors.Middleware());
t.use(new json.Middleware());
t.listen();