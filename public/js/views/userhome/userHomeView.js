"use strict";
var $ = require('jquery');
var Marionette = require('marionette');
var backbone = require('backbone');
var moment = require('moment');
var context = require('utils/context');
var troupeCollections = require('collections/instances/troupes');
var userHomeTemplate = require('./tmpl/userHomeTemplate.hbs');
var userHomeEmptyOrgViewTemplate = require('./tmpl/userHomeEmptyOrgView.hbs');
var OrgCollectionView = require('./homeOrgCollectionView');
var SuggestedCollectionView = require('./suggested-room-collection-view');
var isMobile = require('utils/is-mobile');
var isNative = require('utils/is-native');
var appEvents = require('utils/appevents');

module.exports = (function() {


  var suggestedRoomCollection = new backbone.Collection();
  suggestedRoomCollection.url = '/v1/user/' + context.getUserId() + '/rooms?suggested=1';
  suggestedRoomCollection.fetch();

  return Marionette.Layout.extend({
    template: userHomeTemplate,
    tagName: 'div',

    events: {
      'click #upgrade-auth': 'onUpgradeAuthClick',
    },

    regions: {
      orgs: "#org-list",
      suggestedRooms: "#suggested-room-list"
    },

    onRender: function() {
      $('#header-wrapper').hide();
      this.orgs.show(new OrgCollectionView({
        collection: troupeCollections.orgs
      }));
      this.suggestedRooms.show(new SuggestedCollectionView({ collection: suggestedRoomCollection }));
    },

    getUserTimestamp: function(id) {
      return new Date(parseInt(id.toString().slice(0,8), 16)*1000);
    },

    serializeData: function() {

      var user = context.getUser();
      var hasPrivateRepoScope = !!user.scopes.private_repo;
      var prettyWelcome = (parseInt(user.id.slice(-1), 16) % 2) === 0;

      // manual override
      if (window.location.hash.match(/pretty/)) {
        prettyWelcome = true;
      }

      if (window.location.hash.match(/personality/)) {
        prettyWelcome = false;
      }

      return {
        showUpgradeAuthLink: !isMobile() && !hasPrivateRepoScope,
        prettyWelcome: !isMobile() && !isNative() && prettyWelcome
      };
    },

    onUpgradeAuthClick: function(e) {
      var target = e.target.href;

      window.addEventListener("message", function(event) {
        if(event.data === 'oauth_upgrade_complete') {
          window.location.reload(true);
        }
      }, false);

      window.open(target);
      e.preventDefault();
    }

  });


})();

