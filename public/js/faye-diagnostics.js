"use strict";

var realtime = require('./components/realtime');
var log = require('./utils/log');

var count = 0;
function updateCount() {
  var t = document.querySelector('#total');
  t.textContent = count;
}
var subscription = realtime.subscribe('/private/diagnostics', function(message) {
  count++;
  var div = document.createElement('DIV');
  div.textContent = JSON.stringify(message);
  document.body.appendChild(div);
  updateCount();
  log.info('Message', message);
});

updateCount();

subscription.then(function() {
  log.info('Subscription on');
}, function(err) {
  log.info('Subscription failed', err);
});

