import { Server } from '../src/Server';
import { Route } from '../src/Route';
import { expect, assert, use, spy } from 'chai';
import { iMiddleware } from '../src/middlewares/iMiddleware';
import * as spies from 'chai-spies';

var MockReq = require('mock-req');
var MockRes = require('mock-res');
import 'mocha';

use(spies);

describe('Server', () => {
    let server = new Server(1300);
    let errorMethod = spy((res) => { });
    server.onNotFoundError = errorMethod;
    let apiRoute = new Route('api');
    let nonameRoute = new Route();
    let emptyRoute = new Route();

    describe('Add routes', () => {
        it('should add route object', () => {
            server.addRoute(apiRoute);
            assert.isNotNull(server['routes']['api']);
        });

        it('should add route with a path', () => {
            server.add('noname', nonameRoute);
            assert.isNotNull(server['routes']['noname']);
        });

        it('should add route with no name', () => {
            expect(emptyRoute.routeName).to.equal('');
            server.addRoute(emptyRoute);
            expect(emptyRoute.routeName).to.equal('/');
            assert.isNotNull(server['routes']['/']);
        });
    });

    describe('splitRouteForLookup', () => {
        it('should return key/rest pair', () => {
            expect(Server.splitRouteForLookup('/api/hello')).to.deep.equal({ key: 'api', rest: '/hello' });
            expect(Server.splitRouteForLookup('/hello/world')).to.deep.equal({ key: 'hello', rest: '/world' });
            expect(Server.splitRouteForLookup('/foo/bar/hello/world')).to.deep.equal({ key: 'foo', rest: '/bar/hello/world' });
            expect(Server.splitRouteForLookup('/foo')).to.deep.equal({ key: '/', rest: '/foo' });
            expect(Server.splitRouteForLookup('/')).to.deep.equal({ key: '/', rest: '/' });
        });
    });

    describe('routeLookup', () => {
        apiRoute.get('/hello', () => { });
        apiRoute.get('/hello/world', () => { });
        nonameRoute.get('/foo', () => { });
        nonameRoute.get('/foo/bar', () => { });
        emptyRoute.get('/print', () => { });
        emptyRoute.get('/is/this/root', () => { });
        emptyRoute.get('/', () => { });

        it('should find route', () => {
            assert.isTrue(server['routeLookup'](new MockReq({ method: 'GET', url: '/api/hello' }), new MockRes()));
            assert.isTrue(server['routeLookup'](new MockReq({ method: 'GET', url: '/api/hello/world' }), new MockRes()));

            assert.isTrue(server['routeLookup'](new MockReq({ method: 'GET', url: '/noname/foo' }), new MockRes()));
            assert.isTrue(server['routeLookup'](new MockReq({ method: 'GET', url: '/noname/foo/bar' }), new MockRes()));

            assert.isTrue(server['routeLookup'](new MockReq({ method: 'GET', url: '/print' }), new MockRes()));
            assert.isTrue(server['routeLookup'](new MockReq({ method: 'GET', url: '/is/this/root' }), new MockRes()), 'No match for /is/this/root');
            assert.isTrue(server['routeLookup'](new MockReq({ method: 'GET', url: '/' }), new MockRes()));
        });

        it('should not find route', () => {
            assert.isFalse(server['routeLookup'](new MockReq({ method: 'GET', url: '/api/hello/foo' }), new MockRes()));
            assert.isFalse(server['routeLookup'](new MockReq({ method: 'GET', url: '/api/hello/world/foo' }), new MockRes()));
            assert.isFalse(server['routeLookup'](new MockReq({ method: 'GET', url: '' }), new MockRes()));

            expect(errorMethod).to.have.been.called();
            expect(errorMethod).to.have.been.called.exactly(3);
        });
    });

    describe('middlewares', () => {
        it('should add middleware', () => {
            assert.isTrue(server.middlewares.length == 0);
            let a: iMiddleware;
            server.use(a);
            assert.isTrue(server.middlewares.length == 1);
        });
    });
});