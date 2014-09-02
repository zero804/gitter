define([
  'jquery',
  'marionette',
  'utils/context',
  'utils/mailto-gen',
  'hbs!./tmpl/collaboratorsView',
  'hbs!./tmpl/collaboratorsItemView',
  'hbs!./tmpl/collaboratorsEmptyView',
  'utils/appevents',
], function($, Marionette, context, mailto, template, itemTemplate, emptyViewTemplate, appEvents) {
  "use strict";

  var ItemView = Marionette.ItemView.extend({
    modelEvents: {
      "change": "render"
    },
    events: {
      'click .add': 'addUserToRoom'
    },
    template: itemTemplate,
    tagName: 'li',

    /*
     * computeFeedback() produces feedback for the action of adding a user to a room
     *
     * user    Object - user object in which the logic is applied to
     * returns Object - contans the outcome `class` and the message to be displayed on the current item.
     */
    computeFeedback: function (user) {
      var fb = {
        outcome: null,
        message: null,
        action: { href: null, text: null }
      };

      if (!user.invited) {
        fb.outcome = 'added';
        fb.message = 'was added.';
      } else if (user.invited && user.email) {
        fb.outcome = 'invited';
        fb.message = 'has been invited to Gitter.';
      } else {
        fb.outcome = 'unreachable';
        fb.message = 'has no public email.';
        var email = mailto.el({
          subject: 'Gitter Invite',
          body: this.strTemplate('Hi {{user}}, I\'ve added you to a room on Gitter. Join me! {{base}}{{roomUrl}}', { user: user.username, base: context.env('basePath'), roomUrl: context.troupe().get('url') })
        });
        fb.action.href = email.href;
        fb.action.text = 'Invite.';
      }

      return fb;
    },

    strTemplate: function (str, o) {
      return str.replace(/{{([a-z_$]+)}}/gi, function (m, k) {
          return (typeof o[k] !== 'undefined' ? o[k] : '');
      });
    },

    handleError: function (res, status, message) {
      //var json = res.responseJSON;
      //this.ui.loading.toggleClass('hide');
      //this.showValidationMessage((json) ? json.error : res.status + ': ' + res.statusText);
      //this.typeahead.clear();
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

      this.$('.add').hide();

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
          //this.ui.loading.toggleClass('hide');
          var feedback = this.computeFeedback(res.user);
          if (res.user.email) m.set('email', res.user.email);
          m.set({
            message: feedback.message,
            outcome: feedback.outcome,
            action: feedback.action,
            timeAdded: Date.now(),
            added: true
          });
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
      return {
        public: context.troupe().get('security') === 'PUBLIC',
        twitterLink: this.generateTwitterLink()
      };
    },

    generateTwitterLink: function() {
      var text = escape('Just created a room on Gitter for ' + context.troupe().get('uri') + ':');
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
      'click .js-badge': 'createBadge'
    },

    createBadge: function() {
      var btn = this.$el.find('.js-badge')[0];
      var st = this.$el.find('.pr-status');
      st.html('Hold on...');
      btn.disabled = true;

      $.ajax({
        url: '/api/private/create-badge',
        contentType: "application/json",
        dataType: "json",
        type: "POST",
        data: JSON.stringify({ 
          uri: context.troupe().get('uri')
        }),
        context: this,
        timeout: 45 * 1000,
        error: function() {
          st.html('Oops, something went wront. Try again. (Is there a README.md in your project?)');
          btn.disabled = false;
        },
        success: function (res) {
          st.html('We just created a PR for you! <a href=' + res.html_url + ' target="_blank">Review and merge &rarr;</a>');
        }
      });
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
