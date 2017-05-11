import * as UrlPattern from 'url-pattern';
import * as http from 'http';
import { Server, iBodyRequest } from './Server';

const QUERY_SYMBOL = '?';
const PATTERN_OPTIONS = {
    optionalSegmentStartChar: '[',
    optionalSegmentEndChar: ']'
};

export class UrlMatcher {

    private pattern: string;
    private callback: (req: iBodyRequest | http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void;
    private urlPattern: UrlPattern;
    private _hasQuery: boolean;

    public constructor(pattern: string, callback: (req: iBodyRequest | http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void) {
        this.pattern = pattern;
        this.callback = callback;
        this._hasQuery = false;

        this.initialize();
    }

    private initialize(): void {
        this.checkPatternForQuery();
        this.urlPattern = new UrlPattern(this.pattern, PATTERN_OPTIONS);
    }

    private checkPatternForQuery(): void {
        let queryPosition = this.pattern.lastIndexOf(QUERY_SYMBOL);
        if (queryPosition >= 0) {
            this._hasQuery = true;
            this.pattern = this.pattern.substring(0, queryPosition);
        }
    }

    public get hasQuery(): boolean {
        return this.hasQuery;
    }

    public isMatch(url: string, query: object = null, request: http.IncomingMessage, response: http.ServerResponse): boolean | any[] {
        // If parameter includes a query, but current url is not configured with queryParams, immediately return mismatch
        if (query != null && this._hasQuery == null)
            return false;

        let parsedUrlData = this.urlPattern.match(url);

        // Check whether the match was successful. A successful match will return !=null
        if (parsedUrlData == null)
            return false;

        let parameters = this.createCallbackParameterArray(parsedUrlData, query);
        this.callback.apply(null, [request, response].concat(parameters));

        return true;
    }

    private createCallbackParameterArray(parsedData: any[] | Object | any, query: object = null): any[] {
        let parameterArray = [];

        if (parsedData instanceof Array) {
            parameterArray = parsedData;
        } else if (parsedData instanceof Object) {
            // Important to clean the local data before appending new, as the last request has its data stored here already
            Object.keys(parsedData).forEach(key => {
                if (key !== '') // Don't want to append an empty key to the data array
                    parameterArray.push(parsedData[key]);
            });
        } else // If parsedData variable is neither of an Array or Object, it's not recognized, and don't know how to handle it
            throw new Error('Unknown type of parsedData data, expected Array || Object, got ' + (typeof parsedData));

        // Make sure query parameters is pushed at the end of the input, as an url should end with a querystring
        if (query != null)
            parameterArray.push(query);

        return parameterArray;
    }
}