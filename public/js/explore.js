"use strict";
var $ = require('jquery');
var appEvents = require('utils/appevents');
var onready = require('utils/onready');
var toggleClass = require('utils/toggle-class');
var toggleAttribute = require('utils/toggle-attribute');

require('utils/tracking');
require('utils/frame-utils');

require('gitter-styleguide/css/components/buttons.css');
require('gitter-styleguide/css/components/headings.css');



onready(function() {


  Array.prototype.forEach.call(document.querySelectorAll('.js-explore-room-card'), function(roomItemElement) {
    roomItemElement.addEventListener('click', function() {
      // Tracking
      appEvents.trigger('track-event', 'explore_room_click');
    });
  });



  var activeClass = 'is-active';

  var updateRoomCardListVisibility = function() {
    var activeTags = {};

    require('gitter-styleguide/css/components/buttons.css');    Array.prototype.forEach.call(document.querySelectorAll('.js-explore-tag-pill' + ('.' + activeClass)), function(tagPillElement) {
      (tagPillElement.getAttribute('data-tags') || '').split(',').forEach(function(tag) {
        activeTags[tag] = true;
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('.js-explore-room-card'), function(roomItemElement) {
      (roomItemElement.getAttribute('data-tags') || '').split(',').some(function(roomTag) {
        var hasActiveTag = activeTags[roomTag];
        toggleClass(roomItemElement, 'is-hidden', !hasActiveTag);
        return hasActiveTag;
      });
    });
  };

  // Initially call it
  updateRoomCardListVisibility();

  // Hook up our pills to update the card list
  Array.prototype.forEach.call(document.querySelectorAll('.js-explore-tag-pill'), function(tagPillElement) {
    tagPillElement.addEventListener('click', function() {
      var state = toggleClass(tagPillElement, state);
      tagPillElement.setAttribute('aria-selected', state);
      updateRoomCardListVisibility();

      // Tracking
      appEvents.trigger('track-event', 'explore_pills_click', {
        tag: tagPillElement.textContent.toLowerCase()
      });
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('.js-explore-show-more-tag-pills'), function(showMoreElement) {
    showMoreElement.addEventListener('click', function() {
      Array.prototype.forEach.call(document.querySelectorAll('.js-explore-tag-pills-list'), function(pillListElement) {
        var state = toggleClass(pillListElement, 'is-expanded');
        pillListElement.setAttribute('aria-selected', state);
      });
    });
  });


});
