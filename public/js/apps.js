"use strict";
require('utils/tracking');
require('components/statsc');

var appEvents = require('utils/appevents');

function initAppsPanel() {
  document.getElementById('apps-panel').classList.add('visible');
}

document.getElementById('osx-download').addEventListener('click', function() {
  appEvents.trigger('stats.event', 'apps.osx.download.clicked');
});

document.getElementById('windows-download').addEventListener('click', function() {
  appEvents.trigger('stats.event', 'apps.windows.download');
});

$( document ).ready(function() {
  setTimeout(initAppsPanel, 1000);

});
