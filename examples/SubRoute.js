'use strict';

var fuhttp = require('../');

var route1 = new fuhttp.Route('api');
route1.get('hello', function (req, res) {
    res.write("route1 hello");
    res.end();
});

var route2 = new fuhttp.Route();
route2.get('mix', function (req, res) {
    fuhttp.HttpResponse.ServerError(res);

    res.write('route2 hello');
    res.end();
});

route1.add(route2);

var server = new fuhttp.Server(5000);
server.addRoute(route1);

server.listen();