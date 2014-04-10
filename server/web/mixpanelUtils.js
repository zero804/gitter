/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";
var nconf       = require('../utils/config');
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
