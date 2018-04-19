import * as http from 'http';
import { IBodyRequest } from './Server';
import { IMiddleware } from './middlewares/IMiddleware';
import * as qs from 'qs';

export enum HTTP_METHODS {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE'
}
export type RequestFunction = (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    ...params: any[]
) => void;

export interface IParseParams {
    url: string;
    middlewares?: IMiddleware[];
    params?: string[];
}

export class NoMatchingHttpMethodException extends Error {
    public constructor(msg: string, public supportedMethods: { [key: string]: boolean }) {
        super(msg);
    }
}

/**
 * The Route class for parsing and matching incoming http-requests
 * based on an URL
 */
export class Route {
    /** Strings starting with identifier should be parsed as a parameter */
    public static readonly paramIdentifier = ':';

    /** Parameter route. If a parameter is defined, add a new {paramRoute} in {nextRoute} */
    public static readonly paramRoute = '_pa%ram';

    private static getHttpPublicMethodForRoute(route: Route, httpMethod: HTTP_METHODS) {
        switch (httpMethod) {
            case HTTP_METHODS.GET:
                return route.get;
            case HTTP_METHODS.POST:
                return route.post;
            case HTTP_METHODS.PUT:
                return route.put;
            case HTTP_METHODS.DELETE:
                return route.delete;
            default:
                throw new Error('Unsupported HTTP Method');
        }
    }

    private static appendQueryParams(url: string, params: string[]) {
        const queryPosition = url.indexOf('?');

        if (queryPosition >= 0) {
            const queryStr = url.substr(queryPosition);
            const parsedQuery = qs.parse(queryStr);
            params.push(parsedQuery);
        }
    }

    /**
     * Remove last trailing slash
     * For route matching: 'users' and 'users/' should be mapped to the same route
     * @param str input string to remove trailing slash from
     */
    public static removeTrailingSlash(str: string): string {
        if (str && str[str.length - 1] === '/') return str.substring(0, str.length - 1);
        return str;
    }

    public static removeSlashFromFront(str: string): string {
        if (str[0] === '/') return str.substr(1);
        return str;
    }

    public static fixRequestUrlForAdding(str: string): string {
        str = Route.removeTrailingSlash(str);
        str = Route.removeSlashFromFront(str);

        return str;
    }

    /**
     * Route for responding to get-request
     */
    private _getFn: RequestFunction;

    /**
     * Store all routes for responding to a post-request
     */
    private _postFn: RequestFunction;

    /**
     * Store all routes for responding to a delete-request
     */
    private _deleteFn: RequestFunction;

    /**
     * Store route for responding to a put-request
     */
    private _putFn: RequestFunction;

    private _nextRoutes: { [key: string]: Route };

    /**
     * Middlewares to be run before a route match
     */
    private _middlewares: IMiddleware[];

    /**
     * Creates an instance of Route.
     */
    public constructor() {
        this._middlewares = [] as IMiddleware[];
        this._nextRoutes = {};
    }

    private addRoute(HttpMethod: HTTP_METHODS, requestUrl: string, func: RequestFunction) {
        requestUrl = Route.fixRequestUrlForAdding(requestUrl);
        const splittedRoute = requestUrl.split('/');
        if (splittedRoute[0] !== '') {
            const key = splittedRoute[0];
            const rest = splittedRoute.splice(1).join('/');

            if (this._nextRoutes[key]) {
                Route.getHttpPublicMethodForRoute(this._nextRoutes[key], HttpMethod).apply(
                    this._nextRoutes[key],
                    [rest, func]
                );
            } else if (key[0] === Route.paramIdentifier) {
                const tempRoute = this._nextRoutes[Route.paramRoute] || new Route();
                Route.getHttpPublicMethodForRoute(tempRoute, HttpMethod).apply(tempRoute, [
                    rest,
                    func
                ]);
                this._nextRoutes[Route.paramRoute] = tempRoute;
            } else {
                const tempRoute = new Route();
                Route.getHttpPublicMethodForRoute(tempRoute, HttpMethod).apply(tempRoute, [
                    rest,
                    func
                ]);
                this._nextRoutes[key] = tempRoute;
            }
        } else {
            this.assignFnToHttpMethod(HttpMethod, func);
        }
    }

    private assignFnToHttpMethod(httpMethod: HTTP_METHODS, fn: RequestFunction) {
        switch (httpMethod) {
            case HTTP_METHODS.GET:
                this._getFn = fn;
                break;
            case HTTP_METHODS.POST:
                this._postFn = fn;
                break;
            case HTTP_METHODS.PUT:
                this._putFn = fn;
                break;
            case HTTP_METHODS.DELETE:
                this._deleteFn = fn;
                break;
            default:
                throw new Error('Unsupported HTTP Method');
        }
    }

    private getFnForHttpMethod(httpMethod: HTTP_METHODS) {
        switch (httpMethod) {
            case HTTP_METHODS.GET:
                return this._getFn;
            case HTTP_METHODS.POST:
                return this._postFn;
            case HTTP_METHODS.PUT:
                return this._putFn;
            case HTTP_METHODS.DELETE:
                return this._deleteFn;
            default:
                throw new Error('Unsupported HTTP Method');
        }
    }

    private runMiddlewares(
        middlewares: IMiddleware[],
        req: http.IncomingMessage,
        res: http.ServerResponse
    ) {
        for (let i = 0; i < middlewares.length; ++i)
            if (!middlewares[i].alter(req, res)) return false;
        return true;
    }

