import * as http from 'http';

/**
 * Interface describing the structure required by a middleware to implement
 */
export interface IMiddleware {
    /**
     * Requires the request and response object from a http-server, which a
     * middleware is able to alter and prepent data to
     */
    alter(request: http.IncomingMessage, response: http.ServerResponse): boolean;
}
