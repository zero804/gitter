/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'views/base',
  'hbs!./tmpl/markdownTemplate'
], function($, TroupeViews, markdownTemplate ) {
  "use strict";


  var View = TroupeViews.Base.extend({
    template: markdownTemplate,
    events: {

    },

    initialize: function() {


    },

    closeSettings : function () {
      this.dialog.hide();
      this.dialog = null;
    },

    afterRender: function() {

    },

    getRenderData: function() {

    },
  });

  return TroupeViews.Modal.extend({
      initialize: function(options) {
        options.title = "Markdown help";
        TroupeViews.Modal.prototype.initialize.apply(this, arguments);
        this.view = new View({ });
      }
    });
  });
