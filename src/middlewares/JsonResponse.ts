import * as http from 'http';
import {Server} from '../Server';
import {iMiddleware} from './iMiddleware';

/**
 * Extends the `ServerResponse` class, making a request include methods 
 * defined in the interface
 * 
 * @export
 * @interface iServerResponse
 * @extends {http.ServerResponse}
 */
export interface iServerResponse extends http.ServerResponse {
    /**
     * Generates a json response
     * @see Middleware
     * @type {(data: {}) => void}
     */
    json: (data: {}) => void
}

/**
 * JsonResponse Middleware altering a http-request to include a method
 * for parsing an object to a JSON-string
 * 
 * @export
 * @class Middleware
 * @implements {iMiddleware}
 */
export class Middleware implements iMiddleware {
    /**
     * Alters the request object
     * 
     * @param {http.IncomingMessage} req (description)
     * @param {http.ServerResponse} res (description)
     */
    public alter(req: http.IncomingMessage, res: http.ServerResponse) {
        (<iServerResponse>res).json = function (data: {}) {
            try {
                var strJson = JSON.stringify(data);

                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.statusMessage = 'ok';
                res.write(strJson);
            } catch (e) {
                res.setHeader('Content-Type', 'text/html');
                res.statusCode = 500;
                res.statusMessage = 'Invalid JSON';
                res.write("Couldn't parse json data");
            }

            res.end();
        };
    }
}
