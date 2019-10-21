export const suffixDefaults = {
  STARTED: 'Started',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  ENDED: 'Ended'
};

export const extraActionDefaults = {
  [suffixDefaults.STARTED.toLowerCase()]: [],
  [suffixDefaults.SUCCEEDED.toLowerCase()]:[],
  [suffixDefaults.FAILED.toLowerCase()]: [],
  [suffixDefaults.ENDED.toLowerCase()]:[]
};
