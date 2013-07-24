/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'views/base',
  'hbs!./tmpl/requestResponseView',
  'log!request-detail-view'
], function(TroupeViews, template, log){
  "use strict";

	var View = TroupeViews.Base.extend({
		template: template,

		events: {
			'click #request-accept-button': 'accept',
			'click #request-reject-button': 'reject'
		},

		reject: function() {
			var self = this;
			this.model.destroy({
				success: function(/* data */) {
					self.dialog.hide();
				},
				error: function(/* model, resp, options */) {
					self.dialog.hide();
					log("Error rejecting request.");
				}
			});
		},

		accept: function() {
			var self = this;
			this.model.save();
            self.dialog.hide();
		}
	});


   var Modal = TroupeViews.Modal.extend({

    initialize: function(options) {
      options.view = new View(options);
      TroupeViews.Modal.prototype.initialize.call(this, options);
    }

  });

   // PS native window.confirm works well on mobile too.

   return Modal;

 });