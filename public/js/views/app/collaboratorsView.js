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

  var ItemView = Marionette.ItemView.extend({

    modelEvents: {
      "change": "render"
    },

    events: {
      'click .js-add': 'addUserToRoom',
      'click .js-invite': 'inviteUser'
    },

    tagName: 'div',

    className: 'welcome-modal__collaborator',

    template: itemTemplate,

    handleError: function (res, status, message) {
      if (res.responseJSON.status === 409) {
        this.model.set('added', true);
        this.model.set('feedback', 'is already here.');
        return;
      }
      this.$('.js-content').text(message);
    },

    inviteUser: function () {
      var email = this.$('input')[0].value;
      var m = this.model;

      var data = {
        userid: this.user.id,
        email: email,
        roomid: context.getTroupeId()
      };
      this.$('.js-content').text('Loading...');
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
          m.set('added', true);
          m.set('feedback', 'has been invited. ✓');
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

      this.$('.js-content').text('Loading...');

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
            m.set('added', true);
            m.set('feedback', 'was added. ✓');
          } else if (user.invited && user.email) {
            m.set('added', true);
            m.set('feedback', 'has been invited. ✓');
          } else {
            m.set('added', false);
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
