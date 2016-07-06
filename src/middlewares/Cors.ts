import * as http from 'http';
import {Server} from '../Server';
import {iMiddleware} from './iMiddleware';
import {HTTP_METHODS} from '../Route';

/**
 * Options possible for configuring the cors middleware
 * 
 * @export
 * @interface iOptions
 */
export interface iOptions {
    /**
     * Whether  the allow-credentials header should be set, supporting the use of cookies with CORS
     * 
     * @type {boolean}
     */
    cookies?: boolean,
    /**
     * Supported http-methods for a route, defaults to current request method
     * 
     * @type {HTTP_METHODS[]}
     */
    methods?: HTTP_METHODS[],
    /**
     * How many seconds a response to be cached for CORS
     * 
     * @type {number}
     */
    maxage?: number
}

/**
 * Cors Middleware altering a http-response to include headers
 * for supporting CORS
 * 
 * @export
 * @class Middleware
 * @implements {iMiddleware}
 */
export class Middleware implements iMiddleware {

    private options: iOptions;

    /**
     * Creates an instance of Middleware.
     * 
     * @param {iOptions} [options={ cookies: false, methods: null, maxage: 1 }] (description)
     */
    public constructor(options: iOptions = { cookies: false, methods: null, maxage: 1 }) {
        this.options = options;
    }

    /**
     * Alters the response headers, by appending required headers and optional
     * for a browser to not allow a http-call
     * 
     * @param {http.IncomingMessage} req (description)
     * @param {http.ServerResponse} res (description)
     */
    public alter(req: http.IncomingMessage, res: http.ServerResponse) {
        var headers = req.headers;
        var origin: string;

        if (this.options.methods == null)
            this.options.methods = [<HTTP_METHODS>req.method];

        var origin = (req.headers != null && req.headers.origin != null) ? <string>req.headers.origin : "*";
        res.setHeader('Access-Control-Allow-Origin', origin);

        if (this.options.methods != null)
            res.setHeader('Access-Control-Request-Method', this.options.methods.toString()); // Required, allowed methods for path

        if (this.options.cookies)
            res.setHeader('Access-Control-Allow-Credentials', 'true'); // Optional, allows storing cookies
        if (this.options.maxage)
            res.setHeader('Access-Control-Max-Age', this.options.maxage.toString()); // Optional, allows preflight response to be cached, preventing an OPTIONS request for each http-request
    }
}