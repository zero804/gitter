define([
  'jquery',
  'marionette',
  'utils/context',
  'utils/social',
  'hbs!./tmpl/collaboratorsView',
  'hbs!./tmpl/collaboratorsItemView',
  'hbs!./tmpl/collaboratorsEmptyView',
  'hbs!./tmpl/inviteOutcomeTemplate',
  'utils/appevents',
], function($, Marionette, context, social, template, itemTemplate, emptyViewTemplate, inviteOutcomeTemplate, appEvents) {
  "use strict";

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

    handleError: function (res, status, message) {
      if (res.responseJSON.status === 409) return this.done('already in room.');
      this.done(message, '');
    },

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
      e.preventDefault();

      var inputEmail = this.$('input')[0];
      var email = inputEmail.value;

      var data = {
        userid: this.user.id,
        email: email,
        roomid: context.getTroupeId()
      };

      this.toggleLoading();

      $.ajax({
        url: '/api/private/invite-user',
        contentType: "application/json",
        dataType: "json",
        type: "POST",
        data: JSON.stringify(data),
        context: this,
        timeout: 45 * 1000,
        error: this.handleError,
        success: function () {
          this.done('was invited.', email);
        }
      });
    },

    /**
     * addUserToRoom() sends request and handles reponse of adding an user to a room
     *
     * m    BackboneModel - the user to be added to the room
     */
    addUserToRoom: function (e) {
      e.stopPropagation();
      e.preventDefault();

      var m = this.model;

      appEvents.triggerParent('track-event', 'welcome-add-user-click');

      this.toggleLoading();

      $.ajax({
        url: '/api/v1/rooms/' + context.getTroupeId()  + '/users',
        contentType: "application/json",
        dataType: "json",
        type: "POST",
        data: JSON.stringify({ username: m.get('login') }),
        context: this,
        timeout: 45 * 1000,
        error: this.handleError,
        success: function (res) {
          var user = res.user;
          this.user = user;

          if (!user.invited) {
            this.done('was added.');
          } else if (user.invited && user.email) {
            this.done('was invited.', user.email);
          } else {
            this.toggleLoading(); // stop loading
            m.set('unreachable', true);
          }
        }
      });
    },
  });

  var EmptyView = Marionette.ItemView.extend({
    template: emptyViewTemplate,
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

    itemViewContainer: '.js-container',
    itemView: ItemView,
    emptyView: EmptyView,

    itemViewOptions: function() {
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
});
