"use strict";
require('utils/tracking');
require('components/statsc');

var appEvents = require('utils/appevents');

document.getElementById('osx-download').addEventListener('click', function() {
  appEvents.trigger('stats.event', 'apps.osx.download.clicked');
});

document.getElementById('windows-download').addEventListener('click', function() {
  appEvents.trigger('stats.event', 'apps.windows.download');
});
