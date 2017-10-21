import { Route } from '../src/Route';
import { iMiddleware } from '../src/middlewares/iMiddleware';
import { expect, assert, use, spy } from 'chai';
import * as spies from 'chai-spies';
import * as http from 'http';
var MockReq = require('mock-req');
import 'mocha';

use(spies);

describe('Route', () => {
    // Route object used for testing
    const helloRoute = new Route('hello');

    // Routes to add for testing
    const randomRoute = '/random';
    const newRoute = '/newRoute';
    const exceptionRoute = '/exception';

    let simpleRouteFunction = () => { };


    describe('routeName', () => {
        it('should return correct route-name', () => {
            const worldRoute = new Route();
            worldRoute.routeName = 'world';

            expect(helloRoute.routeName).to.equal('hello');
            expect(worldRoute.routeName).to.equal('world');
        });

        it('should update route-name', () => {
            helloRoute.routeName = 'world';
            expect(helloRoute.routeName).to.equal('world');

            // Change back to default
            helloRoute.routeName = 'hello';
            expect(helloRoute.routeName).to.equal('hello');
        });
    });

    describe('removeTrailingSlash', () => {
        it('should remove trailing slash', () => {
            expect(Route.removeTrailingSlash('/users/')).to.equal('/users');
            expect(Route.removeTrailingSlash('/users/foobar/')).to.equal('/users/foobar');
        });

        it('should not remove anything', () => {
            expect(Route.removeTrailingSlash('/users')).to.equal('/users');
            expect(Route.removeTrailingSlash('/users/foobar')).to.equal('/users/foobar');
        })
    });

    describe('Append slash to front', () => {
        it('should append slash', () => {
            expect(Route.addSlashToFront('users/')).to.equal('/users/');
            expect(Route.addSlashToFront('users/foo/bar')).to.equal('/users/foo/bar');
            expect(Route.addSlashToFront('users/foo/bar/')).to.equal('/users/foo/bar/');
        });

        it('should not append slash', () => {
            expect(Route.addSlashToFront('/users/')).to.equal('/users/');
            expect(Route.addSlashToFront('/users/foo/bar')).to.equal('/users/foo/bar');
            expect(Route.addSlashToFront('/users/foo/bar/')).to.equal('/users/foo/bar/');
        });
    });

    describe('Fix request url', () => {
        it('should clean', () => {
            expect(Route.fixRequestUrlForAdding('users')).to.equal('/users');
            expect(Route.fixRequestUrlForAdding('users/')).to.equal('/users');
            expect(Route.fixRequestUrlForAdding('/users/')).to.equal('/users');

            expect(Route.fixRequestUrlForAdding('/users/foo/bar/')).to.equal('/users/foo/bar');
            expect(Route.fixRequestUrlForAdding('users/foo/bar/')).to.equal('/users/foo/bar');
        });

        it('should not clean', () => {
            expect(Route.fixRequestUrlForAdding('/users')).to.equal('/users');
            expect(Route.fixRequestUrlForAdding('/users/foo/bar')).to.equal('/users/foo/bar');
        });
    });

    describe('Adding routes', () => {
        it('should add get route', () => {
            helloRoute.get(randomRoute, simpleRouteFunction);
            assert.isArray(helloRoute.getRoute, 'Get route is not an array');
            expect(helloRoute.getRoute.length).to.equal(1, 'Get route count != 1');

            helloRoute.get(newRoute, simpleRouteFunction);
            expect(helloRoute.getRoute.length).to.equal(2, 'Get route count != 2');
        });

        it('should add put route', () => {
            helloRoute.put(randomRoute, simpleRouteFunction);
            assert.isArray(helloRoute.putRoute, 'Put route is not an array');
            expect(helloRoute.putRoute.length).to.equal(1, 'Put route count != 1');

            helloRoute.put(newRoute, simpleRouteFunction);
            expect(helloRoute.putRoute.length).to.equal(2, 'Put route count != 2');
        });

        it('should add post route', () => {
            helloRoute.post(randomRoute, simpleRouteFunction);
            assert.isArray(helloRoute.postRoute, 'Post route is not an array');
            expect(helloRoute.postRoute.length).to.equal(1, 'Post route count != 1');

            helloRoute.post(newRoute, simpleRouteFunction);
            expect(helloRoute.postRoute.length).to.equal(2, 'Post route count != 2');
        });

        it('should add delete route', () => {
            helloRoute.delete(randomRoute, simpleRouteFunction);
            assert.isArray(helloRoute.deleteRoute, 'Delete route is not an array');
            expect(helloRoute.deleteRoute.length).to.equal(1, 'Delete route count != 1');

            helloRoute.delete(newRoute, simpleRouteFunction);
            expect(helloRoute.deleteRoute.length).to.equal(2, 'Delete route count != 2');
        });

    });

    describe('Parse', () => {
        it('Should match route', () => {
            assert.isTrue(helloRoute.parse(randomRoute, new MockReq({ method: 'GET' }), null));
            assert.isTrue(helloRoute.parse(randomRoute, new MockReq({ method: 'PUT' }), null));
            assert.isTrue(helloRoute.parse(randomRoute, new MockReq({ method: 'POST' }), null));
            assert.isTrue(helloRoute.parse(randomRoute, new MockReq({ method: 'DELETE' }), null));

            assert.isTrue(helloRoute.parse(newRoute, new MockReq({ method: 'GET' }), null));
            assert.isTrue(helloRoute.parse(newRoute, new MockReq({ method: 'PUT' }), null));
            assert.isTrue(helloRoute.parse(newRoute, new MockReq({ method: 'POST' }), null));
            assert.isTrue(helloRoute.parse(newRoute, new MockReq({ method: 'DELETE' }), null));
        });

        it('should match route without slash', () => {
            assert.isTrue(helloRoute.parse(randomRoute + '/', new MockReq({ method: 'GET' }), null));
            assert.isTrue(helloRoute.parse(randomRoute.substring(1) + '/', new MockReq({ method: 'GET' }), null));
            assert.isTrue(helloRoute.parse(randomRoute.substring(1), new MockReq({ method: 'GET' }), null));
        });

        it('should match and call function', () => {
            let inc = 1;
            function getMatchRoot() { }
            function getMatchRootId(req, res, id) { assert.isTrue(id == inc); ++inc; }

            let spyFunctionRoot = spy(getMatchRoot);
            let spyFunctionRootId = spy(getMatchRootId);

            helloRoute.get('/spy', spyFunctionRoot);
            helloRoute.get('/spy/:id', spyFunctionRootId);

            assert.isTrue(helloRoute.parse('/spy', new MockReq({ method: 'GET' }), null));
            assert.isTrue(helloRoute.parse('/spy/1', new MockReq({ method: 'GET' }), null));
            assert.isTrue(helloRoute.parse('/spy/2', new MockReq({ method: 'GET' }), null));



            expect(spyFunctionRoot).to.have.been.called.once;
            expect(spyFunctionRootId).to.have.been.called.twice;

        });

        it('should trigger error function', () => {
            function errorFunction() { }
            let spyErrorFunction = spy(errorFunction);
            Route.errorRoute = spyErrorFunction;
            assert.isFalse(helloRoute.parse('/spye', new MockReq({ method: 'GET' }), null));
            assert.isFalse(helloRoute.parse('/spy/1/foo', new MockReq({ method: 'GET' }), null));

            expect(spyErrorFunction).to.have.been.called.twice;
        });

        it('should call correct http-method', () => {
            let getMethod = spy((req) => { assert.isTrue(req.method == 'GET') });
            let putMethod = spy((req) => { assert.isTrue(req.method == 'PUT') });
            let postMethod = spy((req) => { assert.isTrue(req.method == 'POST') });
            let deleteMethod = spy((req) => { assert.isTrue(req.method == 'DELETE') });

            helloRoute.get('/hello-world', getMethod);
            helloRoute.put('/hello-world', putMethod);
            helloRoute.post('/hello-world', postMethod);
            helloRoute.delete('/hello-world', deleteMethod);

            assert.isTrue(helloRoute.parse('/hello-world', new MockReq({ method: 'GET' }), null));
            assert.isTrue(helloRoute.parse('/hello-world', new MockReq({ method: 'PUT' }), null));
            assert.isTrue(helloRoute.parse('/hello-world', new MockReq({ method: 'POST' }), null));
            assert.isTrue(helloRoute.parse('/hello-world', new MockReq({ method: 'DELETE' }), null));

            expect(getMethod).to.have.been.called.once;
            expect(putMethod).to.have.been.called.once;
            expect(postMethod).to.have.been.called.once;
            expect(deleteMethod).to.have.been.called.once;
        });

        it('should call http-method with `world` as input parameter', () => {
            let getMethod = spy((req, res, name) => {
                assert.isTrue(req.method == 'GET');
                assert.isTrue(name == 'world-get');
            });

            let putMethod = spy((req, res, name) => {
                assert.isTrue(req.method == 'PUT');
                assert.isTrue(name == 'world-put');
            });

            let postMethod = spy((req, res, name) => {
                assert.isTrue(req.method == 'POST');
                assert.isTrue(name == 'world-post');
            });

            let deleteMethod = spy((req, res, name) => {
                assert.isTrue(req.method == 'DELETE');
                assert.isTrue(name == 'world-delete');
            });

            helloRoute.get('/hello-world/:name', getMethod);
            helloRoute.put('/hello-world/:name', putMethod);
            helloRoute.post('/hello-world/:name', postMethod);
            helloRoute.delete('/hello-world/:name', deleteMethod);

            assert.isTrue(helloRoute.parse('/hello-world/world-get', new MockReq({ method: 'GET' }), null));
            assert.isTrue(helloRoute.parse('/hello-world/world-put', new MockReq({ method: 'PUT' }), null));
            assert.isTrue(helloRoute.parse('/hello-world/world-post', new MockReq({ method: 'POST' }), null));
            assert.isTrue(helloRoute.parse('/hello-world/world-delete', new MockReq({ method: 'DELETE' }), null));

            expect(getMethod).to.have.been.called.once;
            expect(putMethod).to.have.been.called.once;
            expect(postMethod).to.have.been.called.once;
            expect(deleteMethod).to.have.been.called.once;
        });
    });

    describe('Sub-routing', () => {

        it('should add a sub-route with no route-name', () => {
            let parentRoute = new Route();
            parentRoute.get('/one-get', () => { });
            parentRoute.get('/two-get', () => { });

            parentRoute.put('/one-put', () => { });
            parentRoute.post('/one-post', () => { });
            parentRoute.delete('/one-delete', () => { });

            let subRoute = new Route('sub');
            subRoute.get('/sub-one-get', () => { });
            subRoute.get('/sub-two-get', () => { });
            subRoute.put('/sub-one-put', () => { });
            subRoute.post('/sub-one-post', () => { });
            subRoute.delete('/sub-one-delete', () => { });

            parentRoute.add(subRoute);

            assert.isTrue(parentRoute.getRoute.length == 4);
            assert.isTrue(parentRoute.putRoute.length == 2);
            assert.isTrue(parentRoute.postRoute.length == 2);
            assert.isTrue(parentRoute.deleteRoute.length == 2);

            assert.isTrue(parentRoute.getRoute[0].pattern == '/one-get');
            assert.isTrue(parentRoute.getRoute[1].pattern == '/two-get');
            assert.isTrue(parentRoute.getRoute[2].pattern == '/sub/sub-one-get');
            assert.isTrue(parentRoute.getRoute[3].pattern == '/sub/sub-two-get');

            assert.isTrue(parentRoute.putRoute[0].pattern == '/one-put');
            assert.isTrue(parentRoute.putRoute[1].pattern == '/sub/sub-one-put');

            assert.isTrue(parentRoute.postRoute[0].pattern == '/one-post');
            assert.isTrue(parentRoute.postRoute[1].pattern == '/sub/sub-one-post');

            assert.isTrue(parentRoute.deleteRoute[0].pattern == '/one-delete');
            assert.isTrue(parentRoute.deleteRoute[1].pattern == '/sub/sub-one-delete');

            assert.isTrue(parentRoute.parse('/one-get', new MockReq({ method: 'GET' }), null));
            assert.isTrue(parentRoute.parse('/sub/sub-one-get', new MockReq({ method: 'GET' }), null));
        });

        it('should add a subroute to route with route-name', () => {
            let parentRoute = new Route('api');
            parentRoute.get('/one-get', () => { });
            parentRoute.get('/two-get', () => { });

            parentRoute.put('/one-put', () => { });
            parentRoute.post('/one-post', () => { });
            parentRoute.delete('/one-delete', () => { });

            let subRoute = new Route('sub');
            subRoute.get('/sub-one-get', () => { });
            subRoute.get('/sub-two-get', () => { });
            subRoute.put('/sub-one-put', () => { });
            subRoute.post('/sub-one-post', () => { });
            subRoute.delete('/sub-one-delete', () => { });

            parentRoute.add(subRoute);

            assert.isTrue(parentRoute.getRoute.length == 4);
            assert.isTrue(parentRoute.putRoute.length == 2);
            assert.isTrue(parentRoute.postRoute.length == 2);
            assert.isTrue(parentRoute.deleteRoute.length == 2);

            assert.isTrue(parentRoute.getRoute[0].pattern == '/one-get');
            assert.isTrue(parentRoute.getRoute[1].pattern == '/two-get');
            assert.isTrue(parentRoute.getRoute[2].pattern == '/sub/sub-one-get');
            assert.isTrue(parentRoute.getRoute[3].pattern == '/sub/sub-two-get');

            assert.isTrue(parentRoute.putRoute[0].pattern == '/one-put');
            assert.isTrue(parentRoute.putRoute[1].pattern == '/sub/sub-one-put');

            assert.isTrue(parentRoute.postRoute[0].pattern == '/one-post');
            assert.isTrue(parentRoute.postRoute[1].pattern == '/sub/sub-one-post');

            assert.isTrue(parentRoute.deleteRoute[0].pattern == '/one-delete');
            assert.isTrue(parentRoute.deleteRoute[1].pattern == '/sub/sub-one-delete');

            assert.isTrue(parentRoute.parse('/one-get', new MockReq({ method: 'GET' }), null));
            assert.isTrue(parentRoute.parse('/sub/sub-one-get', new MockReq({ method: 'GET' }), null));
        });
    });

    describe('Middleware', () => {
        it('should add middleware', () => {
            assert.isTrue(helloRoute.middleware.length == 0);
            let a: iMiddleware;
            helloRoute.use(a);
            assert.isTrue(helloRoute.middleware.length == 1);
        });
    });
});