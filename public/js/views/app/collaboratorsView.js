"use strict";

var Marionette = require('backbone.marionette');
var Backbone = require('backbone');
var context = require('utils/context');
var social = require('utils/social');
var apiClient = require('components/apiClient');
var template = require('./tmpl/collaboratorsView.hbs');
var itemTemplate = require('./tmpl/collaboratorsItemView.hbs');
var emptyViewTemplate = require('./tmpl/collaboratorsEmptyView.hbs');
var appEvents = require('utils/appevents');
var collaboratorsModels = require('collections/collaborators');

module.exports = (function() {

  var ItemView = Marionette.ItemView.extend({

    events: {
      'submit form': 'inviteUser',
      'click .js-add': 'addUser',
    },

    className: 'welcome-modal__collaborator',

    template: itemTemplate,

    initialize: function(options) {
      this.userModel = options.model;
      this.stateModel = new Backbone.Model({
        state: 'initial',
        emailRequiredUserId: null
      });

      this.listenTo(this.userModel, 'change', this.render);
      this.listenTo(this.stateModel, 'change', this.render);
    },

    inviteUser: function() {
      var self = this;

      var data = {
        userId: this.stateModel.get('emailRequiredUserId'),
        email: this.$el.find('.js-invite-email').val(),
        roomId: context.getTroupeId()
      };

      this.stateModel.set('state', 'inviting');

      apiClient.priv.post('/invite-user', data)
        .then(function() {
          self.stateModel.set('state', 'invited');
        })
        .fail(function() {
          self.stateModel.set('state', 'fail');
        });

      // stop the page reloading
      return false;
    },

    addUser: function() {
      var self = this;

      var githubUser = this.userModel;

      appEvents.triggerParent('track-event', 'welcome-add-user-click');

      this.stateModel.set('state', 'adding');
      apiClient.room.post('/users', { username: githubUser.get('login') })
        .then(function(res) {
          var user = res.user;

          if (!user.invited) {
            self.stateModel.set('state', 'added');
          } else if (user.invited && user.email) {
            self.stateModel.set('state', 'invited');
          } else {
            self.stateModel.set({
              emailRequiredUserId: user.id,
              state: 'email_address_required'
            });
          }
        })
        .fail(function(xhr) {
          if (xhr.status === 402) {
            // money required, let the add modal explain it.
            window.location.href = '#add';

            // reset the state so the user can try again after paying.
            self.stateModel.set('state', 'initial');
          } else if (xhr.status === 409) {
            self.stateModel.set('state', 'fail_409');
          } else {
            self.stateModel.set('state', 'fail');
          }
        });
    },

    serializeData: function() {
      var state = this.stateModel.get('state');
      var username = this.userModel.get('login');

      var states = {
        initial: { text: username, showAddButton: true },
        adding: { text: 'Adding…' },
        added: { text: username + ' added' },
        invited: { text: username + ' invited' },
        fail: { text: 'Unable to add ' + username },
        fail_409: { text: 'Unable to add person already in room' },
        email_address_required: { text: 'Enter ' + username + "'s email", showEmailForm: true },
        inviting: { text: 'Inviting…' }
      };

      var data = states[state] || states.initial;
      data.avatar_url = this.userModel.get('avatar_url');

      return data;
    }
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
    childView: ItemView,
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

    constructor: function (){
      //instantiate our collection
      this.collection = new collaboratorsModels.CollabCollection();
      //if we should fetch data we should
      if(this.shouldFetch()) {
        //If we render initially we will get a flash of the empty view
        //to avoid that we set hasGotData to signify that we have not yet received any data
        this.collection.fetch();
        this.hasGotSomeData = false;
      }
      //if we don't need to get some data we should reset the catch
      else this.hasGotSomeData = true;
      this.listenTo(this.collection, 'sync', function(){
        //once we get some data we set it to true so we can
        //once again render
        this.hasGotSomeData = true;
        //and call a manual render
        this.render();
      }, this);

      //call super()
      Marionette.CompositeView.prototype.constructor.apply(this, arguments);
    },

    initialize: function(attrs) {
      var ctx = context();
      appEvents.triggerParent('track-event', 'welcome-add-user-suggestions', {
        uri: ctx.troupe.uri,
        security: ctx.troupe.security,
        count: this.collection.length
      });

      //listen to room changes so we can refresh the collection
      this.listenTo(context.troupe(), 'change:id', this.onRoomChange, this);
    },

    events: {
      'click .js-close': 'dismiss',
      'click #add-button' : 'clickAddButton',
      'click #share-button' : 'clickShareButton',
    },

    //when a room changes refresh the collection
    onRoomChange: function (model){
      //hide the view so we don't see collaborators from previous rooms
      this.$el.hide();
      //fetch if we need to
      if(this.shouldFetch()) return this.collection.fetch();
      //render if we do not
      this.render();
    },

    serializeData: function() {
      return {
        isPublic: context.troupe().get('security') === 'PUBLIC',
        twitterLink: social.generateTwitterShareUrl(),
        facebookLink: social.generateFacebookShareUrl()
      };
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
    },

    shouldFetch: function (){
      var roomModel = context.troupe();
      var roomType  = roomModel.get('githubType');
      var userCount = roomModel.get('userCount');

      //don't fetch for one-to-one rooms
      if(roomType === 'ONETOONE') return false;
      //don't fetch if the user is not an admin
      if(!context.isTroupeAdmin()) return false;
      //don't fetch if we have more than one user
      if(userCount > 1) return false;
      //if all else fails fetch some data
      return true;
    },

    shouldRender: function (){
      //if we should fetch data && have have previously
      //in the app life cycle had some data
      if(this.shouldFetch() && this.hasGotSomeData) return true;
    },

    render: function (){
      if(!this.shouldRender()) {
        this.$el.hide();
        return this;
      }
      else {
        Marionette.CompositeView.prototype.render.apply(this, arguments);
        this.$el.show();
      }
      return this;
    }

  });

  return View;

})();
