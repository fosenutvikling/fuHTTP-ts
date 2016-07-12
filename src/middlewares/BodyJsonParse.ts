import * as http from 'http';
import {Server, iBodyRequest} from '../Server';
import {iMiddleware} from './iMiddleware';
import {HTTP_METHODS} from '../Route';
import * as querystring from 'querystring';

export class BodyJsonParse implements iMiddleware {
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