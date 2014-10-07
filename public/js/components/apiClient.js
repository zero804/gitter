define([
  'jquery'
], function($) {
  "use strict";

  /* @const */
  var DEFAULT_TIMEOUT = 15 * 1000;

  // If future this should direct clients to api.gitter.im
  function makeFullUrl(url) {
    // XXX: we need to remove /api/ from all calls to apiClient
    if(url.indexOf('/api')) return url;

    return '/api' + url;
  }

  // TODO return a proper promise instead of a $.Deferred
  function operation(method, url, data, options) {
    if(!options) options = {};

    var dataSerialized = method === 'get' ? data : JSON.stringify(data);

    return $.ajax({
      url: makeFullUrl(url),
      contentType: method === 'get' ? undefined : "application/json",
      dataType: "json",
      type: method,
      global: options.global === undefined ? true : options.global,
      data: dataSerialized,
      context: options.context,
      timeout: options.timeout || DEFAULT_TIMEOUT
    });
  }

  return ['get', 'post', 'patch', 'put'].reduce(function(memo, method) {
    memo[method] = operation.bind(memo, method);
    return memo;
  }, {});

});
