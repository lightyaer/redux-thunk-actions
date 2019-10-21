import { createAction } from 'redux-actions';
import { every, isArray } from 'lodash';
import { suffixDefaults, extraActionDefaults } from './defaults';

/**
 * Creates an async action creator
 *
 * @param  {String} type
 * @param  {Function} fn                 the function to be called async
 * @param  {Boolean} suppressException   optionally do not throw exceptions
 * @param  {Object} suffix
 * @return {Funtion}                     the action creator
 */

const isPromise = p => {
  return p && p.then && p.catch;
};

export const createActionThunk = (
  type,
  fn,
  suppressException,
  suffix = suffixDefaults,
  extraActions = extraActionDefaults
) => {
  const TYPE_STARTED = `${type}${suffix.STARTED}`;
  const TYPE_SUCCEEDED = `${type}${suffix.SUCCEEDED}`;
  const TYPE_FAILED = `${type}${suffix.FAILED}`;
  const TYPE_ENDED = `${type}${suffix.ENDED}`;

  const actionCreators = {
    [TYPE_STARTED]: createAction(TYPE_STARTED),
    [TYPE_SUCCEEDED]: createAction(TYPE_SUCCEEDED),
    [TYPE_FAILED]: createAction(TYPE_FAILED),
    [TYPE_ENDED]: createAction(TYPE_ENDED)
  };

  if(!isArray(extraActions.started)) {
    extraActions.started = [extraActions.started];
  }

  if(!isArray(extraActions.succeeded)) {
    extraActions.succeeded = [extraActions.succeeded];
  }

  if(!isArray(extraActions.failed)) {
    extraActions.failed = [extraActions.failed];
  }

  if(!isArray(extraActions.ended)) {
    extraActions.ended = [extraActions.ended];
  }

  const successActionWithMeta = createAction(
    TYPE_SUCCEEDED,
    ({ payload }) => payload,
    ({ meta }) => meta
  );

  const factory = (...args) => (dispatch, getState, extra) => {
    let result;
    let startedAt = new Date().getTime();
    dispatch(actionCreators[TYPE_STARTED](args));

    every(extraActions.started, action => {
      dispatch(
        action({
          type,
          hook: 'started'
        })
      );
    });


    const succeeded = data => {
      const action =
        data && data.payload
          ? successActionWithMeta(data)
          : actionCreators[TYPE_SUCCEEDED](data);

      dispatch(action);
      every(extraActions.succeeded, action => {
        dispatch(
          action({
            type,
            hook: 'succeeded',
            data
          })
        );
      });

      let endedAt = new Date().getTime();
      const elapsed = endedAt - startedAt;

      dispatch(actionCreators[TYPE_ENDED]({
        elapsed
      }));
      every(extraActions.ended, action => {
        dispatch(
          action({
            type,
            hook: 'ended'
          })
        );
      });
      return data;
    };
    const failed = err => {
      let endedAt = new Date().getTime();
      const elapsed = endedAt - startedAt;
      dispatch(actionCreators[TYPE_FAILED](err));

      every(extraActions.failed, action => {
        dispatch(
          action({
            type,
            hook: 'failed',
            err
          })
        );
      });

      dispatch(
        actionCreators[TYPE_ENDED]({
          elapsed
        })
      );

      every(extraActions.ended, action => {
        dispatch(
          action({
            type,
            hook: 'ended'
          })
        );
      });

      if (!suppressException) {
        throw err;
      }
    };
    try {
      result = fn(...args, { getState, dispatch, extra });
    } catch (error) {
      failed(error);
    }
    // in case of async (promise), use success and fail callbacks.
    if (isPromise(result)) {
      return result.then(succeeded, failed);
    }
    return succeeded(result);
  };

  factory.NAME = type;
  factory.toString = () => type;
  factory.START = actionCreators[TYPE_STARTED].toString();
  factory.STARTED = factory.START;
  factory.SUCCEEDED = actionCreators[TYPE_SUCCEEDED].toString();
  factory.FAILED = actionCreators[TYPE_FAILED].toString();
  factory.ENDED = actionCreators[TYPE_ENDED].toString();

  return factory;
};

//helpers
