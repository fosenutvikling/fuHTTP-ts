import * as crossroads from 'crossroads';
import * as http from 'http';
import {Server} from './Server';
import {iMiddleware} from './middlewares/iMiddleware';

type HTTP_METHODS = "GET" | "POST" | "PUT" | "DELETE";

/**
 * The Route class for parsing and matching incoming http-requests
 * based on an URL
 * 
 * @class Route
 */
export class Route {

    /**
     * Error function to run when a Route is not matched
     * 
     * @static
     * @type {(response: http.ServerResponse) => void}
     */
    public static errorRoute: (response: http.ServerResponse) => void;

    /**
     * The name of the route
     * 
     * @private
     * @type {string}
     */
    private _routeName: string;

    /**
     * Store all routes for responding to a get-request
     * 
     * @private
     * @type {CrossroadsJs.CrossRoadsStatic}
     */
    private _getRoute: CrossroadsJs.CrossRoadsStatic;

    /**
     * Store all routes for responding to a post-request
     * 
     * @private
     * @type {CrossroadsJs.CrossRoadsStatic}
     */

    private _postRoute: CrossroadsJs.CrossRoadsStatic;
    /**
     * Store all routes for responding to a delete-request
     * 
     * @private
     * @type {CrossroadsJs.CrossRoadsStatic}
     */

    private _deleteRoute: CrossroadsJs.CrossRoadsStatic;
    /**
     * Store all routes for responding to a put-request
     * 
     * @private
     * @type {CrossroadsJs.CrossRoadsStatic}
     */

    private _putRoute: CrossroadsJs.CrossRoadsStatic;

    /**
     * Middlewares to be run before a route
     * 
     * @see FuHTTP.iMiddleware
     * @private
     * @type {[FuHTTP.iMiddleware]}
     */
    private _middlewares: [iMiddleware];

    /**
     * Creates an instance of Route.
     * 
     * @param {string} [routeName=null]
     */
    public constructor(routeName: string = null) {
        this._routeName = routeName;
    }

    /**
     * Method for adding a new route for get-requests
     * 
     * @param {string} url the string a url need to match against for running `func`
     * @param {(req: http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void} func Function to call when a route is successfully matched
     */
    public get(url: string, func: (req: http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void) {
        if (this._getRoute == null)
            this._getRoute = this.createRoute();
        this._getRoute.addRoute(url, func);
    }

    /**
     * Method for adding a new route for post-requests
     * 
     * @param {string} url the string a url need to match against for running `func`
     * @param {(req: http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void} func Function to call when a route is successfully matched
     */
    public post(url: string, func: (req: http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void) {
        if (this._postRoute == null)
            this._postRoute = this.createRoute();
        this._postRoute.addRoute(url, func);
    }

    /**
     * Method for adding a new route for put-requests
     * 
     * @param {string} url the string a url need to match against for running `func`
     * @param {(req: http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void} func Function to call when a route is successfully matched
     */
    public put(url: string, func: (req: http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void) {
        if (this._putRoute == null)
            this._putRoute = this.createRoute();
        this._putRoute.addRoute(url, func);
    }

    /**
     * Method for adding a new route for delete-requests
     * 
     * @param {string} url the string a url need to match against for running `func`
     * @param {(req: http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void} func Function to call when a route is successfully matched
     */
    public delete(url: string, func: (req: http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void) {
        if (this._deleteRoute == null)
            this._deleteRoute = this.createRoute();
        this._deleteRoute.addRoute(url, func);
    }

    /**
     * Check whether the `url` matches a registered route
     * 
     * @param {string} url to check routes against
     * @param {http.ServerRequest} req http-request data for accessing recevied data from a client
     * @param {http.ServerResponse} res http-response data and methods
     */
    public parse(url: string, req: http.ServerRequest, res: http.ServerResponse) {

        if (this._middlewares != null) {
            var length = this._middlewares.length;
            for (let i = 0; i < length; ++i)
                this._middlewares[i].alter(req, res);
        }

        switch (req.method) {
            default:
            case "GET":
                if (this._getRoute == null)
                    throw new Error("getRoute == null");
                this._getRoute.parse(url, [req, res]);//not able to parse here :(
                break;

            case "POST":
                if (this._postRoute == null)
                    throw new Error("postRoute == null");
                this._postRoute.parse(url, [req, res]);
                break;

            case "PUT":
                if (this._putRoute == null)
                    throw new Error("putRoute == null");
                this._putRoute.parse(url, [req, res]);
                break;

            case "DELETE":
                if (this._deleteRoute == null)
                    throw new Error("deleteRoute == null");
                this._deleteRoute.parse(url, [req, res]);
                break;
        }
    }

    /**
     * Creates a new crossroad route
     * 
     * @private
     * @returns {CrossroadsJs.CrossRoadsStatic} (description)
     */
    private createRoute(): CrossroadsJs.CrossRoadsStatic {
        var route = crossroads.create();
        route.ignoreState = true;
        route.bypassed.add(function (request: http.ServerRequest, response: http.ServerResponse) {
            Route.errorRoute(response);
            response.end();
        });

        return route;
    }

    /**
     * @type {string}
     */
    public get routeName(): string {
        return this._routeName;
    }

    public set routeName(route: string) {
        this._routeName = route;
    }

    /**
     * Appends a middleware to the route
     * 
     * @param {FuHTTP.iMiddleware} middleware (description)
     */
    public use(middleware: iMiddleware) {
        if (this._middlewares == null)
            this._middlewares = <[iMiddleware]>[];
        this._middlewares.push(middleware);
    }

    /**
     * Retrieves all registered middlewares
     * 
     * @readonly
     * @type {[FuHTTP.iMiddleware]}
     */
    public get middleware(): [iMiddleware] {
        return this._middlewares;
    }

    /**
     * Set function to run when a route isn't matchec
     * 
     * @static
     */
    public static set onError(error: (response: http.ServerResponse) => void) {
        Route.errorRoute = error;
    }

    /**
     * Get error function
     * 
     * @static
     * @type {(response: http.ServerResponse) => void}
     */
    public static get onError(): (response: http.ServerResponse) => void {
        return this.errorRoute;
    }
}