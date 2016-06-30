'use strict';

/**
 * Detect when the server version differs from the client version, await a timeout
 * and after the timeout period force a refresh of the browser when the user
 * isn't looking and the browser is online.
 */

var clientEnv = require('gitter-client-env');
var currentVersion = clientEnv['version'];
var debug = require('debug-proxy')('app:reload-on-update');
var frameUtils = require('../utils/frame-utils');
var eyeballsDetector = require('./eyeballs-detector');

var RELOAD_COUNTDOWN_TIMER = 15 * 60 * 1000; /* 15 minutes */
var TIME_BEFORE_RELOAD = 2 * 60 * 1000; /* 2 minutes */

var awaitingReloadOpportunity = false;
var reloadCountdownTimer;
var reloadTimer = null;
var isOnline = true;

/**
 * Reload now
 */
function reloadNow() {
  if (frameUtils.hasParentFrameSameOrigin()) {
    window.parent.location.reload(true);
  } else {
    window.location.reload(true);
  }
}

/**
 * Is now a good time to reload?
 */
function checkReloadOpportunity() {
  if (!awaitingReloadOpportunity) return;

  if (isOnline && !eyeballsDetector.getEyeballs()) {
    /* Give the user 10 more seconds */
    if (!reloadTimer) {
      reloadTimer = setTimeout(reloadNow, TIME_BEFORE_RELOAD);
    }
  } else {
    delayReload();
  }
}

/* User went offline or eyeballs on, wait some more */
function delayReload() {
  clearTimeout(reloadTimer);
  reloadTimer = null;
}

/**
 * Countdown timer has completed. Await for any opportunity to
 * reload the browser, when the user is eyeballs off but
 * connected to the internet (we don't want the reload to fail)
 */
function awaitReloadOpportunity() {
  if (awaitingReloadOpportunity) return;
  awaitingReloadOpportunity = true;
  checkReloadOpportunity();
}


var listenersInstalled = false;
function installListeners() {
  if (listenersInstalled) return;

  /**
   * Fired when the browser status changes
   */
  function updateOnlineStatus(e) {
    isOnline = e.type === 'online';
    checkReloadOpportunity();
  }

  eyeballsDetector.events.on('change', function() {
    checkReloadOpportunity();
  });

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  listenersInstalled = true;
}

/**
 * Wait for a timeout before forcing the user to upgrade
 */
function startReloadTimer() {
  if (reloadCountdownTimer) return;
  debug('Application version mismatch');

  installListeners();

  reloadCountdownTimer = window.setTimeout(awaitReloadOpportunity, RELOAD_COUNTDOWN_TIMER);
}

/**
 * Cancel the reload countdown
 */
function cancelReload() {
  if (!reloadCountdownTimer) return
  window.clearTimeout(reloadCountdownTimer);
  reloadCountdownTimer = null;
}

function reportServerVersion(version) {
  if (version === currentVersion) {
    // Odd
    cancelReload();
  } else {
    // App version has changed,
    // start the countdown
    startReloadTimer();
  }
}

module.exports = {
  reportServerVersion: reportServerVersion
}
