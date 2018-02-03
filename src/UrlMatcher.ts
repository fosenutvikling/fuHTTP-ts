import * as UrlPattern from 'url-pattern';
import * as http from 'http';
import { Server, iBodyRequest } from './Server';
import * as qs from 'qs';

const QUERY_SYMBOL = '?';
const PATTERN_OPTIONS = {
    optionalSegmentStartChar: '[',
    optionalSegmentEndChar: ']'
};

export class UrlMatcher {

    private _pattern: string;
    private _callback: (req: iBodyRequest | http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void;
    private urlPattern: UrlPattern;
    private _hasQuery: boolean;

    public constructor(pattern: string, callback: (req: iBodyRequest | http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void) {
        this._pattern = pattern;
        this._callback = callback;
        this._hasQuery = false;

        this.initialize();
    }

    private initialize(): void {
        this.checkPatternForQuery();
        this.urlPattern = new UrlPattern(this._pattern, PATTERN_OPTIONS);
    }

    private checkPatternForQuery(): void {
        let queryPosition = this._pattern.lastIndexOf(QUERY_SYMBOL);
        if (queryPosition >= 0) {
            this._hasQuery = true;
            this._pattern = this._pattern.substring(0, queryPosition);
        }
    }

    public get hasQuery(): boolean {
        return this._hasQuery;
    }

    public isMatch(url: string, query: string = null, request: http.IncomingMessage, response: http.ServerResponse): boolean | any[] {
        // If parameter includes a query, but current url is not configured with queryParams, immediately return mismatch
        if (query != null && this._hasQuery == null)
            return false;

        let parsedUrlData = this.urlPattern.match(url);

        // Check whether the match was successful. A successful match will return !=null
        if (parsedUrlData == null)
            return false;

        let parameters = this.createCallbackParameterArray(parsedUrlData, query);

        // Prevent error for applying 
        if (this._callback == null)
            throw new Error('Callback function == null, not able to call function');

        try {
            this._callback.apply(null, [request, response].concat(parameters));
        }
        catch (ex) {
            return false;
        }

        return true;
    }

    private createCallbackParameterArray(parsedData: any[] | Object | any, query: string = null): any[] {
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
        // Parse query string before adding it as a parameter
        if (query != null) {
            const parsedQuery = qs.parse(query);
            parameterArray.push(parsedQuery);
        }

        return parameterArray;
    }

    public get pattern(): string {
        return this._pattern;
    }

    public get callback(): (req: iBodyRequest | http.IncomingMessage, res: http.ServerResponse, ...params: any[]) => void {
        return this._callback;
    }
}