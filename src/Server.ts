import { Route, NoMatchingHttpMethodException } from './Route';
import * as net from 'net';
import * as http from 'http';
import * as formidable from 'formidable';
import { IMiddleware } from './middlewares/IMiddleware';
import { HttpResponse } from './fuhttp';

// Keys stored in `_errorFunctions` of the Server class
const ERROR_KEY_REQUEST = 'request';
const ERROR_KEY_RESPONSE = 'response';
const ERROR_KEY_NOTFOUND = 'notfound';
const ERROR_KEY_OVERFLOW = 'overflow';
const ERROR_EXCEPTION = 'exception';
const ERROR_METHOD_NOT_ALLOWED = 'notallowed';

export interface IBodyRequest extends http.IncomingMessage {
    body?: string | {};
    fields?: formidable.Fields;
    files?: formidable.Files;
    contentType?: string;
}

/**
 * The HTTP-server class for receiving and responding to HTTP-requests
 */
export class Server {
    /**
     * http node server instance
     */
    private server: http.Server;

    /**
     * Port number to listen for
     */
    private port: number;

    /**
     * hostname/ip in which `server` should accept connections to
     * Leave as null to listen to all IP-adresses. Example usage:
     * using the node-http server as a Reverse Proxy
     */
    private hostname: string;

    /**
     * Status whether the http-server is started and accepts
     * connections or not
     */
    private connected: boolean;

    /**
     * The route added to the http-server, which is recognized
     * and parsed for each http-request by the requested url
     */
    private route: Route;

    /**
     * Middlewares added to the http-server. All middlewares
     * are run before a route is triggered, which can be used
     * to alter the request and response http-objects
     */
    private _middlewares: IMiddleware[];

    /**
     * Error functions for custom-handling of errors. To set
     * error functions see all "on*" methods. If no error
     * functions are set, the defaults are used
     */
    private _errorFunctions: { [key: string]: Function };

    /**
     * Creates an instance of Server.
     */
    public constructor(port: number, host: string = null) {
        // Initialize variables to be populated
        this.port = port;
        this.hostname = host;
        this.route = null;
        this._middlewares = [];
        this._errorFunctions = {};
        this.connected = false;

        this.server = http.createServer();

        var self = this;

        this.server.on('request', function(
            request: http.IncomingMessage,
            response: http.ServerResponse
        ): void {
            var body = '';
            request.on('error', function(error: Error): void {
                self._errorFunctions[ERROR_KEY_REQUEST](error, response);
            });

            response.on('error', function(error: Error): void {
                self._errorFunctions[ERROR_KEY_RESPONSE](error, response);
            });

            // Should parse the body if a POST,PUT or DELETE request is made, with content-length set
            if (request.method !== 'GET' && request.headers['content-length'] != undefined) {
                var contentTypeRaw: string = request.headers['content-type'];
                var contentType =
                    contentTypeRaw != undefined
                        ? contentTypeRaw.slice(0, contentTypeRaw.indexOf(';'))
                        : null;

                (<IBodyRequest>request).contentType = contentType;

                if (contentType === 'multipart/form-data') {
                    var form = new formidable.IncomingForm();
                    form.parse(request, function(
                        error: any,
                        fields: formidable.Fields,
                        files: formidable.Files
                    ): any {
                        if (error) return request.emit('error', 'Error parsing request body');

                        (<IBodyRequest>request).fields = fields;
                        (<IBodyRequest>request).files = files;
                        self.routeLookup(request, response);
                    });
                } else {
                    request.on('data', function(data: Buffer): Function {
                        body += data;

                        // Prevent flooding of RAM (1mb) http://stackoverflow.com/a/8640308
                        if (body.length > 1e6) {
                            return self._errorFunctions[ERROR_KEY_OVERFLOW](response);
                        }
                    });

                    request.on('end', function(): void {
                        (<IBodyRequest>request).body = body;
                        self.routeLookup(request, response);
                    });
                }
            } // No need to parse any body data when a GET request is made
            else self.routeLookup(request, response);
        });
    }

