/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/usernameView',
  'hbs!./tmpl/usernameSuggestion',
  'utils/validate-wrapper', // No reference
  'jquery-placeholder' // No reference
], function($, _, TroupeViews, template, suggestionTemplate) {
  "use strict";


	var UsernameView = TroupeViews.Base.extend({
		template: template,

		events: {
			"submit form": "onFormSubmit",
			'keydown input[name=username]': "checkAvailability",
			'click .trpSuggestionAvailable': 'chooseSuggestion'
		},

		initialize: function() {
			this.getSuggestions();
			this.suggestions = [];
			this.valid = false;
			if (this.compactView) $(".trpBodyWrapper").hide();
		},

		afterRender: function() {

		},

		getSuggestions: function() {
			var self = this;
			console.log("Getting Suggestions");
			$.ajax({
				url: '/api/v1/usernamesuggestions',
				success: function(suggestions) {
					if (suggestions && suggestions.length) {
						suggestions = (window._troupeCompactView) ? suggestions.slice(0, 2) : suggestions.slice(0, 4);
						self.addSuggestions(suggestions);
					}
				}
			});
		},

		addSuggestions: function(suggestions) {
			var prevSuggestions = this.suggestions;
			this.suggestions = _.uniq(_.union(suggestions, prevSuggestions), false, function(suggestion) {
				return suggestion.username;
			});

			var newSuggestions = _.filter(suggestions, function(suggestion) {
				var existed = _.find(prevSuggestions, function(prevSuggestion) {
					return prevSuggestion.username == suggestion.username;
				});

				return !existed;
			});

			this.renderSuggestions(newSuggestions);
		},

		renderSuggestions: function(suggestions) {
			console.dir(suggestions);
			var suggestionsContainer = this.$el.find('.name-suggestions');

			for (var a = 0; a < suggestions.length; a++) {
				var data = {
					username: suggestions[a].username,
					'class': (suggestions[a].available) ? 'trpSuggestionAvailable' : 'trpSuggestionUnavailable',
					available: suggestions[a].available
				};

				suggestionsContainer.append(suggestionTemplate(data));
			}
			suggestionsContainer.slideDown();

		},

		checkAvailability: function() {

			var self = this;

			/* On key press, hide previous error message */
			$('.trpModalFailure').hide();

			/* Cancel the availability message until it is checked again */
			self.unknownAvailability();

			/* Buffer the key presses */
			if (self.timer) {
				clearTimeout(self.timer);
			}

			self.timer = setTimeout(check, 1000);

			function check() {
				clearTimeout(self.timer);

				var username = self.getInput();

				// don't check availability of empty username
				if (!username) return;

				$.ajax({
					url: '/api/v1/usernamesuggestions',
					data: {
						text: username
					},
					success: function(suggestions) {
						var username = self.getInput();
						var requested = _.findWhere(suggestions, { username: username });
						if (requested && requested.available) {
							self.isAvailable(username);
						}
						else {
							self.isUnavailable();
						}
						self.addSuggestions(suggestions);
					}
				});

			}

			return true;
		},

		getInput: function() {
			return this.$el.find('input[name=username]').val().toLowerCase();
		},

		isAvailable: function (username) {
			this.valid = true;
			this.$el.find('.not-valid-message').hide();
			this.$el.find('.valid-message').show();
			$("#show-user-name").text(username);
		},

		isUnavailable: function () {
			this.valid = false;
			this.$el.find('.tip-message').hide();
			this.$el.find('.not-valid-message').show();
			this.$el.find('.valid-message').hide();
		},

		unknownAvailability: function () {
			this.valid = false;
			this.$el.find('.not-valid-message').hide();
			this.$el.find('.valid-message').hide();
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
			var username = this.getInput();

			if (!username) {
				error();
				return;
			}

			$.ajax({
				method: "POST",
				url: '/profile',
				data: {
					username: username
				},
				success: function(result) {
					if (!result.success) {
						self.isUnavailable();
					} else {
						self.trigger('chose', username);
						self.close();
					}
				},
				error: error
			});

			function error() {
				self.$el.find('.trpModalFailure').show();
			}

			return false;
		}

	});

	UsernameView.Modal = TroupeViews.Modal.extend({
		initialize: function(options) {
			var view = new UsernameView(), self = this;

			view.on('close', function() {
				self.hide();
			});

			view.on('chose', function(username) {
				self.trigger('chose', username);
			});

			TroupeViews.Modal.prototype.initialize.call(this, { view: view, disableClose: (options && options.disableClose) ? true : false });
		}
	});

	return UsernameView;
 });