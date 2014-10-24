define([
  'utils/context'
], function (context ) {
  "use strict";

  var hosts = context.env('cdns');
  var hostLength = hosts && hosts.length;
  var assetTag = context.env('assetTag');
  var cdnPrefix =  assetTag ? "/_s/" + assetTag : '';

  function cdnPassthrough(url) {
    // nicest way of supporting embedded mobile chat
    if(window.location.protocol === 'file:') {
      var index = window.location.pathname.indexOf('.app/www/build/');
      // embedded root should be /x/y/z/[Gitter or GitterBeta].app/www/build/
      var embeddedRoot = window.location.pathname.substring(0, index) + '.app/www/build/' ;

      return embeddedRoot + url;
    } else {
      return '/' + url;
    }
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

  if(!hostLength) {
    return cdnPassthrough;
  } else if(hostLength == 1) {
    return cdnSingle;
  } else {
    return cdnMulti;
  }

});
