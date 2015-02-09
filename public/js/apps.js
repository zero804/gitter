"use strict";

require('utils/tracking');
var appEvents = require('utils/appevents');
var $ = require('jquery');

function initAppsPanel() {
  document.getElementById('apps-panel').classList.add('visible');
}

document.getElementById('osx-download').addEventListener('click', function() {
  appEvents.trigger('track-event', 'desktop_client_download', { downloadOs: 'osx' });
});

document.getElementById('windows-download').addEventListener('click', function() {
  appEvents.trigger('track-event', 'desktop_client_download', { downloadOs: 'windows' });
});

$(document).ready(function() {
  setTimeout(initAppsPanel, 1000);
});
