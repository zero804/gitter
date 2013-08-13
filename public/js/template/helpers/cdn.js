/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/context',
  'handlebars'
], function (context, Handlebars ) {
  "use strict";

  var hosts = context.env('cdns');
  var hostLength = hosts && hosts.length;
  var cdnPrefix = context.env('appVersion') ? "/s/" + context.env('appVersion') : '';

  function cdnPassthrough(url) {
    return "/" + url;
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
    Handlebars.registerHelper( 'cdn', cdnPassthrough);
    return cdnPassthrough;
  } else if(hostLength == 1) {
    Handlebars.registerHelper( 'cdn', cdnSingle);
    return cdnSingle;
  } else {
    Handlebars.registerHelper( 'cdn', cdnMulti);
    return cdnMulti;
  }

});
