import * as http from 'http';
import {Server, iBodyRequest} from '../Server';
import {iMiddleware} from './iMiddleware';
import {HTTP_METHODS} from '../Route';
import * as querystring from 'querystring';

/**
 * Parse a http-request body to JSON
 * 
 * @export
 * @class BodyJsonParse
 * @implements {iMiddleware}
 */
export class BodyJsonParse implements iMiddleware {
    /**
     * The middleware function doing the parsing of body data.
     * The content type of a request is checked for what type of parsing is required
     * eiter using plain JSON.parsing, or querystring
     * 
     * @param {iBodyRequest} req the http-request object
     * @param {http.ServerResponse} res the http-response object
     * @returns {boolean} whether the parsing of body data succeeded or not
     */
    public alter(req: iBodyRequest, res: http.ServerResponse): boolean {

        if (req.contentType === 'application/x-www-form-urlencode') { // Body is in url form (using & and = for denoting key-value pairs)
            try {
                req.body = querystring.parse(req.body);
            } catch (e) {
                req.emit('error', 'Couldn\'t parse query body data to JSON');
                return false;
            }
        }
        else {
            try {
                req.body = (req.body == null) ? null : JSON.parse(req.body);
            } catch (e) {
                req.emit('error', 'Couldn\'t parse body data to JSON');
                return false;
            }
        }

        return true;
    }
}