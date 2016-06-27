'use strict';

var clientEnv = require('gitter-client-env');
var currentVersion = clientEnv['version'];
var debug = require('debug-proxy')('app:reload-on-update');
var frameUtils = require('../utils/frame-utils');
var eyeballsDetector = require('./eyeballs-detector');

var RELOAD_COUNTDOWN_TIMER = 10 * 60 * 1000; /* 10 minutes */
var TIME_BEFORE_RELOAD = 10 * 1000; /* 10 seconds */

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

function delayReload() {
  /* User went offline or eyeballs on, wait some more */
  clearTimeout(reloadTimer);
  reloadTimer = null;
}

function awaitReloadOpportunity() {
  if (awaitingReloadOpportunity) return;
  awaitingReloadOpportunity = true;
  checkReloadOpportunity();
}

/**
 * Fired when the browser status changes
 */
function updateOnlineStatus(e) {
  isOnline = e.type === 'online';
  checkReloadOpportunity();
}

var listenersInstalled = false;
function installListeners() {
  if (listenersInstalled) return;

  eyeballsDetector.events.on('change', function() {
    checkReloadOpportunity();
  });

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  listenersInstalled = true;
}

function startReloadTimer() {
  if (reloadCountdownTimer) return;
  debug('Application version mismatch');

  installListeners();

  reloadCountdownTimer = window.setTimeout(awaitReloadOpportunity, RELOAD_COUNTDOWN_TIMER);
}

/**
 * Cancel the reload
 */
function cancelReload() {
  if (!reloadCountdownTimer) return
  window.clearTimeout(reloadCountdownTimer);
  reloadCountdownTimer = null;
}

function reportServerVersion(version) {
  if (version === currentVersion) {
    cancelReload();
  } else {
    startReloadTimer();
  }
}

module.exports = {
  reportServerVersion: reportServerVersion
}
