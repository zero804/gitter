"use strict";

var Marionette = require('backbone.marionette');
var template = require('./tmpl/join-room-view.hbs');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var urlParse = require('url-parse');
var frameUtils = require('utils/frame-utils');
var userCanJoinRoom = require('gitter-web-shared/rooms/user-can-join-room');
var makeRoomProviderSentence = require('gitter-web-shared/rooms/make-room-provider-sentence');

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

    var isEmbedded = false;
    var roomPostOptions = {
      id: context.getTroupeId()
    };

    if(frameUtils.hasParentFrameSameOrigin()) {
      var parsed = urlParse(window.parent.location.href, true);
      roomPostOptions.source = parsed.query.source;
    }
    else {
      isEmbedded = true;
      roomPostOptions.source = '~embed';
    }

    //If the room has a welcome message
    //and we aren't in an embedded frame
    //get outta here and let the browser do its thing
    if(context.roomHasWelcomeMessage() && !isEmbedded) {
      return;
    }

    //Event cancelation
    if (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }

    return apiClient.user
      .post('/rooms', roomPostOptions)
      .then(function(body) {
        context.setTroupe(body);
      });
  },

  serializeData: function() {
    var userProviders = context.user().get('providers');
    var troupeProviders = context.troupe().get('providers');
    return {
      allowJoin: userCanJoinRoom(userProviders, troupeProviders),
      disallowJoinReason: makeRoomProviderSentence(troupeProviders),
    }
  }

});

module.exports = JoinRoomView;
