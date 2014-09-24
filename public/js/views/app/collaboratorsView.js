define([
  'jquery',
  'marionette',
  'utils/context',
  'utils/mailto-gen',
  'hbs!./tmpl/collaboratorsView',
  'hbs!./tmpl/collaboratorsItemView',
  'hbs!./tmpl/collaboratorsEmptyView',
  'hbs!./tmpl/inviteOutcomeTemplate',
  'utils/appevents',
], function($, Marionette, context, mailto, template, itemTemplate, emptyViewTemplate, inviteOutcomeTemplate, appEvents) {
  "use strict";

  var InviteOutcomeView = Marionette.ItemView.extend({
    template: inviteOutcomeTemplate,
    tagName: 'span',
    initialize: function(options) {
      this.model  = options.model;
      this.user   = options.user;
    },
    events: {
      'click .js-invite': 'inviteUser'
    },
    inviteUser: function() {
      var self = this;
      this.$('.js-invite').hide();
      var email = this.$('input')[0].value;

      var data = {
        userid: this.user.id,
        email: email,
        roomid: context.getTroupeId()
      };

      $.ajax({
        url: '/api/private/invite-user',
        contentType: "application/json",
        dataType: "json",
        type: "POST",
        data: JSON.stringify(data),
        context: this,
        timeout: 45 * 1000,
        error: function() {
        },
        success: function () {
          self.user.invited = true;
          self.user.email = email;
          self.render();
        }
      });
    },
    serializeData: function() {
      var user = this.user;
      var data = {};
      data.login = user.username;

      if (!user.invited) {
        data.added = true;
      } else if (user.invited && user.email) {
        data.invited = true;
      } else {
        data.unreachable = true;
      }

      return data;
    },

  });

  var ItemView = Marionette.ItemView.extend({
    modelEvents: {
      "change": "render"
    },
    events: {
      'click .js-add': 'addUserToRoom'
    },
    template: itemTemplate,
    tagName: 'li',


    handleError: function (res, status, message) {
    },

    /**
     * addUserToRoom() sends request and handles reponse of adding an user to a room
     *
     * m    BackboneModel - the user to be added to the room
     */
    addUserToRoom: function (e) {
      e.stopPropagation();
      e.preventDefault();

      appEvents.triggerParent('track-event', 'welcome-add-user-click');

      this.$('.js-add').hide();
      var self = this;

      var m = this.model;

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
          var view = new InviteOutcomeView({user: res.user, model: m});
          self.$('.outcome').html(view.render().el);
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
    itemViewContainer: '#list',
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
      var _public = context.troupe().get('security') === 'PUBLIC';
      var _repo   = context.troupe().get('githubType') === 'REPO';

      return {
        shareable: _public && _repo,
        twitterLink: this.generateTwitterLink()
      };
    },

    generateTwitterLink: function() {
      var text = escape('Join the chat room on Gitter for ' + context.troupe().get('uri') + ':');
      var url = 'https://twitter.com/share?' +
        'text=' + text +
        '&url=https://gitter.im/' + context.troupe().get('uri') +
        '&related=gitchat' +
        '&via=gitchat';

      return url;
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
      window.location.href = "#inv";
    },

    dismiss: function() {
      this.remove();
    }
  });

  return View;
});
