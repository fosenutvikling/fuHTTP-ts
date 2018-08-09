import * as http from 'http';
import { HttpResponse } from './HttpResponse';

export const DefaultErrorResponse = (error: Error, response: http.ServerResponse) => {
    response.setHeader('Content-Type', 'text/html');

    response.write('Error: ' + error);
    HttpResponse.BadRequest(
        response,
        'The Request Error function is not set. It can be set using the appropriate function (onRequestError)'
    );
};

export const DefaultNoResponseErrorResponse = (error: Error, response: http.ServerResponse) => {
    response.setHeader('Content-Type', 'text/html');
    response.statusCode = 444; // NGINX specific error code
    response.statusMessage = 'No Response';
    response.write(
        'The Response Error function is not set. It can be set using the appropriate function (onResponseError)'
    );
    response.end();
};

export const DefaultNotFoundErrorResponse = (response: http.ServerResponse) => {
    response.setHeader('Content-Type', 'text/html');
    HttpResponse.NotFound(
        response,
        'The Not Found Error function is not set. It can be set using the appropriate function (onNotFoundError)'
    );
};

export const DefaultLargeEntityErrorResponse = (response: http.ServerResponse) => {
    response.setHeader('Content-Type', 'text/html');
    response.statusCode = 413;
    response.statusMessage = 'Request Entity Too Large';
    response.write(
        'The Overflow Error function is not set. It can be set using the appropriate function (onOverflowError)'
    );
    response.end();
};

export const DefaultMethodNotAllowedResponse = (
    supportedMethods: string[],
    response: http.ServerResponse
) => HttpResponse.MethodNotAllowed(response, supportedMethods);
