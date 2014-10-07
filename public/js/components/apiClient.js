define([
  'jquery'
], function($) {
  "use strict";

  /* @const */
  var DEFAULT_TIMEOUT = 15 * 1000;

  /* @const */
  var JSON_MIME_TYPE = "application/json";

  /* @const */
  var GET_DEFAULTS = {
    timeout: DEFAULT_TIMEOUT,
    dataType: "json"
  };

  /* @const */
  var POST_DEFAULTS = {
    timeout: DEFAULT_TIMEOUT,
    dataType: "json",
    contentType: JSON_MIME_TYPE,
  };


  // If future this should direct clients to api.gitter.im
  function makeFullUrl(url) {
    // XXX: we need to remove /api/ from all calls to apiClient
    if(url.indexOf('/api') === 0) return url;

    return '/api' + url;
  }

  function defaults(options, defaultValues) {
    if(!options) options = {};
    Object.keys(defaultValues).forEach(function(key) {
      if(options[key] === undefined) {
        // Only using a shallow clone for simplicity
        options[key] = defaultValues[key];
      }
    });
    return options;
  }

  // TODO return a proper promise instead of a $.Deferred
  function operation(method, defaultOptions, url, data, options) {
    options = defaults(options, defaultOptions);

    var dataSerialized;
    if(options.contentType === JSON_MIME_TYPE) {
      dataSerialized = JSON.stringify(data);
    } else {
      // JQuery will serialize to form data for us
      dataSerialized = data;
    }

    return $.ajax({
      url: makeFullUrl(url),
      contentType: options.contentType,
      dataType: options.dataType,
      type: method,
      global: options.global,
      data: dataSerialized,
      context: options.context, // NB: deprecated: cant use with real promises
      timeout: options.timeout,
      async: options.async
    });
  }


  return [['get', GET_DEFAULTS], ['post', POST_DEFAULTS], ['patch', POST_DEFAULTS], ['put', POST_DEFAULTS]]
    .reduce(function(memo, descriptor) {
      var method = descriptor[0];
      var defaultOptions = descriptor[1];

      memo[method] = operation.bind(memo, method, defaultOptions);
      return memo;
    }, {});

});
