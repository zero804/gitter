'use strict';

var Marionette = require('backbone.marionette');
var appEvents = require('utils/appevents');
var onready = require('utils/onready');
var toggleClass = require('utils/toggle-class');
var CommunityCreateView = require('views/community-create/community-create-view');

require('utils/tracking');
require('utils/frame-utils');



onready(function() {
  var communityCreateView = new CommunityCreateView({
    el: '.community-create-root'
  });
  communityCreateView.render();
});
