/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'views/signup/createTroupeView',
  'collections/troupes'
], function($, createTroupe, troupeModels) {
  "use strict";

  return function() {
    var createTroupeView = new createTroupe.View({
      el: $('.trpStartContent'),
      collection: new troupeModels.TroupeCollection()
    });

    createTroupeView.onSuccess = function(troupe) {
      window.location.href = 'invite#'+troupe.id;
    };

    $('#next-button').on('click', function() {
      createTroupeView.onFormSubmit();
    });

    createTroupeView.afterRender();

  };

});