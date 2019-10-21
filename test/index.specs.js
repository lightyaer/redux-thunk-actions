/* eslint-env node, mocha */
/* global Promise */
import assert from 'assert';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import configureMockStore from 'redux-mock-store';
import { createActionThunk } from '../src';
import chai from 'chai';
import spies from 'chai-spies';
import { createAction } from 'redux-actions';

chai.use(spies);
const should = chai.should();
const expect = chai.expect;

const reducer = (
  state = { started: false, data: null, error: null },
  action
) => {
  console.log(action.type, action.payload, action.error); //eslint-disable-line
  switch (action.type) {
    case 'fetchStarted':
      return Object.assign({}, state, {
        started: true,
        error: null,
        data: null
      });
    case 'fetchFailed':
      return Object.assign({}, state, {
        error: action.error
      });
    case 'fetchSucceeded':
      return Object.assign({}, state, {
        data: action.payload
      });
    case 'fetchEnded':
      return Object.assign({}, state, {
        started: false
      });
    default:
      return state;
  }
};

const myAsyncFunc = () => {
  return new Promise(resolve => setTimeout(() => resolve(10), 50));
};

describe('createActionThunk', () => {
  beforeEach(function() {
    this.store = createStore(reducer, applyMiddleware(...[thunkMiddleware]));
  });

  it('should dispatch non async functions', function() {
    let fetch = createActionThunk({ type: 'fetch', fn: () => 3 });
    this.store.dispatch(fetch());
    assert.equal(this.store.getState().data, 3);
  });

  it('should dispatch and return payload with non async functions', function() {
    let fetch = createActionThunk({ type: 'fetch', fn: () => 2 });
    let result = this.store.dispatch(fetch());
    assert.equal(result, 2);
  });

  it('should dispatch async function', function(done) {
    let fetch = createActionThunk({ type: 'fetch', fn: myAsyncFunc });
    let promise = this.store.dispatch(fetch());
    assert.equal(this.store.getState().started, true);
    assert.equal(this.store.getState().data, null);
    promise.then(data => {
      assert.equal(this.store.getState().started, false);
      assert.equal(this.store.getState().data, 10);
      assert.equal(data, 10);
      done();
    }, done);
  });

  it('should test the extraActions', function(done) {
    const payloadCreator = payload => payload;
    const chaiSpy = chai.spy(payloadCreator);
    let fetch = createActionThunk({
      type: 'fetch',
      fn: myAsyncFunc,
      suppressException: null,
      suffix: undefined,
      extraActions: {
        started: [createAction('started', chaiSpy)],
        succeeded: [createAction('succeeded', chaiSpy)],
        failed: [createAction('failed', chaiSpy)],
        ended: [createAction('ended', chaiSpy)]
      }
    });

    let promise = this.store.dispatch(fetch());
    assert.equal(this.store.getState().started, true);
    assert.equal(this.store.getState().data, null);
    promise.then(data => {
      assert.equal(this.store.getState().started, false);
      assert.equal(this.store.getState().data, 10);
      assert.equal(data, 10);
      chaiSpy.should.have.been.first.called.with({
        type: 'fetch',
        hook: 'started'
      });

      chaiSpy.should.have.been.second.called.with({
        type: 'fetch',
        hook: 'succeeded',
        data: 10
      });

      chaiSpy.should.have.been.third.called.with({
        type: 'fetch',
        hook: 'ended'
      });
      done();
    }, done);
  });

  it('should test the extraActions with non-array extraActions', function(done) {
    const payloadCreator = payload => payload;
    const chaiSpy = chai.spy(payloadCreator);
    let fetch = createActionThunk({
      type: 'fetch',
      fn: myAsyncFunc,
      suppressException: null,
      suffix: undefined,
      extraActions: {
        started: createAction('started', chaiSpy),
        succeeded: createAction('succeeded', chaiSpy),
        failed: createAction('failed', chaiSpy),
        ended: createAction('ended', chaiSpy)
      }
    });

    let promise = this.store.dispatch(fetch());
    assert.equal(this.store.getState().started, true);
    assert.equal(this.store.getState().data, null);
    promise.then(data => {
      assert.equal(this.store.getState().started, false);
      assert.equal(this.store.getState().data, 10);
      assert.equal(data, 10);
      chaiSpy.should.have.been.first.called.with({
        type: 'fetch',
        hook: 'started'
      });

      chaiSpy.should.have.been.second.called.with({
        type: 'fetch',
        hook: 'succeeded',
        data: 10
      });

      chaiSpy.should.have.been.third.called.with({
        type: 'fetch',
        hook: 'ended'
      });
      done();
    }, done);
  });

  it('should test the extraActions with Error', function() {
    const payloadCreator = payload => payload;
    const chaiSpy = chai.spy(payloadCreator);
    let fetch = createActionThunk({
      type: 'fetch',
      fn: () => {
        throw new Error('boom!');
      },
      suppressException: null,
      suffix: undefined,
      extraActions: {
        started: [createAction('started', chaiSpy)],
        succeeded: [createAction('succeeded', chaiSpy)],
        failed: [createAction('failed', chaiSpy)],
        ended: [createAction('ended', chaiSpy)]
      }
    });
    try {
      this.store.dispatch(fetch());
    } catch (e) {
      assert.equal(e.message, 'boom!');
      assert.equal(this.store.getState().started, false);
      assert.equal(this.store.getState().error, true);
      chaiSpy.should.have.been.first.called.with({
        type: 'fetch',
        hook: 'started'
      });

      chaiSpy.should.have.been.second.called.with({
        type: 'fetch',
        hook: 'failed',
        err: new Error('boom!')
      });

      chaiSpy.should.have.been.third.called.with({
        type: 'fetch',
        hook: 'ended'
      });
    }
  });

  it('should dispatch FAILED, then ERROR and then throw on error', function() {
    let fetch = createActionThunk({
      type: 'fetch',
      fn: () => {
        throw new Error('boom!');
      }
    });
    try {
      this.store.dispatch(fetch());
    } catch (e) {
      assert.equal(e.message, 'boom!');
      assert.equal(this.store.getState().started, false);
      assert.equal(this.store.getState().error, true);
    }
  });

  it('should work with empty payload', function() {
    const middlewares = [thunkMiddleware]; // add your middlewares like `redux-thunk`
    const mockStore = configureMockStore(middlewares);
    const store = mockStore({});

    let fetch = createActionThunk({ type: 'fetch', fn: () => {} });
    store.dispatch(fetch());

    const actions = store.getActions();
    assert.equal(actions.length, 3);

    const [start, success, ended] = actions;
    assert.deepEqual(start, { type: fetch.STARTED, payload: [] });
    // we keep the old START for backward compatibility
    assert.deepEqual(start, { type: fetch.START, payload: [] });
    assert.deepEqual(success, { type: fetch.SUCCEEDED });
    assert.equal(ended.type, fetch.ENDED);
  });

  describe('with meta', function() {
    const middlewares = [thunkMiddleware]; // add your middlewares like `redux-thunk`
    const mockStore = configureMockStore(middlewares);

    beforeEach(() => {
      this.store = mockStore({});
    });

    it('should dispatch action with meta', () => {
      let fetch = createActionThunk({
        type: 'fetch',
        fn: () => ({ payload: 2, meta: 3 })
      });
      this.store.dispatch(fetch(1));

      const actions = this.store.getActions();
      assert.equal(actions.length, 3);

      const [start, success, ended] = actions;
      assert.deepEqual(start, { type: fetch.STARTED, payload: [1] });
      // we keep the old START for backward compatibility
      assert.deepEqual(start, { type: fetch.START, payload: [1] });
      assert.deepEqual(success, { type: fetch.SUCCEEDED, payload: 2, meta: 3 });
      assert.equal(ended.type, fetch.ENDED);
    });
  });
});
