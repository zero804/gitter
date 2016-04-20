"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var mixpanelToken = nconf.get('stats:mixpanel:token');

exports.getMixpanelDistinctId = function(cookies) {
  var mpCookie = cookies['mp_' + mixpanelToken + '_mixpanel'];
  if(!mpCookie) return;
  try {
    var mpInfo = JSON.parse(mpCookie);
    return mpInfo.distinct_id;
  } catch(e) {
    return;
  }
};
