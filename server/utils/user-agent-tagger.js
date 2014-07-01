/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var useragent = require('useragent');
var isPhone = require('../web/is-phone');
var _ = require('underscore');

function isNativeApp(userAgentString) {
  return (userAgentString.indexOf('Gitter') >= 0 );
}

function getType(userAgentString) {
  return (isPhone(userAgentString) || userAgentString.indexOf('Mobile') >= 0) ? 'mobile' : 'desktop';
}

function getGitterAppMetadata(userAgentString) {
  // e.g GitterBeta/1.2.0
  var extension = userAgentString.substring(userAgentString.indexOf('Gitter')).split(' ')[0];

  var parts = extension.split('/');

  var family = parts[0];
  var versionParts = (parts[1] || '').split('.');

  return {
    family: family,
    major: versionParts[0] || '',
    minor: versionParts[1] || '',
    patch: versionParts[2] || ''
  };
}

function tagify(ua) {
  return {
    'agent:type': ua.type,
    'agent:family': ua.family,
    'agent:version': createVersionString(ua),
    'agent:device:family': ua.device.family,
    'agent:device:version': createVersionString(ua.device),
    'agent:os:family': ua.os.family,
    'agent:os:version': createVersionString(ua.os),
  };
}

function createVersionString(obj) {
  var version;
  if(obj.major) {
    version = '' + obj.major;
    if(obj.minor) {
      version = version + '.' + obj.minor;
      if(obj.patch) {
        version = version + '.' + obj.patch;
      }
    }
  }

  return version;
}

module.exports = function(userAgentString) {
  var userAgentObj = useragent.parse(userAgentString).toJSON();

  if(isNativeApp(userAgentString)) {
    var appMetadata = getGitterAppMetadata(userAgentString);
    userAgentObj = _.extend({}, userAgentObj, appMetadata);
  }
  userAgentObj.type = getType(userAgentString);

  return tagify(userAgentObj);
};
