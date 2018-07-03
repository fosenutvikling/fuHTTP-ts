import { Server } from '../src/Server';
import { Route } from '../src/Route';
import { expect, assert, use, spy } from 'chai';
import { IMiddleware } from '../src/middlewares/iMiddleware';
import * as spies from 'chai-spies';

var MockReq = require('mock-req');
var MockRes = require('mock-res');
import 'mocha';

use(spies);

describe('Server', () => {
    let server = new Server(1300);
    let errorMethod = spy(res => {});
    server.onNotFoundError = errorMethod;
    let notAllowed = spy((methods, res) => {});
    server.onMethodNotAllowed = notAllowed;
    let apiRoute = new Route();
    let nonameRoute = new Route();
    let emptyRoute = new Route();

    apiRoute.get('/hello', () => {});
    apiRoute.get('/hello/world', () => {});
    nonameRoute.get('/foo', () => {});
    nonameRoute.get('/foo/bar', () => {});
    emptyRoute.get('/print', () => {});
    emptyRoute.get('/is/this/root', () => {});
    emptyRoute.get('/', () => {});

    describe('Add routes', () => {
        it('should add root route', () => {
            assert.isNull(server['route'] as Route);
            server.add('/', apiRoute);
            assert.isNotNull(server['route'] as Route);
        });

        it('should add route with a path', () => {
            assert.isUndefined((server['route'] as Route).nextRoute['noname']);
            server.add('/noname', nonameRoute);
            assert.isNotNull((server['route'] as Route).nextRoute['noname']);

            assert.isUndefined((server['route'] as Route).nextRoute['api']);
            server.add('/api', apiRoute);
            assert.isNotNull((server['route'] as Route).nextRoute['api']);

            server.add('/api/noname/sub', apiRoute);
            assert.isNotNull(
                (server['route'] as Route).nextRoute['api'].nextRoute['noname'].nextRoute['sub']
            );
        });
    });

    describe('routeLookup', () => {
        it('should find route', () => {
            assert.isTrue(
                server['routeLookup'](new MockReq({ method: 'GET', url: '/hello' }), new MockRes())
            );
            assert.isTrue(
                server['routeLookup'](
                    new MockReq({ method: 'GET', url: '/hello/world' }),
                    new MockRes()
                )
            );

            assert.isTrue(
                server['routeLookup'](
                    new MockReq({ method: 'GET', url: '/api/hello' }),
                    new MockRes()
                )
            );
            assert.isTrue(
                server['routeLookup'](
                    new MockReq({ method: 'GET', url: '/api/hello/world' }),
                    new MockRes()
                )
            );

            assert.isTrue(
                server['routeLookup'](
                    new MockReq({ method: 'GET', url: '/noname/foo' }),
                    new MockRes()
                )
            );
            assert.isTrue(
                server['routeLookup'](
                    new MockReq({ method: 'GET', url: '/noname/foo/bar' }),
                    new MockRes()
                )
            );

            assert.isTrue(
                server['routeLookup'](
                    new MockReq({ method: 'GET', url: '/api/noname/sub/noname/foo/bar' }),
                    new MockRes()
                )
            );
        });

        it('should not find route', () => {
            assert.isFalse(
                server['routeLookup'](
                    new MockReq({ method: 'GET', url: '/api/hello/foo' }),
                    new MockRes()
                )
            );
            assert.isFalse(
                server['routeLookup'](
                    new MockReq({ method: 'GET', url: '/api/hello/world/foo' }),
                    new MockRes()
                )
            );
            assert.isFalse(
                server['routeLookup'](new MockReq({ method: 'GET', url: '' }), new MockRes())
            );

            expect(errorMethod).to.have.been.called();
            expect(notAllowed).to.have.been.called();
            expect(errorMethod).to.have.been.called.exactly(2);
            expect(notAllowed).to.have.been.called.exactly(1);
        });
    });

    describe('middlewares', () => {
        it('should add middleware', () => {
            assert.isTrue(server.middlewares.length === 2); // Default middlewares added in constructor
            let a: IMiddleware;
            server.use(a);
            assert.isTrue(server.middlewares.length === 3);
        });
    });
});
