# fuhttp-ts

![fuhttp](./media/fuhttp.png "fuhttp-ts logo")

Web-server for nodejs written in `TypeScript`, highly inspired by [this blog post](https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/). The server is built on top of the `http` package in nodejs. The router system is built on top of [crossroads.js](https://github.com/millermedeiros/crossroads.js)

Why another web-server package for `nodejs`? because I can _(and because I didn't need all features provided by e.g. [express](https://github.com/expressjs/express))_

## Setup

Install the package

```bash
npm install fuhttp-ts
```

`fuhttp-ts` can now be included within your nodejs project using:

```js
var fuhttp = require('fuhttp-ts');
```

For TypeScript:

```ts
import * as fuhttp from 'fuhttp-ts';
```

## Manual Installation

Manual installation requires a clone of the repo.

Install dependencies defined in `package.json`

```bash
npm install
```

Run the `rebuild` script, as defined in `packages.json`. This will delete the `build/` folder, compile all `.ts` files, create `build/` folder where all `.js` files will reside, and append the license banner to each output file. 


## Documentation

### Server

The Server class are used for handling HTTP requests and responses. 

#### Constructor

Creating a new http-server:

```ts
constructor(port: number, host: string = null)
```

Where `port` is the tcp/ip-port which the server will listen for.

If `host` is set, only connections from `host` will be accepted. 

```ts
var server = new fuhttp.Server(8080, 'localhost');
```

Here, connections made from client with origin-ip `localhost` connecting to the server on port `8080` is only accepted. If the HTTP-server should be made publicly available, `hostname` should be ignored.

#### Add Route

Adding a `Route` to match with an incoming HTTP-request, two methods are made available:

```ts
addRoute(route: Route): void
```

Where `route` is a set of url-patterns. See [Route](#Route) for more information

```ts
add(path: string, route: Route): void
```

`path` is the parent sub-url, where route is accessible from. Please note this will overwrite an existing set `routeName` for the `route` object. 


```ts
let route = new Route('api');
... // Setup routes

server.addRoute(route); // Route is made accessible from the routeName, as defined in the routes' constructor
server.add('test', route); // Overwrites the already set routeName
```

The server can now be accesses the defined `route` object, both from `/api` and `/test`

#### Add Middleware <a name="ServerMiddleware"></a>

A middleware is a set of instructions run before each request in handled by the Routes. See the [Middleware](#Middleware) section for more information about the available Middlewares


```ts
use(middleware: iMiddleware): void
```

#### Error Handling

The server may throw errors, e.g. if a route is not found.
This is where the Error Functions come into play. The `Server` comes with some predefined error-handling functions, these can however be overwritten, which they also probably should. 


| Status Code | Type                          | Event name  | Method Name                      |
|-------------|-------------------------------|-------------|----------------------------------|
| 400         | Request Error                 | request     | onRequestError(error, response)  |
| 444         | Response Error                | response    | onResponseError(error, response) |
| 404         | Route Not Found               | notfound    | onNotFoundError(response)        |
| 413         | Request Data Too Large        | overflow    | onOverflowError(response)        |
| NA          | Client Emits Error            | clientError | onClientError(error, socket)     |
| NA          | Server Closes                 | close       | onClose()                        |
| NA          | Client Request A HTTP Upgrade | upgrade     | onUpgrade()                      |


Each error-handler can be set using the method as described in `Method Name`, or through the more general method:

```ts
on(event: string, func: Function): boolean
```

Where `event` is the `Event Name` as defined in the table above.

The provided example is both equivalent, defining a function to run when there's an error with a HTTP-request

```ts
server.onRequestError = function(error: Error, response: http.ServerResponse) {
    ...
};

server.on('request', function(error: Error, response: http.ServerResponse) {
    ...
});
```

#### Start Server

For the server to start accepting incoming requests, the server needs to be started:

```ts
listen(): void 
```

Your HTTP-server is now able to handle incoming HTTP-requests, as configured in your constructor. If no routes are added at this point, the application will throw an error.

```ts
server.listen();
```



### Route<a name="Route"></a>
The Route class for parsing and matching incoming HTTP-requests based on an URL

#### Constructor

```ts
constructor(routeName: string = null)
```
Where `routeName` is the parent-pattern that will be matched against all incoming requests.

```ts
let route = new Route('api');
```

If the server is running locally, the `route` will be accessible from the url `http://localhost/api`. All incoming requests will be split on the first `/` (after the hostname), and a matching route will be searched for within that route.

```ts
let r1 = new Route('user');
let r2 = new Route('company');
``` 

When the server receives a HTTP-request: `[hostname]/user`, the `r1` route will search for a match from one of its registered patterns, and ignore `r2`. This would prevent the HTTP-server from searching all the defined routes in both `r1` and `r2`.

#### Add Url-Patterns

Requests against the HTTP-server can be done using these common HTTP-methods:

* GET
* POST
* DELETE
* PUT

What method to use when is really up to you, but you should however try to follow the convention. For a simple guide, visit [restapitutorial.com](http://www.restapitutorial.com/lessons/restfulresourcenaming.html)

The format of each function is defined as following: 

    requestUrl: string, func: (req: http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void

`requestUrl` is the pattern which the route should match against. The route parser is built on [snd/url-pattern](https://github.com/snd/url-pattern), supporting both optional, wildcards and regex patterns. Refer to `url-pattern` documentation for more information.

Example of an url-pattern:

        api/:id/[optional/:name]/*

Parameters are defined using the `:` notation infront of a keyword. Optional segments of an url are encapsulated in `[` and `]`.

`func` is the function to call when a HTTP-request url matches the defined pattern in `requestUrl`. When a route matches, the first two parameters will always be:

 * `req` - The actual request made by a user, see the documentation on [nodejs.org](https://nodejs.org/api/http.html#http_class_http_incomingmessage)
 * `res` - The response to send to the user, see the documentation on [nodejs.org](https://nodejs.org/api/http.html#http_class_http_serverresponse)

An undefined number of parameters is passed to `func` depending on the defined pattern in `requestUrl`. If no parameters is defined in `requestUrl`, only the first two parameters will be set.


```ts
route.get('api/:id', function(req, res, id) {
    // HTTP/GET
    // Variable id corresponds to data passed in :id of the requestUrl, e.g. api/1 => id = 1
    ...
    
});

route.get('api/name/:name[/:lastname]', function(req, res, name, lastname) {
    // HTTP/GET
    // api/name/hello/world => name = hello, lastname = world
    ...
});

route.get('user/:id/*', function(req, res, id, optional) {
    // HTTP/GET
    // user/1/my/optional/string => id = 1, optional = my/optional/string
    ...
});

route.get('hello/world', function(req, res) {

});

```

`route.post(...)` , `route.delete(...)`, `route.put(...)` can be replaced with `route.get(...)` in the provided example.

##### Sub Routing

Sub-routing is a way of combining or creating nested routes, and is possible through

    add(route: Route): void

```ts
let route = new Route('api');
let userRoute = new Route('user');
let baseRoute = new Route();

route.add(user);
route.add(base);
```

The `routeName`, as defined in the constructor, will be used as a prefix for merging the different routes.
Here, the `userRoute` will be accessible through `api/user`, while the `baseRoute` through `api/`, as no `routeName` is defined. 

__NOTE:__ If both `route` and `baseRoute` has a set of colliding route-patterns, only the parent-route will be matched, in this case `route`. 


#### Middleware

Each Route can run a middleware before a matched route is called. As opposed to a [server middleware](#ServerMiddleware), which is run on each request, a route middleware is only run for a single route. Use-cases could be to lock-down certain routes for authentication.

```ts
use(middleware: iMiddleware): void
```
More information about middlewares, and the different types can be found in the [middleware](#Middlewares) section below





### Middlewares<a name="Middlewares"></a>

A Middleware is a set of instructions to run before a matching route is searched for. Middlewares are used for altering the HTTP-request and HTTP-response objects before they are passed to a matching route function.

Multiple middlewares are included in this package:

#### CORS

Enables cross-origin requests on the server. 

```ts
...
let cors = new Cors({...}); // See documentatino for options below
server.use(cors);
```

##### Options

- __cookies__: boolean
    - default = false
    - Whether the allow-credentials header should be set, supporting the use of cookies with CORS _(Access-Control-Allow-Credentials)_
- __methods__: HTTP_METHODS[] 
    - default = null => uses HTTP-method used in HTTP-request
    - Supported http-methods for a route, defaults to current request method _(Access-Control-Request-Method)_
- __maxage__: number
    - default = 1
    - How many seconds a response to be cached for CORS _(Access-Control-Max-Age)_

The CORS middleware are implemented following the guide(s) found at [enable-cors.org](http://enable-cors.org)

#### BodyJsonParse

Parsing of body-data to `json`, using `querystring` or `JSON.parse`.

```ts
...
server.use(new BodyJsonParse());
```

This middleware exposes a `.body` variable as an object type to the `http.ServerResponse` parameter.

```ts
function(request, response) {
    let bodyData:{} = request.body;
    
    response.write('post id: ' + bodyData.id);
}
```

#### JsonResponse

Generates a json response from an input js object. Exposes a method `json()` to the `response` object, and automatically ends the response.

```ts
function(request, response) {
    response.json({
        id: 12,
        description: "lorem ipsum"
    });
}
```

HTML response:

```html
{
    "id": 12,
    "description": "lorem ipsum"
}
```


#### Custom

Each middleware is implementing the `iMiddleware` interface, which requires the `alter(...)` method to be implemented.


    alter(request: http.IncomingMessage, response: http.ServerResponse): boolean;

All middlewares is required to return a `boolean` value. If a middleware is returning `false`, the request will stop executing.

```ts
import {iMiddleware} from 'fuhttp';

class MyCustomMiddleware implements iMiddleware {
    public alter(req, res): boolean {
        ... // Do some tweaks on the req / res objects here
        return true; // return false if you want to stop execution
    }
}
```


## Examples

Multiple examples are found in the `examples/` folder.

```js
var fuhttp=require('fuhttp'); // Load package

var myRoute = new fuhttp.Route();

myRoute.get("hello/:name", function(req, res, name) {
    res.write("Hello, your name is " + name);
    res.end();
});

var server = new fuhttp.Server(5000); // Defined the port number which the http-server should accept connections

server.add("api", myRoute); // Add the myRoute for parsing request URIs and call appropriate route
server.listen(); // Start listening for incoming requests
```

## TODOs

- [ ] ~~Support for [`connect`](https://github.com/senchalabs/connect) middlewares~~
    - As the connect middlewares expectes an input parameter `next()` this idea was scrapped, as I'm not a fan of this design structure
- [x] `POST`, `PUT` and `DELETE` body data parsing
- [x] Publish as `npm` package
- [ ] Testing, mochajs?


## Release History

See the [changelog](CHANGELOG.md)

## License

© Fosen-Utvikling AS, 2016 - 2017. Licensed under a [MIT](LICENSE) license
