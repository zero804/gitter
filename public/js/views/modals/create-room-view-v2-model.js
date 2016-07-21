'use strict';

var Backbone = require('backbone');
var roomAvailabilityStatusConstants = require('./room-availability-status-constants');

var CreateRoomViewModel = Backbone.Model.extend({
  defaults: {
    group: null,
    roomName: '',
    associatedGithubProject: null,
    security: 'PUBLIC',
    onlyGithubUsers: false,
    onlyOrgUsers: false,

    // roomAvailabilityStatusConstants
    roomAvailabilityStatus: null
  },

  validate: function() {
    var errors = [];

    var roomName = this.get('roomName') || '';

    var hasRoomName = roomName.length > 0;
    if(!hasRoomName) {
      errors.push({
        key: 'roomName',
        message: 'Please fill in the room name'
      });
    }

    if(this.get('roomAvailabilityStatus') === roomAvailabilityStatusConstants.UNAVAILABLE) {
      errors.push({
        key: 'roomName',
        message: 'That room already exists'
      });
    }
    else if(this.get('roomAvailabilityStatus') === roomAvailabilityStatusConstants.REPO_CONFLICT) {
      errors.push({
        key: 'roomName',
        message: 'You cannot create a channel with a same name that as an already existing repo'
      });
    }
    else if(this.get('roomAvailabilityStatus') === roomAvailabilityStatusConstants.REPO_CONFLICT) {
      errors.push({
        key: 'roomName',
        message: 'Waiting for room name check to respond'
      });
    }

    return errors.length > 0 ? errors : undefined;
  }
});

module.exports = CreateRoomViewModel;
