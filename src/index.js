import { createAction } from 'redux-actions';

/**
 * Creates an async action creator
 *
 * @param type
 * @param  {Function} fn                 the function to be called async
 * @param  {Boolean} suppressException   optionally do not throw exceptions
 * @param  {Object} suffix
 * @return {Funtion}                     the action creator
 */

const suffixDefaults = {
  STARTED: 'Started',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  ENDED: 'Ended'
};

const isPromise = (p) => {
  return p && p.then && p.catch;
};


export const createActionThunk = (type, fn, suppressException, suffix = suffixDefaults) => {
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
  const successActionWithMeta = createAction(
    TYPE_SUCCEEDED,
    ({ payload }) => payload,
    ({ meta }) => meta
  );

  const factory = (...args) => (dispatch, getState, extra) => {
    let result;
    let startedAt = new Date().getTime();
    dispatch(actionCreators[TYPE_STARTED](args));
    const succeeded = data => {
      const action =
        data && data.payload
          ? successActionWithMeta(data)
          : actionCreators[TYPE_SUCCEEDED](data);

      dispatch(action);
      let endedAt = new Date().getTime();
      dispatch(
        actionCreators[TYPE_ENDED]({
          elapsed: endedAt - startedAt
        })
      );
      return data;
    };
    const failed = err => {
      let endedAt = new Date().getTime();
      dispatch(actionCreators[TYPE_FAILED](err));
      dispatch(
        actionCreators[TYPE_ENDED]({
          elapsed: endedAt - startedAt
        })
      );
      if(!suppressException) {
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