    /**
     * Method for adding a new route for GET-requests
     *
     * @param requestUrl url-endpoint to match incoming requests
     * @param func to call when match is found
     */
    public get(requestUrl: string, func: RequestFunction) {
        this.addRoute(HTTP_METHODS.GET, requestUrl, func);
    }

    /**
     * Method for adding a new route for POST-requests
     *
     * @param requestUrl url-endpoint to match incoming requests
     * @param func to call when match is found
     */
    public post(
        requestUrl: string,
        func: (req: IBodyRequest, res: http.ServerResponse, ...params: any[]) => void
    ): void {
        this.addRoute(HTTP_METHODS.POST, requestUrl, func);
    }

    /**
     * Method for adding a new route for PUT-requests
     *
     * @param requestUrl url-endpoint to match incoming requests
     * @param func to call when match is found
     */
    public put(
        requestUrl: string,
        func: (req: IBodyRequest, res: http.ServerResponse, ...params: any[]) => void
    ): void {
        this.addRoute(HTTP_METHODS.PUT, requestUrl, func);
    }

    /**
     * Method for adding a new route for DELETE-requests
     *
     * @param requestUrl url-endpoint to match incoming requests
     * @param func to call when match is found
     */
    public delete(
        requestUrl: string,
        func: (req: IBodyRequest, res: http.ServerResponse, ...params: any[]) => void
    ): void {
        this.addRoute(HTTP_METHODS.DELETE, requestUrl, func);
    }

    /**
     * Match a route to current `row` of routes based on url in {inputParams}
     * Returns a boolean value whether a route is found or not.
     * If the route is found, but it doesn't match with the HTTP.method in {req},
     * and error is thrown
     *
     * @param inputParams url  to match, params to parse, and middlewares to run on route match
     * @param req Http Request
     * @param res Http Response
     */
    public parse(
        inputParams: IParseParams,
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): boolean {
        // Should stop processing of data if a middleware fails, to prevent setting headers if already changed by a middleware throwing an error

        // Parse({url,middleware,params}req,res);
        // If (!this.runMiddlewares(req, res))
        //  Return false;

        const routeUrl = Route.fixRequestUrlForAdding(inputParams.url);
        const splittedUrls = routeUrl.split('/');
        inputParams.middlewares = [];
        const middlewares = this._middlewares.concat(inputParams.middlewares || []);
        let params = inputParams.params || [];

        if (splittedUrls[0] !== '') {
            const key = splittedUrls[0];
            const nextUrl = splittedUrls.splice(1).join('/');

            let nextRoute: Route;
            if (this._nextRoutes[key]) {
                nextRoute = this._nextRoutes[key];
            } else if (this._nextRoutes[Route.paramRoute]) {
                params.push(key);
                nextRoute = this._nextRoutes[Route.paramRoute];
            } else return false;

            return nextRoute.parse(
                {
                    url: nextUrl,
                    params,
                    middlewares
                },
                req,
                res
            );
        }

        if (!this.runMiddlewares(middlewares, req, res)) return false;

        let callback = this.getFnForHttpMethod(req.method as HTTP_METHODS);

        // If callback function is not set, the current HTTP-method is not supported for the current route
        if (!callback) {
            // Set of supported HTTP-methods for current route
            const obj: { [key: string]: boolean } = {};
            if (this._getFn) obj.get = true;
            if (this._postFn) obj.post = true;
            if (this._putFn) obj.put = true;
            if (this._deleteFn) obj.delete = true;

            throw new NoMatchingHttpMethodException(`${req.method} not supported for route`, obj);
        }
        Route.appendQueryParams(splittedUrls[0], params);
        callback.apply(null, [req, res, ...params]);

        return true;
    }

    /**
     * Appends a middleware to the route
     */
    public use(middleware: IMiddleware): void {
        this._middlewares.push(middleware);
    }

    /**
     * Appends an existing route to {this} routes
     * If the route doesn't contain a {routeName}, it is up to the developer to make sure no routes will overlap, as it will result in the last added route to
     * never match!
     */
    public add(path: string, route: Route): void {
        if (path[0] === '/') path = path.substr(1);

        const splittedRoute = path.split('/');
        const key = splittedRoute[0].trim();

        if (splittedRoute.length > 1) {
            const rest = splittedRoute.slice(1).join('/');

            if (rest) {
                // If rest is not an empty string, add route to existing or new route
                let nextRoute: Route;
                if (this._nextRoutes[key]) {
                    nextRoute = this._nextRoutes[key];
                } else {
                    nextRoute = new Route();
                    this._nextRoutes[key] = nextRoute;
                }

                return nextRoute.add(rest, route);
            }
        }

        if (this._nextRoutes[key]) {
            Object.keys(route._nextRoutes).forEach(routeKey => {
                this._nextRoutes[key].add(routeKey, route._nextRoutes[routeKey]);
            });
        } else {
            this._nextRoutes[key] = route;
        }
    }

    /**
     * Retrieves all registered middlewares
     */
    public get middleware(): IMiddleware[] {
        return this._middlewares;
    }

    public get getFunction() {
        return this._getFn;
    }

    public get postFunction() {
        return this._postFn;
    }

    public get putFunction() {
        return this._putFn;
    }

    public get deleteFunction() {
        return this._deleteFn;
    }

    public get nextRoute() {
        return this._nextRoutes;
    }
}