    /**
     * Look up route based on request url.
     * Will load any middlewares if defined.
     * If no routes are found, the `ERROR_KEY_NOTFOUND` error functions will be called
     *
     * @param request
     * @param response
     */
    private routeLookup(request: http.IncomingMessage, response: http.ServerResponse): boolean {
        // Load middlewares
        var length = this.middlewares.length;
        for (let i = 0; i < length; ++i)
            if (!this.middlewares[i].alter(request, response))
                // Should stop processing of data if a middleware fails, to prevent setting headers if already changed by a middleware throwing an error
                return false;

        try {
            if (this.route.parse({ url: request.url }, request, response)) return true;
            // 404 error
            this._errorFunctions[ERROR_KEY_NOTFOUND](response);
            return false;
        } catch (ex) {
            if (ex instanceof NoMatchingHttpMethodException) {
                this._errorFunctions[ERROR_METHOD_NOT_ALLOWED](
                    Object.keys(ex.supportedMethods),
                    response
                );
            }
        }
        return false;
    }

    /**
     * Whether the server is listening for connections or not. Will
     * only be true as long as the `listen` method is called
     */
    public get isListening(): boolean {
        return this.connected;
    }

    /**
     * Set functions to run on triggered events
     *
     * @param event to listen for
     * @param func function to run on event triggered
     * @returns Whether event added successfully for listening
     * @throws Error if the provided event argument cannot be added as eventListener
     */
    public on(event: string, func: (...args: any[]) => void): boolean {
        switch (event) {
            case 'clientError':
            case 'close':
            case 'upgrade':
                break;

            case ERROR_KEY_RESPONSE:
                this._errorFunctions[ERROR_KEY_RESPONSE] = func;
                return true;

            case ERROR_KEY_REQUEST:
                this._errorFunctions[ERROR_KEY_REQUEST] = func;
                return true;

            case ERROR_KEY_NOTFOUND:
                this._errorFunctions[ERROR_KEY_NOTFOUND] = func;
                return true;

            case ERROR_EXCEPTION:
                this._errorFunctions[ERROR_EXCEPTION] = func;
                return true;

            case ERROR_METHOD_NOT_ALLOWED:
                this._errorFunctions[ERROR_METHOD_NOT_ALLOWED] = func;
                return true;

            default:
                throw new Error('Event: ' + event + ' not recognized');
        }

        this.server.on(event, func);
    }

    /**
     * Function to run on a "clientError"
     * https://nodejs.org/api/http.html#http_event_clienterror
     */
    public set onClientError(func: (error: Error, socket: net.Socket) => void) {
        this.server.on('clientError', func);
    }

    /**
     * Function to run when the server closes for new connections
     * https://nodejs.org/api/http.html#http_event_close
     */
    public set onClose(func: () => void) {
        this.server.on('close', func);
    }

    /**
     * Function to run when "upgrade" emitted by client
     * https://nodejs.org/api/http.html#http_event_upgrade_1
     */
    public set onUpgrade(func: () => void) {
        this.server.on('upgrade', func);
    }

    /**
     * Function to run if a request throws an error
     */
    public set onRequestError(func: (error: any, response: http.ServerResponse) => void) {
        if (this._errorFunctions[ERROR_KEY_REQUEST] != undefined)
            throw new Error('Request error function already set');
        this._errorFunctions[ERROR_KEY_REQUEST] = func;
    }

    /**
     * Function to run if a response throws an error
     */
    public set onResponseError(func: (error: any, response: http.ServerResponse) => void) {
        if (this._errorFunctions[ERROR_KEY_RESPONSE] != undefined)
            throw new Error('Response error function already set');
        this._errorFunctions[ERROR_KEY_RESPONSE] = func;
    }

    /**
     * Function to run if a route is not found (404 http method)
     */
    public set onNotFoundError(func: (response: http.ServerResponse) => void) {
        if (this._errorFunctions[ERROR_KEY_NOTFOUND] != undefined)
            throw new Error('Not-Found error function already set');
        this._errorFunctions[ERROR_KEY_NOTFOUND] = func;
    }

    /**
     * Function to run if a request provides too much data
     */
    public set onOverflowError(func: (response: http.ServerResponse) => void) {
        if (this._errorFunctions[ERROR_KEY_OVERFLOW] != undefined)
            throw new Error('Overflow error function already set');
        this._errorFunctions[ERROR_KEY_OVERFLOW] = func;
    }

    public set onException(func: (error: Error, response: http.ServerResponse) => void) {
        if (this._errorFunctions[ERROR_EXCEPTION] != undefined)
            throw new Error('Exception error function already set');
        this._errorFunctions[ERROR_EXCEPTION] = func;
    }

