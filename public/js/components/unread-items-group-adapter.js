"use strict";

var raf = require('utils/raf')

/**
 * Copies unread-item info from the troupes collection onto the groups collection
 */
function unreadItemsGroupAdapter(groupCollection, troupesCollection) {

  var groupIndex;

  var workQueue = null;

  /**
   * Given a groupId, returns the model update that should occur to
   * make the group reflect the unread item status of all the rooms
   * in that group
   */
  function getModelUpdateForGroup(groupId) {
    var troupeIds = groupIndex[groupId];
    var hasActivity = false;
    var hasUnread = false;

    for (var i = 0; i < troupeIds.length; i++) {
      var troupeId = troupeIds[i];
      var troupe = troupesCollection.get(troupeId);
      if (!troupe) continue;

      if (troupe.attributes.mentions) {
        // Immediate shortcut
        return { mentions: true, unreadItems: false, activity: false };
      }

      if (troupe.attributes.unreadItems) {
        hasUnread = true;
      } else {
        if (troupe.attributes.activity) {
          hasActivity = true;
        }
      }
    }

    if (hasUnread) {
      return { mentions: false, unreadItems: true, activity: false };
    }

    if (hasActivity) {
      return { mentions: false, unreadItems: false, activity: true };
    }

    return { mentions: false, unreadItems: false, activity: false };
  }

  /**
   * Updates a group to make it reflect the status of its rooms
   */
  function updateGroup(groupId) {
    var group = groupCollection.get(groupId);
    if (!group) return;
    var update = getModelUpdateForGroup(groupId);
    group.set(update);
  }

  /**
   * Asynchronously updates a bunch of groups, once per set of updates
   */
  function executeGroupUpdates() {
    if (!workQueue) return;
    var groupIds = Object.keys(workQueue);
    workQueue = null;

    groupIds.forEach(function(groupId) {
      updateGroup(groupId);
    });
  }

  /**
   * Queues a group for being updated, in future
   */
  function queueGroupUpdate(groupId) {
    if (!groupId) return;
    if (!workQueue) {
      workQueue = { }
      raf(executeGroupUpdates);
    }
    workQueue[groupId] = true;
  }

  /**
   * Index management: Add a troupe to the group index
   */
  function addIndex(troupeId, groupId) {
    if (!groupId) return;

    if (groupIndex[groupId]) {
      groupIndex[groupId].push(troupeId);
    } else {
      groupIndex[groupId] = [troupeId];
    }
  }

  /**
   * Index management: Remove a troupe from the group index
   */
  function removeIndex(troupeId, groupId) {
    if (!groupId) return;

    if (groupIndex[groupId]) {
      var without = groupIndex[groupId].filter(function(id) { return id !== troupeId });
      if (without.length) {
        groupIndex[groupId] = without;
      } else {
        delete groupIndex[groupId];
      }
    }
  }

  /**
   * Event handler for a new room being added to the troupe collection
   */
  function onTroupeAdd(troupe) {
    var troupeId = troupe.id;
    var groupId = troupe.attributes.groupId;
    if (groupId) {
      addIndex(troupeId, groupId);
      queueGroupUpdate(groupId);
    }
  }

  /**
   * Event handler for a room being removed from the troupe collection
   */
  function onTroupeRemove(troupe) {
    var troupeId = troupe.id;
    var groupId = troupe.attributes.groupId;
    if (groupId) {
      removeIndex(troupeId, groupId);
      queueGroupUpdate(groupId);
    }
  }

  /**
   * Event handler for the troupe collection reset. Rebuilds the index
   */
  function onTroupeReset() {
    groupIndex = {};

    troupesCollection.forEach(function(troupe) {
      onTroupeAdd(troupe);
    });
  }

  /**
   * Event handler for a room changing groups.
   */
  function onTroupeGroupChange(troupe) {
    var troupeId = troupe.id;
    var newGroupId = troupe.get('groupId');
    var oldGroupId = troupe.previous('groupId');

    if (oldGroupId) {
      removeIndex(troupeId, oldGroupId);
      queueGroupUpdate(oldGroupId);
    }

    if (newGroupId) {
      addIndex(troupeId, newGroupId);
      queueGroupUpdate(newGroupId);
    }
  }

  /**
   * Event handler for the unread item count/mentions/activity changing in a room
   */
  function onModelChange(troupe) {
    var groupId = troupe.attributes.groupId;

    if (groupId) {
      queueGroupUpdate(groupId);
    }
  }

  // Setup the index for the first time
  onTroupeReset();

  // Install event handlers on the troupes collection
  troupesCollection.on('add', onTroupeAdd);
  troupesCollection.on('remove', onTroupeRemove);
  troupesCollection.on('reset', onTroupeReset);

  troupesCollection.on('change:groupId', onTroupeGroupChange);
  troupesCollection.on('change:activity', onModelChange);
  troupesCollection.on('change:unreadItems', onModelChange);
  troupesCollection.on('change:mentions', onModelChange);
}

module.exports = unreadItemsGroupAdapter;
