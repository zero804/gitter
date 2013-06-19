/*jshint unused:true, browser:true */

define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/usernameView',
  'hbs!./tmpl/usernameSuggestion',
  'utils/validate-wrapper', // No reference
  'jquery-placeholder' // No reference
], function($, _, TroupeViews, template, suggestionTemplate) {

	return TroupeViews.Base.extend({
		template: template,

		events: {
			"submit form": "onFormSubmit",
			'keydown input[name=username]': "checkAvailability",
			'click .trpSuggestionAvailable': 'chooseSuggestion'
		},

		initialize: function() {
			this.getSuggestions();
		},

		getSuggestions: function() {
			var self = this;

			$.ajax({
				url: '/api/v1/usernamesuggestions',
				success: function(suggestions) {
					if (suggestions && suggestions.length) {
						self.renderSuggestions(suggestions);
					}
				}
			});
		},

		renderSuggestions: function(suggestions) {
			console.log("Render suggestions");
			this.suggestions = suggestions;
			var suggestionsContainer = this.$el.find('.trpSuggestions');

			for (var a = 0; a < suggestions.length; a++) {
				var data = {
					username: suggestions[a].username,
					'class': (suggestions[a].available) ? 'trpSuggestionAvailable' : 'trpSuggestionUnavailable',
					available: suggestions[a].available
				};

				suggestionsContainer.append(suggestionTemplate(data));
			}
			$(".name-suggestions").slideDown();

		},

		checkAvailability: function() {

			var self = this;
			$('.trpModalFailure').hide();
			/* Cancel the availability message until it is checked again */
			unknownAvailability();

			/* Buffer the key presses */
			if (self.timer) {
				clearTimeout(self.timer);
			}

			self.timer = setTimeout(check, 1000);

			function check() {
				clearTimeout(self.timer);

				var username = self.$el.find('input[name=username]').val();

				$.ajax({
					url: '/api/v1/usernamesuggestions',
					data: {
						text: username
					},
					success: function(suggestions) {
						if (suggestions[0].available) {
							isAvailable();
						}
						else {
							isUnavailable();
						}
					}
				});

			}

			function isAvailable() {
				self.$el.find('.not-valid-message').hide();
				self.$el.find('.valid-message').show();
			}

			function isUnavailable() {
				self.$el.find('.not-valid-message').show();
				self.$el.find('.valid-message').hide();
			}

			function unknownAvailability() {
				self.$el.find('.not-valid-message').hide();
				self.$el.find('.valid-message').hide();
			}

			return true;
		},

		chooseSuggestion: function(e) {
			var username = $(e.currentTarget).attr('data-username');

			this.$el.find('input[name=username]').val(username);

			this.checkAvailability();
		},

		onFormSubmit: function(e) {
			e.preventDefault();
			e.stopPropagation();

			var self = this;
			var username = this.$el.find('input[name=username]').val();

			if (!username) {
				error();
				return;
			}

			$.ajax({
				url: '/api/v1/usernamesuggestions',
				data: {
					save: username
				},
				success: function(result) {
				},
				error: error
			});

			function error() {
				self.$el.find('.trpModalFailure').show();
			}

			return false;
		}

	});

 });