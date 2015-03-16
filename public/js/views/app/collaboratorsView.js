"use strict";
var $ = require('jquery');
var Marionette = require('marionette');
var context = require('utils/context');
var social = require('utils/social');
var apiClient = require('components/apiClient');
var template = require('./tmpl/collaboratorsView.hbs');
var itemTemplate = require('./tmpl/collaboratorsItemView.hbs');
var emptyViewTemplate = require('./tmpl/collaboratorsEmptyView.hbs');
var inviteOutcomeTemplate = require('./tmpl/inviteOutcomeTemplate.hbs');
var appEvents = require('utils/appevents');

module.exports = (function() {


  var ItemView = Marionette.ItemView.extend({

    modelEvents: {
      "change": "render"
    },

    events: {
      'submit form': 'inviteUser',
      'click .js-add': 'addUserToRoom',
    },

    tagName: 'div',

    className: 'welcome-modal__collaborator',

    template: itemTemplate,

    toggleLoading: function () {
      var model = this.model;
      var isLoading = model.get('loading');
      model.set('loading', !isLoading);
    },

    done: function (feedback, email) {
      var m = this.model;
      this.toggleLoading();
      m.set('done', true);
      m.set('name', email || m.get('login'));
      m.set('feedback', feedback);
    },

    inviteUser: function (e) {
      var self = this;
      e.preventDefault();

      var inputEmail = self.$('input')[0];
      var email = inputEmail.value;

      var data = {
        userId: self.user.id,
        email: email,
        roomId: context.getTroupeId()
      };

      self.toggleLoading();

      apiClient.priv.post('/invite-user', data)
        .then(function(){
          self.done('was invited.', email);
        });
    },

    /**
     * addUserToRoom() sends request and handles reponse of adding an user to a room
     *
     * m    BackboneModel - the user to be added to the room
     */
    addUserToRoom: function (e) {
      var self = this;
      e.stopPropagation();
      e.preventDefault();

      var m = this.model;

      appEvents.triggerParent('track-event', 'welcome-add-user-click');

      this.toggleLoading();

      apiClient.room.post('/users', { username: m.get('login') })
        .then(function(res) {
          var user = res.user;
          self.user = user;

          if (!user.invited) {
            self.done('was added.');
          } else if (user.invited && user.email) {
            self.done('was invited.', user.email);
          } else {
            self.toggleLoading(); // stop loading
            m.set('unreachable', true);
          }
        })
        .fail(function(xhr) {
          if (xhr.status === 409) return self.done('already in room.');
          self.done("Unable to add user to room.", '');
        });
    },
  });

  var EmptyView = Marionette.ItemView.extend({
    template: emptyViewTemplate,
    className: 'welcome-modal__no-suggestions',
    initialize: function(options) {
      this.model.set("security", options.security);
      this.model.set("githubType", options.githubType);
      this.model.set("url", options.url);
    },
    serializeData: function() {
      var data = this.model.toJSON();
      if (data.githubType === 'ORG') {
        data.showOrgMessage = true;
      }
      if (data.githubType == 'ORG_CHANNEL') {
        if (data.security == 'INHERITED') {
          data.showOrgMessage = true;
        }
      }
      if (data.security == 'PUBLIC') {
        data.isPublic = true;
      }

      return data;
    }
  });

  var View = Marionette.CompositeView.extend({

    childViewContainer: '.js-container',
    itemView: ItemView,
    emptyView: EmptyView,

    childViewOptions: function() {
      if (!this.collection.length) {
        return {
          githubType: context.troupe().get('githubType'),
          security: context.troupe().get('security'),
          url: context.troupe().get('url')
        };
      }
    },

    template: template,

    serializeData: function() {
      return {
        isPublic: context.troupe().get('security') === 'PUBLIC',
        twitterLink: social.generateTwitterShareUrl(),
        facebookLink: social.generateFacebookShareUrl()
      };
    },

    initialize: function() {
      var ctx = context();
      appEvents.triggerParent('track-event', 'welcome-add-user-suggestions', {
        uri: ctx.troupe.uri,
        security: ctx.troupe.security,
        count: this.collection.length
      });
    },

    //onRender: function() {
    //  if (context.troupe().get('security') == 'PUBLIC') this.$el.find('.js-share-button').show();
    //},

    events: {
      'click .js-close': 'dismiss',
      'click #add-button' : 'clickAddButton',
      'click #share-button' : 'clickShareButton',
    },

    clickAddButton: function() {
      appEvents.triggerParent('track-event', 'welcome-search-clicked');
      window.location.href = "#add";
    },


    clickShareButton: function() {
      window.location.href = "#share";
    },

    dismiss: function() {
      this.remove();
    }
  });

  return View;

})();

