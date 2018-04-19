import * as fuhttp from '../';

var route1 = new fuhttp.Route();
route1.get('hello', function(req, res) {
    res.write('route1 hello');
    res.end();
});

var route2 = new fuhttp.Route();
route2.get('mix', function(req, res) {
    fuhttp.HttpResponse.ServerError(res);

    res.write('route2 hello');
    res.end();
});

var server = new fuhttp.Server(5000);

// Define route2 as a sub-route to route1 under `/sub`
route1.add('/sub', route2);

// Append route to server
server.add('/api', route1);

// Start server
server.listen();
