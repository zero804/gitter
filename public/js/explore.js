"use strict";
var $ = require('jquery');
var appEvents = require('utils/appevents');
var onready = require('./utils/onready');
require('utils/tracking');
require('utils/frame-utils');

require('gitter-styleguide/css/components/buttons.css');
require('gitter-styleguide/css/components/headings.css');

// Can't use `classList.toggle` with the second parameter (force)
// Because IE11 does not support it
var toggleClass = function(element, class1, force) {
  if(arguments.length === 3) {
    if(force) {
      element.classList.add(class1);
    }
    else {
      element.classList.remove(class1);
    }
  }
  else {
    element.classList.toggle(class1);
  }

  return force;
};


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
      $(this).toggleClass(activeClass);
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
        toggleClass(pillListElement, 'is-expanded');
      });
    });
  });


});
