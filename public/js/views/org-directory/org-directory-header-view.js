'use strict';

var _ = require('underscore');
var Marionette = require('backbone.marionette');
var toggleClass = require('../../utils/toggle-class');

var headerViewTemplate = require('./org-directory-header-view.hbs');

require('../behaviors/tooltip');


var HeaderView = Marionette.ItemView.extend({
  el: 'header',
  template: headerViewTemplate,

  ui: {
    favourite: '.js-group-favourite-button',
    favouriteIcon: '.js-group-favourite-button-icon'
  },

  events: {
    'click @ui.favourite': 'onFavouriteButtonClicked',
  },

  modelEvents: {
    'change:favourite': 'onFavouriteChange'
  },

  behaviors: {
    Tooltip: {
      '.js-group-favourite-button': { placement: 'left' }
    },
  },


  serializeData: function() {
    var data = this.model.toJSON();

    _.extend(data, {
      // ...
    });

    return data;
  },

  onFavouriteChange: function() {
    var isFavourited = !!this.model.get('favourite');
    toggleClass(this.ui.favouriteIcon[0], 'favourite', isFavourited);
  },

  onFavouriteButtonClicked: function() {
    var isFavourited = !!this.model.get('favourite');
    this.model.save({
      favourite: !isFavourited
    }, { wait: true });
  }

});

module.exports = HeaderView;
