"use strict";

var Marionette = require('backbone.marionette');
var template = require('./tmpl/join-room-view.hbs');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var urlParse = require('url-parse');

var JoinRoomView = Marionette.ItemView.extend({
  template: template,

  attributes: {
    class: 'chat-input__box',
    name: 'chat'
  },

  ui: {
    joinRoom: '.js-join-room'
  },

  events: {
    'click @ui.joinRoom': 'joinRoom'
  },

  joinRoom: function(e) {
    if (e) e.preventDefault();

    var parsed = urlParse(window.top.location.href, true);

    return apiClient.user.post('/rooms', {
      id: context.getTroupeId(),
      source: parsed.query.source
    })
      .then(function(body) {
        context.setTroupe(body);
      });
  }

});

module.exports = JoinRoomView;