    public set onMethodNotAllowed(
        func: (supportedMethods: string[], response: http.ServerResponse) => void
    ) {
        if (this._errorFunctions[ERROR_METHOD_NOT_ALLOWED] != undefined)
            throw new Error('Method Not Found error function already set');
        this._errorFunctions[ERROR_METHOD_NOT_ALLOWED] = func;
    }

    /**
     * Adds a new route for the http-server for accepting http-requests
     *
     * @param routeName
     * @param route object to add
     */
    public add(routeName: string, route: Route): void {
        // Check if root route should be replaced
        if (routeName === '/') {
            if (this.route) {
                throw new Error(
                    'Root route about to be overwritten. You need to update your route structure!'
                );
            }
            this.route = route;
        } else {
            // Need to define root route, if not already defined
            if (!this.route) this.route = new Route();
            this.route.add(routeName, route);
        }
    }

    /**
     * Appends a middleware
     *
     * @param middleware to be added
     */
    public use(middleware: IMiddleware): void {
        this._middlewares.push(middleware);
    }

    /**
     * Retrieve all registered middlewares
     */
    public get middlewares(): IMiddleware[] {
        return this._middlewares;
    }

    /**
     * Retrieve the function to call when a route is not found
     * Used by "Route"
     */
    public get notfound(): Function {
        return this._errorFunctions[ERROR_KEY_NOTFOUND];
    }

    /**
     * Start the http-server, for accepting incomming connections on the
     * given port and hostname
     * @throws Error If no Routes are added before starting HTTP-server
     */
    public listen(): void {
        if (this.route == null)
            throw new Error('No routes added, and no connections will therefore be accepted.');

        if (this._errorFunctions[ERROR_KEY_REQUEST] == undefined)
            this._errorFunctions[ERROR_KEY_REQUEST] = function(
                error: Error,
                response: http.ServerResponse
            ): void {
                console.error(error.stack);
                response.setHeader('Content-Type', 'text/html');
                response.statusCode = 400;
                response.statusMessage = 'Bad Request';
                response.write('Error: ' + error);
                response.write(
                    'The Request Error function is not set. It can be set using the appropriate function (onRequestError)'
                );
                response.end();
            };

        if (this._errorFunctions[ERROR_KEY_RESPONSE] == undefined)
            this._errorFunctions[ERROR_KEY_RESPONSE] = function(
                error: Error,
                response: http.ServerResponse
            ): void {
                console.error(error.stack);
                response.setHeader('Content-Type', 'text/html');
                response.statusCode = 444; // NGINX specific error code
                response.statusMessage = 'No Response';
                response.write(
                    'The Response Error function is not set. It can be set using the appropriate function (onResponseError)'
                );
                response.end();
            };

        if (this._errorFunctions[ERROR_KEY_NOTFOUND] == undefined)
            this._errorFunctions[ERROR_KEY_NOTFOUND] = function(
                response: http.ServerResponse
            ): void {
                response.setHeader('Content-Type', 'text/html');
                response.statusCode = 404;
                response.statusMessage = 'Not Found';
                response.write(
                    'The Not Found Error function is not set. It can be set using the appropriate function (onNotFoundError)'
                );
                response.end();
            };

        if (this._errorFunctions[ERROR_KEY_OVERFLOW] == undefined)
            this._errorFunctions[ERROR_KEY_OVERFLOW] = function(
                response: http.ServerResponse
            ): void {
                response.setHeader('Content-Type', 'text/html');
                response.statusCode = 413;
                response.statusMessage = 'Request Entity Too Large';
                response.write(
                    'The Overflow Error function is not set. It can be set using the appropriate function (onOverflowError)'
                );
                response.end();
            };
        if (this._errorFunctions[ERROR_METHOD_NOT_ALLOWED] == undefined)
            this._errorFunctions[ERROR_METHOD_NOT_ALLOWED] = (
                supportedMethods: string[],
                response: http.ServerResponse
            ) => {
                HttpResponse.MethodNotAllowed(response, supportedMethods);
            };

        this.server.listen(this.port, this.hostname);
        console.log('STARTED SERVER ON PORT: ' + this.port + ' AND LISTENING ON: ' + this.hostname);
        this.connected = true;
    }
}
