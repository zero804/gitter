/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'underscore',
  'utils/context',
  'views/base',
  'hbs!./tmpl/loginAcceptInvite',
  'jquery-placeholder'
], function($, _, context, TroupeViews, template) {
  "use strict";

    var View = TroupeViews.Base.extend({
        template: template,
        data: {
            path: window.location.pathname
        }
    });

    var Modal = TroupeViews.Modal.extend({
        initialize: function(options) {
            options = options ? options : {
                disableClose: true
            };
            options.view = new View(options);
            TroupeViews.Modal.prototype.initialize.call(this, options);
        }
    });

    return {
        View: View,
        Modal: Modal
    };

});