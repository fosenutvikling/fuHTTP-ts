import * as fuhttp from '../';

var route = new fuhttp.Route();
route.get('hello/:name', function (req, res: fuhttp.iServerResponse, name) {
    res.json({ 'hello': name });
});

route.get('', function (req, res: fuhttp.iServerResponse) {
    res.json({ data: 'my data' });
});

route.post('post', function (req, res: fuhttp.iServerResponse, ) {
    res.json({ 'json': 'data', body: req.body });
});


var route1 = new fuhttp.Route();
route1.get('hello/:name', function (req, res: fuhttp.iServerResponse, name) {
    res.json({ 'hello': name });
});

route1.get('', function (req, res: fuhttp.iServerResponse) {
    res.json({ data: 'my data' });
});

route1.post('post', function (req, res: fuhttp.iServerResponse, ) {
    res.json({ 'json': 'data', body: req.body });
});
var server = new fuhttp.Server(5000);

// Add routes
server.add('app', route);
server.addRoute(route1);

// Add middlewares
server.use(new fuhttp.Cors()); // Enable cross-origin requests
server.use(new fuhttp.BodyJsonParse()); // Parse body data from HTTP-request
server.use(new fuhttp.JsonResponse()); // Return data as JSON

// Start the server
server.listen();