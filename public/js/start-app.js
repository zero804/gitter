/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'start/profile',
  'start/create',
  'start/invite',
  'start/finish'
], function($, bootProfile, bootCreate, bootInvite, bootFinish) {
  "use strict";

  var page = $('body').data('page');

  switch(page) {
    case 'profile':
      return bootProfile();

    case 'create':
      return bootCreate();

    case 'invite':
      return bootInvite();

    case 'finish':
      return bootFinish();
  }

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function(/*tracking*/) {
    // No need to do anything here
  });
});
