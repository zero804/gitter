'use strict';

var Promise = require('bluebird');
var $ = require('jquery');
var _ = require('underscore');
var debug = require('debug-proxy')('app:api-client');

/* @const */
var DEFAULT_TIMEOUT = 60 * 1000;

/* @const */
var JSON_MIME_TYPE = 'application/json';

/* @const */
var GET_DEFAULTS = {
  timeout: DEFAULT_TIMEOUT,
  dataType: 'json'
};

/* @const */
var POST_DEFAULTS = {
  timeout: DEFAULT_TIMEOUT,
  dataType: 'json',
  contentType: JSON_MIME_TYPE,
};

function makeError(method, fullUrl, jqXhr, textStatus, errorThrown) {
  var json = jqXhr.responseJSON;
  var friendlyMessage = json && (json.message || json.error);

  var e = new Error(friendlyMessage || errorThrown || textStatus || 'AJAX error');
  e.url = fullUrl;
  e.friendlyMessage = friendlyMessage;
  e.response = json;
  e.method = method;
  e.status = jqXhr.status;
  e.statusText = jqXhr.statusText;
  return e;
}

function Resource(config, urlRoot, baseUrlFn) {
  this._config = config;
  this._urlRoot = urlRoot;
  this._baseUrlFn = baseUrlFn;
}

Resource.prototype = {
  /**
   * GET Method
   */
  get: function(url, data, options) {
    var opts = _.extend({}, GET_DEFAULTS, options);
    return this._execute('get', url, data, opts);
  },

  /**
   * POST Method
   */
  post: function(url, data, options) {
    var opts = _.extend({}, POST_DEFAULTS, options);
    return this._execute('post', url, data, opts);
  },

  /**
   * PATCH Method
   */
  patch: function(url, data, options) {
    var opts = _.extend({}, POST_DEFAULTS, options);
    return this._execute('patch', url, data, opts);
  },

  /**
   * PUT Method
   */
  put: function(url, data, options) {
    var opts = _.extend({}, POST_DEFAULTS, options);

    // If we have no data, unset the contentType
    if(!data) {
      delete opts.contentType;
    }

    return this._execute('put', url, data, opts);
  },

  /**
   * DELETE Method
   */
  delete: function(url, data, options) {
    var opts = _.extend({}, POST_DEFAULTS, options);

    // If we have no data, unset the contentType
    if(!data) {
      delete opts.contentType;
    }

    return this._execute('delete', url, data, opts);
  },

  uri: function(relativeUrl) {
    return this._uriFunction() + relativeUrl;
  },

  url: function(relativeUrl) {
    return this._fullUrlFunction(this.baseUrlFunction, relativeUrl);
  },

  channel: function(relativeUrl) {
    var base = this.baseUrlFn();

    if (relativeUrl) {
      return base + relativeUrl;
    } else {
      return base;
    }
  },

  channelGenerator: function(relativeUrl) {
    return this.channel.bind(this, relativeUrl);
  },

  _resolveFullUrl: function(relativeUrl) {
    return this._urlRoot + this.channel(relativeUrl);
  },

  _execute: function(method, url, data, options) {
      var dataSerialized;
      if(options.contentType === JSON_MIME_TYPE) {
        dataSerialized = JSON.stringify(data);
      } else {
        // JQuery will serialize to form data for us
        dataSerialized = data;
      }

      return this._getAccessToken()
        .bind(this)
        .then(function(accessToken) {

          var promise = new Promise(function(resolve, reject) {
            var headers = {};

            if (accessToken) {
              headers['x-access-token'] = accessToken;
            }

            var fullUrl = this._resolveFullUrl(url);

            debug('%s: %s', method, fullUrl);

            // TODO: drop jquery `ajax`
            $.ajax({
              url: fullUrl,
              contentType: options.contentType,
              dataType: options.dataType,
              type: method,
              global: options.global,
              data: dataSerialized,
              timeout: options.timeout,
              async: options.async,
              headers: headers,
              success: function(data, textStatus, xhr) {
                var status = xhr.status;
                if (status >= 400 && status !== 1223) {

                  var e = new Error(textStatus);
                  e.status = status;
                  return reject(makeError(method, fullUrl, xhr, textStatus, 'HTTP Status ' + status));
                }

                resolve(data);
              },
              error: function(xhr, textStatus, errorThrown) {
                return reject(makeError(method, fullUrl, xhr, textStatus, errorThrown));
              }
            });
          });

          if(options.global) {
            promise.catch(function(err) {
              /* Asyncronously notify */
              this._config.onApiError(err.status, err.statusText, err.method, err.url);
              throw err;
            }.bind(this));
          }

          return promise;
        });
  },

  _getAccessToken: Promise.method(function() {
    return this._config.getAccessToken();
  }),
}

module.exports = Resource;
