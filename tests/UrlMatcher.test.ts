import { UrlMatcher } from '../src/UrlMatcher';
import { expect, assert } from 'chai';
import 'mocha';

describe('UrlMatcher', () => {
    describe('Constructor', () => {
        it('should return new instance', () => {
            const pattern = '/';
            const instance = new UrlMatcher(pattern, null);
            expect(instance.pattern).to.equal(pattern);
            expect(instance.callback).to.equal(null);
            assert(instance instanceof UrlMatcher);
        });
    });


    describe('hasQuery', () => {
        it('should return true', () => {
            const queryCheck = new UrlMatcher('/hello-world?foo=bar', null);
            const queryCheck1 = new UrlMatcher('/?hello=world', null);
            const queryCheck2 = new UrlMatcher('/?', null);
            assert.isTrue(queryCheck.hasQuery);
            assert.isTrue(queryCheck1.hasQuery);
            assert.isTrue(queryCheck2.hasQuery);
        });

        it('should return false', () => {
            const queryCheck = new UrlMatcher('/hello-world', null);
            const queryCheck1 = new UrlMatcher('/', null);
            const queryCheck2 = new UrlMatcher('/foobar/lorem/ipsum', null);
            assert.isFalse(queryCheck.hasQuery);
            assert.isFalse(queryCheck1.hasQuery);
            assert.isFalse(queryCheck2.hasQuery);
        });
    });

    describe('isMatch', () => {
        const simple = new UrlMatcher('/hello-world', () => { });
        const param = new UrlMatcher('/hello-world/:id', () => { });
        const optional = new UrlMatcher('/hello-world[/:id]', () => { });
        const exception = new UrlMatcher('/exception', null);

        it('should return true', () => {
            assert.isTrue(simple.isMatch('/hello-world', null, null, null), 'simple match failed');
            assert.isTrue(param.isMatch('/hello-world/1', null, null, null), 'param match failed');
            assert.isTrue(optional.isMatch('/hello-world', null, null, null), 'optional match failed');
            assert.isTrue(optional.isMatch('/hello-world/1', null, null, null), 'optional match failed');
            assert.isTrue(optional.isMatch('/hello-world/1', null, null, null), 'optional match failed');
        });

        it('should return false', () => {
            assert.isFalse(simple.isMatch('/hello-foo', null, null, null), 'simple match did match');
            assert.isFalse(param.isMatch('/hello-world', null, null, null), 'param match did match');
            assert.isFalse(param.isMatch('/hello-world/1/', null, null, null), 'param match did match');
            assert.isFalse(param.isMatch('/hello-world/1/foo', null, null, null), 'param match did match');
            assert.isFalse(optional.isMatch('/hello-world/foo/bar', null, null, null), 'optional match did match');
        });

        it('should throw error', () => {
            expect(() => exception.isMatch('/exception', null, null, null)).to.throw(Error);
        });
    });
});