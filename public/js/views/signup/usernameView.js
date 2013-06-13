/*jshint unused:true, browser:true */

define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/usernameView',
  'utils/validate-wrapper', // No reference
  'jquery-placeholder' // No reference
], function($, _, TroupeViews, template) {

	return TroupeViews.Base.extend({
		template: template,

		events: {
			"submit form": "onFormSubmit"
		},

		onFormSubmit: function() {
			return false;
		}

	});

 });