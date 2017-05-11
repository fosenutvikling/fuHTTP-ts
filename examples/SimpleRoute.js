'use strict';
//TODO: use some tests with artillery
var fuhttp = require('../');

var route = new fuhttp.Route('api');
route.get("hello/:name", function (req, res, name) {
    console.log("GET: Hello " + name);
    res.write("hello " + name);
    res.end();
});

route.get("hello/:name/mellow", function (req, res, name) {
    console.log("GET MELLOW: Hello " + name);
    res.write("hello MELLOW " + name);
    res.end();
});

route.post("hello/:name", function (req, res, name) {
    console.log("POST: Hello " + name);
    res.write("hello " + name);
    res.end();
});

route.put("hello/:name", function (req, res, name) {
    console.log("PUT: Hello " + name);
    res.write("hello " + name);
    res.end();
});

route.delete("hello/:name", function (req, res, name) {
    console.log("DELETE: Hello " + name);
    res.write("hello " + name);
    res.end();
});

route.get('ok', function (req, res) {
    console.log("OK?");
    res.write("OKEY???");
    res.end();
});

var server = new fuhttp.Server(5000);
server.addRoute(route);

server.listen();