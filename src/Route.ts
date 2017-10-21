import * as http from 'http';
import { Server, iBodyRequest } from './Server';
import { iMiddleware } from './middlewares/iMiddleware';
import { UrlMatcher } from './UrlMatcher';
import * as url from 'url';

export type HTTP_METHODS = 'GET' | 'POST' | 'PUT' | 'DELETE';

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
     * @type {UrlMatcher[]}
     */
    private _getRoute: UrlMatcher[];

    /**
     * Store all routes for responding to a post-request
     * 
     * @private
     * @type {UrlMatcher[]}
     */

    private _postRoute: UrlMatcher[];
    /**
     * Store all routes for responding to a delete-request
     * 
     * @private
     * @type {UrlMatcher[]}
     */

    private _deleteRoute: UrlMatcher[];
    /**
     * Store all routes for responding to a put-request
     * 
     * @private
     * @type {UrlMatcher[]}
     */

    private _putRoute: UrlMatcher[];

    /**
     * Middlewares to be run before a route
     * 
     * @private
     * @type {[iMiddleware]}
     */
    private _middlewares: [iMiddleware];

    /**
     * Creates an instance of Route.
     * 
     * @param {string} [routeName=null]
     */
    public constructor(routeName: string = null) {
        this._routeName = routeName;
        this._middlewares = <[iMiddleware]>[];
    }

    /**
     * Method for adding a new route for get-requests
     * 
     * @param {string} requestUrl the string a url need to match against for running `func`
     * @param {(req: http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void} func Function to call when a route is successfully matched
     */
    public get(requestUrl: string, func: (req: http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void): void {
        if (this._getRoute == null)
            this._getRoute = [];
        this.addRoute(this._getRoute, requestUrl, func);
    }

    /**
     * Method for adding a new route for post-requests
     * 
     * @param {string} requestUrl the string a url need to match against for running `func`
     * @param {(req: http.iBodyRequest, res: http.ServerResponse, ...params: any[]) => void} func Function to call when a route is successfully matched
     */
    public post(requestUrl: string, func: (req: iBodyRequest, res: http.ServerResponse, ...params: any[]) => void): void {
        if (this._postRoute == null)
            this._postRoute = [];
        this.addRoute(this._postRoute, requestUrl, func);
    }

    /**
     * Method for adding a new route for put-requests
     * 
     * @param {string} requestUrl the string a url need to match against for running `func`
     * @param {(req: http.iBodyRequest, res: http.ServerResponse, ...params: any[]) => void} func Function to call when a route is successfully matched
     */
    public put(requestUrl: string, func: (req: iBodyRequest, res: http.ServerResponse, ...params: any[]) => void): void {
        if (this._putRoute == null)
            this._putRoute = [];
        this.addRoute(this._putRoute, requestUrl, func);
    }

    /**
     * Method for adding a new route for delete-requests
     * 
     * @param {string} requestUrl the string a url need to match against for running `func`
     * @param {(req: http.iBodyRequest, res: http.ServerResponse, ...params: any[]) => void} func Function to call when a route is successfully matched
     */
    public delete(requestUrl: string, func: (req: iBodyRequest, res: http.ServerResponse, ...params: any[]) => void): void {
        if (this._deleteRoute == null)
            this._deleteRoute = [];
        this.addRoute(this._deleteRoute, requestUrl, func);
    }

    private addRoute(
        routeType: UrlMatcher[],
        requestUrl: string,
        func: (req: iBodyRequest | http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void): void {

        requestUrl = Route.fixRequestUrlForAdding(requestUrl);

        routeType.push(new UrlMatcher(requestUrl, func));
    }

    /**
     * Check whether the `url` matches a registered route.
     * Returns a boolean value whether a route is found or not
     * 
     * @param {string} requestUrl to check routes against
     * @param {http.IncomingMessage} req http-request data for accessing recevied data from a client
     * @param {http.ServerResponse} res http-response data and methods
     */
    public parse(routeUrl: string, req: http.IncomingMessage, res: http.ServerResponse): boolean {
        // Should stop processing of data if a middleware fails, to prevent setting headers if already changed by a middleware throwing an error
        if (!this.runMiddlewares(req, res))
            return false;

        routeUrl = Route.fixRequestUrlForAdding(routeUrl);
        let parsedUrl = url.parse(routeUrl); // Parsing the routeUrl helps in splitting its pathname, and parse the querystring, if any

        let searchRoute: UrlMatcher[] = null;

        switch (<HTTP_METHODS>req.method) {
            default:
            case 'GET':
                if (this._getRoute == null)
                    throw new Error('getRoute == null');
                searchRoute = this._getRoute;
                break;

            case 'POST':
                if (this._postRoute == null)
                    throw new Error('postRoute == null');
                searchRoute = this._postRoute;
                break;

            case 'PUT':
                if (this._putRoute == null)
                    throw new Error('putRoute == null');
                searchRoute = this._putRoute;
                break;

            case 'DELETE':
                if (this._deleteRoute == null)
                    throw new Error('deleteRoute == null');
                searchRoute = this._deleteRoute;
                break;
        }

        if (searchRoute == null)
            throw new Error('searchRoute == null, should never occur');

        // Call Error Route, if no match is found
        if (!this.hasMatchingRoute(searchRoute, parsedUrl, req, res)) {
            Route.errorRoute(res);
            return false;
        }
        return true;
    }

    private runMiddlewares(req: http.IncomingMessage, res: http.ServerResponse) {
        for (let i = 0; i < this._middlewares.length; ++i)
            if (!this._middlewares[i].alter(req, res))
                return false;
        return true;
    }

    private hasMatchingRoute(route: UrlMatcher[], parsedUrl: url.Url, request: http.IncomingMessage, response: http.ServerResponse): boolean {
        for (let i = 0; i < route.length; ++i) {
            if (route[i].isMatch(parsedUrl.pathname, parsedUrl.query, request, response)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Remove last trailing slash
     * For route matching: 'users' and 'users/' should be mapped to the same route
     * @public
     * @param {string} str input string to remove trailing slash from
     * @returns 
     * 
     * @memberOf Route
     */
    public static removeTrailingSlash(str: string): string {
        if (str[str.length - 1] === '/')
            return str.substring(0, str.length - 1);
        return str;
    }

    public static addSlashToFront(str: string): string {
        if (str[0] !== '/') str = '/' + str;
        return str;
    }

    public static fixRequestUrlForAdding(str: string): string {
        str = Route.removeTrailingSlash(str)
        str = Route.addSlashToFront(str);

        return str;
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
     * @param {iMiddleware} middleware to use
     */
    public use(middleware: iMiddleware): void {
        this._middlewares.push(middleware);
    }

    /**
     * Appends an existing route to {this} routes
     * If the route doesn't contain a {routeName}, it is up to the developer to make sure no routes will overlap, as it will result in the last added route to 
     * never match!
     * 
     * @param {Route} route 
     * 
     * @memberOf Route
     */
    public add(route: Route): void {
        var prefix = route.routeName || '';

        if (route._getRoute != null) {
            for (let i = 0; i < route._getRoute.length; ++i)
                this.get(prefix + route._getRoute[i].pattern, route._getRoute[i].callback);
        }

        if (route._postRoute != null) {
            for (let i = 0; i < route._postRoute.length; ++i)
                this.post(prefix + route._postRoute[i].pattern, route._postRoute[i].callback);
        }

        if (route._putRoute != null) {
            for (let i = 0; i < route._putRoute.length; ++i)
                this.put(prefix + route._putRoute[i].pattern, route._putRoute[i].callback);
        }

        if (route._deleteRoute != null) {
            for (let i = 0; i < route._deleteRoute.length; ++i)
                this.delete(prefix + route._deleteRoute[i].pattern, route._deleteRoute[i].callback);
        }
    }

    /**
     * Retrieves all registered middlewares
     * 
     * @readonly
     * @type {[iMiddleware]}
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

    public get getRoute() {
        return this._getRoute;
    }

    public get postRoute() {
        return this._postRoute;
    }

    public get putRoute() {
        return this._putRoute;
    }

    public get deleteRoute() {
        return this._deleteRoute;
    }
}