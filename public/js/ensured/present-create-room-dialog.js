'use strict';

const debug = require('debug-proxy')('app:present-room-create-dialog');
const appEvents = require('../utils/appevents');
//var context = require('gitter-web-client-context');

function presentCreateRoomDialog(/*options*/) {
  debug('Starting');

  require.ensure(['../vue/create-room', '../vue/store/store-instance'], function(require) {
    debug('Dependencies loaded');
    const store = require('../vue/store/store-instance');
    const renderCreateRoomView = require('../vue/create-room').default;

    // Create an element for our create room flow to render into
    document.body.insertAdjacentHTML('beforeend', '<div class="js-create-room-view-root"></div>');

    const createRoomViewRootEl = document.querySelector('.js-create-room-view-root');
    if (!createRoomViewRootEl) {
      throw new Error('Root element does not exist in DOM for the create room flow');
    }

    store.dispatch('createRoom/fetchInitial');
    const vm = renderCreateRoomView(createRoomViewRootEl, store);
    debug('Rendered', vm);

    appEvents.once('destroy-create-room-view', () => {
      debug('destroy-create-room-view', vm);

      // Destroy the vue listeners, etc
      vm.$destroy();
      // Remove the element from the DOM
      vm.$el.parentNode.removeChild(vm.$el);

      // Change the URL back to `#`
      appEvents.trigger('route', '');
    });
  });

  /* * /
  var roomCollection = options.roomCollection;
  var dialogRegion = options.dialogRegion;
  var roomMenuModel = options.roomMenuModel;
  var initialRoomName = options.initialRoomName;

  require.ensure(
    [
      '../models/create-room-view-model',
      '../collections/groups',
      '../collections/repos',
      '../views/modals/create-room-view'
    ],
    function(require) {
      var CreateRoomModel = require('../models/create-room-view-model');
      var groupModels = require('../collections/groups');
      var repoModels = require('../collections/repos');
      var createRoomView = require('../views/modals/create-room-view');

      var RepoCollection = repoModels.ReposCollection;
      var repoCollection = new RepoCollection();
      repoCollection.fetch({
        data: {
          type: 'admin'
        }
      });

      function getSuitableGroupId() {
        if (roomMenuModel) {
          var menuBarGroup = roomMenuModel.getCurrentGroup();

          if (menuBarGroup) {
            return menuBarGroup.get('id');
          }
        }

        var slimCurrentTroupe = context.troupe();
        var currentTroupe = roomCollection.get(slimCurrentTroupe.get('id'));

        if (currentTroupe) {
          return currentTroupe.get('groupId');
        }

        // Last ditch effort, perhaps they are visiting a room they haven't joined
        // on page load and we can see the full troupe
        return slimCurrentTroupe.get('groupId');
      }

      var adminGroupsCollection = new groupModels.Collection();

      adminGroupsCollection
        .fetch({ add: true, remove: true, reset: true, data: { type: 'admin' } })
        .then(function() {
          console.log('adminGroupsCollection fetch done');
          if (adminGroupsCollection.length === 0) {
            window.location.hash = '#createcommunity';
            return;
          }
        });

      var modal = new createRoomView.Modal({
        model: new CreateRoomModel(),
        initialGroupId: getSuitableGroupId(),
        initialRoomName: initialRoomName,
        groupsCollection: adminGroupsCollection,
        roomCollection: roomCollection,
        repoCollection: repoCollection
      });

      dialogRegion.show(modal);
    }
  );
    /* */
}

module.exports = presentCreateRoomDialog;
