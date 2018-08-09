import { Route, NoMatchingHttpMethodException } from './Route';
import * as net from 'net';
import * as http from 'http';
import * as formidable from 'formidable';
import { IMiddleware } from './middlewares/IMiddleware';
import { JsonResponse } from './middlewares/JsonResponse';
import { BodyJsonParse } from './middlewares/BodyJsonParse';
import {
    DefaultErrorResponse,
    DefaultNoResponseErrorResponse,
    DefaultNotFoundErrorResponse,
    DefaultLargeEntityErrorResponse,
    DefaultMethodNotAllowedResponse
} from './DefaultResponse';

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

class OverflowError extends Error {}
class FormidableError extends Error {}

/**
 * The HTTP-server class for receiving and responding to HTTP-requests
 */
export class Server {
    private static defaultMiddleWares() {
        return [new JsonResponse(), new BodyJsonParse()];
    }

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
        this._middlewares = Server.defaultMiddleWares();
        this._errorFunctions = {};
        this.connected = false;

        this.server = http.createServer();
        this.server.on('request', this.onServerRequest);
    }

    private onServerRequest = async (
        request: http.IncomingMessage,
        response: http.ServerResponse
    ) => {
        request.on('error', this.onRequestServerError(response));
        response.on('error', this.onResponseServerError(response));

        // Should try to parse body data
        if (request.method !== 'GET' && request.headers['content-length'] != undefined) {
            try {
                request = await this.getRequestWithBody(request);
            } catch (ex) {
                if (ex instanceof OverflowError) {
                    this._errorFunctions[ERROR_KEY_OVERFLOW](response);
                } else if (ex instanceof FormidableError) {
                    request.emit('error', 'Error parsing body');
                } else {
                    request.emit('error', `Unknown error occured: ${ex}`);
                }
                return;
            }
        }

        this.routeLookup(request, response);
    };

    private onRequestServerError = (response: http.ServerResponse) => {
        return (error: Error) => this._errorFunctions[ERROR_KEY_REQUEST](error, response);
    };

    private onResponseServerError = (response: http.ServerResponse) => {
        return (error: Error) => this._errorFunctions[ERROR_KEY_RESPONSE](error, response);
    };

    private getRequestWithBody = async (request: http.ServerRequest) => {
        const contentType = this.parseRequestContentType(request);
        (request as IBodyRequest).contentType = contentType;

        if (contentType === 'multipart/form-data') {
            const { fields, files } = await this.parseFormData(request);
            (request as IBodyRequest).fields = fields;
            (request as IBodyRequest).files = files;

            return request;
        } else {
            const body = await this.parseRequestBody(request);
            (request as IBodyRequest).body = body;
            return request;
        }
    };

    private parseRequestContentType = (request: http.ServerRequest) => {
        const contentTypeRaw = request.headers['content-type'];
        const contentType = contentTypeRaw
            ? contentTypeRaw.slice(0, contentTypeRaw.indexOf(';'))
            : null;

        return contentType;
    };

    private parseFormData = (request: http.ServerRequest) => {
        const form = new formidable.IncomingForm();

        return new Promise<{ fields: formidable.Fields; files: formidable.Files } | any>(
            (resolve, reject) => {
                form.parse(request, (error, fields, files) => {
                    if (error) return reject(new FormidableError(error));

                    return resolve({ fields, files });
                });
            }
        );
    };

    private parseRequestBody = (request: http.ServerRequest) => {
        let body = '';
        return new Promise<string | string>((resolve, reject) => {
            request.on('data', data => {
                body += data;

                if (body.length > 1e6) {
                    return reject(new OverflowError());
                }
            });

            request.on('end', () => {
                return resolve(body);
            });
        });
    };

    /**
     * Look up route based on request url.
     * Will load any middlewares if defined.
     * If no routes are found, the `ERROR_KEY_NOTFOUND` error functions will be called
     *
     * @param request
     * @param response
     */
    private async routeLookup(
        request: http.IncomingMessage,
        response: http.ServerResponse
    ): Promise<boolean> {
        // Load middlewares
        var length = this.middlewares.length;
        for (let i = 0; i < length; ++i)
            if (!this.middlewares[i].alter(request, response))
                // Should stop processing of data if a middleware fails, to prevent setting headers if already changed by a middleware throwing an error
                return false;

        try {
            if (await this.route.parse({ url: request.url }, request, response)) return true;
            // 404 error
            this._errorFunctions[ERROR_KEY_NOTFOUND](response);
            return false;
        } catch (ex) {
            if (ex instanceof NoMatchingHttpMethodException) {
                this._errorFunctions[ERROR_METHOD_NOT_ALLOWED](
                    Object.keys(ex.supportedMethods),
                    response
                );
            } else {
                this._errorFunctions[ERROR_EXCEPTION](ex, response);
            }
        }
        return false;
    }

    private setDefaultErrorResponses() {
        if (this._errorFunctions[ERROR_KEY_REQUEST] == undefined)
            this._errorFunctions[ERROR_KEY_REQUEST] = DefaultErrorResponse;

        if (this._errorFunctions[ERROR_KEY_RESPONSE] == undefined)
            this._errorFunctions[ERROR_KEY_RESPONSE] = DefaultNoResponseErrorResponse;

        if (this._errorFunctions[ERROR_KEY_NOTFOUND] == undefined)
            this._errorFunctions[ERROR_KEY_NOTFOUND] = DefaultNotFoundErrorResponse;

        if (this._errorFunctions[ERROR_KEY_OVERFLOW] == undefined)
            this._errorFunctions[ERROR_KEY_OVERFLOW] = DefaultLargeEntityErrorResponse;

        if (this._errorFunctions[ERROR_METHOD_NOT_ALLOWED] == undefined)
            this._errorFunctions[ERROR_METHOD_NOT_ALLOWED] = DefaultMethodNotAllowedResponse;
    }

    private printServerInfo() {
        const { address, port } = this.server.address();
        console.log(
            `STARTED SERVER: http://${
                address === '::' || address === '127.0.0.1' ? 'localhost' : address
            }:${port} 🏁`
        );
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

        this.setDefaultErrorResponses();
        this.server.listen(this.port, this.hostname);

        this.printServerInfo();

        this.connected = true;
    }
}
