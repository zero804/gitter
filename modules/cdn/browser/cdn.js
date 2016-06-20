"use strict";

var clientEnv = require('gitter-client-env');

module.exports = (function() {


  var hosts = clientEnv['cdns'];
  var hostLength = hosts && hosts.length;
  var assetTag = clientEnv['assetTag'];
  var cdnPrefix = assetTag ? "/_s/" + assetTag : '';

  function cdnNativeApp(url) {
    // nicest way of supporting embedded mobile chat
    return '../' + url;
  }

  function cdnPassthrough(url) {
    return '/_s/l/' + url;
  }

  function cdnSingle(url, options) {
    var nonrelative = options && options.nonrelative;

    var prefix = nonrelative ? "https://" : "//";
    if(options && options.notStatic === true) {
      return prefix + hosts[0] + "/" + url;
    }

    return prefix + hosts[0] + cdnPrefix + "/" + url;
  }

  function cdnMulti(url, options) {
    var x = 0;
    for(var i = 0; i < url.length; i = i + 3) {
      x = x + url.charCodeAt(i);
    }

    var host = hosts[x % hostLength];

    var nonrelative = options && options.nonrelative;
    var prefix = nonrelative ? "https://" : "//";

    if(options && options.notStatic === true) {
      return prefix + host + "/" + url;
    }

    return prefix + host + cdnPrefix + "/" + url;
  }

  if(window.location.protocol === 'file:') {
    return cdnNativeApp;
  } else if(!hostLength) {
    return cdnPassthrough;
  } else if(hostLength === 1) {
    return cdnSingle;
  } else {
    return cdnMulti;
  }


})();
