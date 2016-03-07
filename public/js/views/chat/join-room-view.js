"use strict";

var Marionette = require('backbone.marionette');
var template = require('./tmpl/join-room-view.hbs');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var urlParse = require('url-parse');
var frameUtils = require('utils/frame-utils');

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


    var roomPostOptions = {
      id: context.getTroupeId()
    };

    if(frameUtils.hasParentFrameSameOrigin()) {
      var parsed = urlParse(window.parent.location.href, true);
      roomPostOptions.source = parsed.query.source;
    }
    else {
      roomPostOptions.source = '~embed';
    }

    return apiClient.user
      .post('/rooms', roomPostOptions)
      .then(function(body) {
        context.setTroupe(body);
      });
  }

});

module.exports = JoinRoomView;
