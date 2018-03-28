import * as http from 'http';
import { IMiddleware } from './IMiddleware';

/**
 * Extends the `ServerResponse` class, making a request include methods
 * defined in the interface
 */
export interface IServerResponse extends http.ServerResponse {
    /**
     * Generates a json response
     * @see Middleware
     * @type {(data: {}) => void}
     */
    json: (data: {}) => void;
}

/**
 * JsonResponse Middleware altering a http-request to include a method
 * for parsing an object to a JSON-string
 */
export class JsonResponse implements IMiddleware {
    /**
     * Alters the request object
     */
    public alter(req: http.IncomingMessage, res: http.ServerResponse): boolean {
        (<IServerResponse>res).json = function (data: {}): void {
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
                res.write('Couldn\'t parse json data');
            }

            res.end();
        };

        return true;
    }
}
