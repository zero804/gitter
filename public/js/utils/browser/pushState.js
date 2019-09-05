'use strict';

const appEvents = require('../appevents');

/**
 * Changes the browser location and sends track event,
 * doesn't do anything if we are trying to push the current state
 */
module.exports = (url, title = undefined, state = undefined) => {
  const innerState = state || url;
  if (window.history.state === innerState) return; // don't navigate if the state hasn't changed
  window.history.pushState(innerState, title || window.title, url);
  appEvents.trigger('track', url);
};
