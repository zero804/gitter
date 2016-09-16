'use strict';
/**
 * API Client
 *
 * This is a basic API client for communicating with the Gitter server.
 *
 * Basic Use
 * ------------
 *
 * The basic form of requests is:
 * apiClient.operation(url, data, options) -> $.Deferrer
 *
 * apiClient.get('/v1/eyeballs', data, options)
 * apiClient.post('/v1/eyeballs', data, options)
 * apiClient.put('/v1/eyeballs', data, options)
 * apiClient.patch('/v1/eyeballs', data, options)
 * apiClient.delete('/v1/eyeballs', data, options)
 *
 * Note that you should not include /api/ in your URL.
 *
 * Advanced usage
 * ---------------
 * apiClient.user.post('/collapsedItems', data, options)
 * apiClient.user.delete('/collapsedItems', data, options)
 *
 * These operations will use the current user resource as their root,
 *
 * The sub-resources available are:
 *
 * Sub Resource       | Root Resource
 * apiClient.user     | /v1/user/:userId
 * apiClient.userRoom | /v1/rooms/:roomId/user/:userId
 * apiClient.room     | /v1/rooms/:roomId
 *
 * Example
 * -------
 * Send a message to the current room:
 *
 * apiClient.room.post('/chatMessages', { text: 'hello from api client' })
 *   .then(function(response) {
 *     window.alert('I did a post.');
 *   })
 *   .catch(function(err) {
 *     window.alert('I am a failure: ' + err.status);
 *   })
 */
var _ = require('underscore');
var Resource = require('./resource');

var CONFIG_DEFAULTS = {
  baseUrl: '',
  getAccessToken: function() { return ''; },
  getUserId: function() { return ''; },
  getTroupeId: function() { return ''; },
  onApiError: function() {}
};


function Client(config) {
  config = _.extend({}, CONFIG_DEFAULTS, config);
  var apiBasePath = config.baseUrl;

  var base = this.base = new Resource(config);

  // Prune public methods from base onto the client
  // to maintain backwards compatibility
  Object.keys(base).forEach(function(key) {
    if (key.indexOf('_') === 0) return;
    var v = base[key];
    if (typeof v !== 'function') return;
    this[key] = v.bind(base);
  }, this)

  /* /v1/user/:currentUserId/ */
  this.user = new Resource(config, apiBasePath, function() {
    return '/v1/user/' + this.config.getUserId();
  });

  /* /v1/rooms/:currentRoomId/ */
  this.room = new Resource(config, apiBasePath, function() {
    return '/v1/rooms/' + this.config.getTroupeId();
  });

  /* /v1/user/:currentUserId/rooms/:currentRoomId/ */
  this.userRoom = new Resource(config, apiBasePath, function() {
    return '/v1/user/' + this.config.getUserId() + '/rooms/' + this.config.getTroupeId();
  });

  /* /private */
  this.priv = new Resource(config, apiBasePath, function() {
    return '/private';
  });

  // The Web resource doesn't use the basepath
  this.web = new Resource(config, '', function() {
    return '';
  });
}

module.exports = function(config) {
  return new Client(config);
}
