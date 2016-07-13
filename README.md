# fuhttp-ts

![fuhttp](./media/fuhttp.png "fuhttp-ts logo")

Web-server for nodejs written in `TypeScript`, highly inspired by [this blog post](https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/). The server is built on top of the `http` package in nodejs. The router system is built on top of [crossroads.js](https://github.com/millermedeiros/crossroads.js)

Why another web-server package for `nodejs`? because I can _(and because I didn't need all features provided by e.g. [express](https://github.com/expressjs/express))_

## Setup

Install the package

```bash
npm install fuhttp-ts
```

`fuhttp-ts` can now be included within your project using:

```js
var fuhttp = require('fuhttp-ts');
```


## Manual Installation

Manual installation requires a clone of the repo.
The project requires [Grunt](https://github.com/gruntjs/grunt), [TypeScript](https://github.com/Microsoft/TypeScript) and [typings](https://github.com/typings/typings) to be installed on the running computer. Please refer to each repo for installation instructions.

Install dependencies defined in `package.json` and `typings.json`

```bash
npm install
typings install
```

To compile the `TypeScript` files to `JavaScript` and minify them, use the `build` command defined in the `Gruntfile.js` file.

```bash
grunt build
```

This will create a folder:

- `build/` containing the `.js` representations of the `.ts` files, including the `d.ts` files and mapping `.map.js` files, used for debugging.


## Documentation

### Server

### Route

### Middlewares

#### CORS

The CORS middleware are implemented following the guide(s) found at [enable-cors.org](http://enable-cors.org)

#### BodyJsonParse

Parsing of body-data to `json`, using `querystring` or `JSON.parse`.

#### JsonResponse

Generates a json response from an input js object. Exposes a method `json()` to the `response` object

```js
response.json({
    id: 12,
    description: "lorem ipsum"
});
```

HTML response:

```html
{
    "id": 12,
    "description": "lorem ipsum"
}
```

## Examples

Example for how to use the http-server is found in the `examples/` folder.

```js
var fuhttp=require('fuhttp'); // Load package

var myRoute = new fuhttp.Route();

myRoute.get("hello/{name}", function(req, res, name) {
    res.write("Hello, your name is" + name);
    res.end();
});

var server = new fuhttp.Server(5000); // Defined the port number which the http-server should accept connections

server.add("api", myRoute); // Add the myRoute for parsing request URIs and call appropriate route
server.listen(); // Start listening for incoming requests
```

## TODOs

- [ ] Support for [`connect`](https://github.com/senchalabs/connect) middlewares
- [x] `POST`, `PUT` and `DELETE` body data parsing
- [ ] Publish as `npm` package
- [ ] Testing, mochajs?


## Release History

See the [changelog](CHANGELOG.md)

## License

© Fosen-Utvikling AS, 2016. Licensed under a [MIT](LICENSE) license
