import * as http from 'http';

/**
 * Mix of different standarized HTTP-Response Codes
 * The 200-code is dropped, as it's returned as default in NodeJS
 *
 * The http.ServerResponse is required for each method, to assign the statusCode and statusMessage to the current response
 * If a responseText is appended as a parameter, the request will be ended as well
 * @export
 * @class HttpResponse
 */
export class HttpResponse {
    private static EndResponse(responseText: string, res: http.ServerResponse) {
        res.write(responseText);
        res.end();
    }

    public static Created(res: http.ServerResponse, location: string = null, responseText: string = null): void {
        res.statusCode = 201;
        res.statusMessage = 'Created';

        // Whether location of newly created resource should be added to header
        if (location)
            res.setHeader('Location', location);

        if (responseText)
            HttpResponse.EndResponse(responseText, res);
    }

    public static NoContent(res: http.ServerResponse, responseText: string = null): void {
        res.statusCode = 204;
        res.statusMessage = 'No Content';

        HttpResponse.EndResponse(responseText, res);
    }

    public static BadRequest(res: http.ServerResponse, responseText: string = null): void {
        res.statusCode = 400;
        res.statusMessage = 'Bad Request';

        if (responseText)
            HttpResponse.EndResponse(responseText, res);
    }

    public static Unauthorized(res: http.ServerResponse, responseText: string = null): void {
        res.statusCode = 401;
        res.statusMessage = 'Unauthorized';

        if (responseText)
            HttpResponse.EndResponse(responseText, res);
    }

    public static Forbidden(res: http.ServerResponse, responseText: string = null): void {
        res.statusCode = 403;
        res.statusMessage = 'Forbidden';

        if (responseText)
            HttpResponse.EndResponse(responseText, res);
    }

    public static NotFound(res: http.ServerResponse, responseText: string = null): void {
        res.statusCode = 404;
        res.statusMessage = 'Not Found';

        if (responseText)
            HttpResponse.EndResponse(responseText, res);
    }

    public static MethodNotAllowed(res: http.ServerResponse, supportedMethods: string[]) {
        res.statusCode = 405;
        res.statusMessage = 'Method not Allowed';

        HttpResponse.EndResponse(null, res);

    }

    public static ServerError(res: http.ServerResponse, responseText: string = null): void {
        res.statusCode = 500;
        res.statusMessage = 'Internal Server Error';

        if (responseText)
            HttpResponse.EndResponse(responseText, res);
    }
}
