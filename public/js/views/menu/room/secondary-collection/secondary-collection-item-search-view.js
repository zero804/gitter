'use strict';

var _                           = require('underscore');
var moment                      = require('moment');
var urlJoin                     = require('url-join');
var searchTemplate              = require('./secondary-collection-item-search-view.hbs');
var SecondaryCollectionItemView = require('./secondary-collection-item-view');

var clientEnv = require('gitter-client-env');

require('views/behaviors/highlight');

module.exports = SecondaryCollectionItemView.extend({
  behaviors: {
      Highlight: {},
  },
  className: 'room-item--search-message',
  triggers: {
    click: 'item:activated',
  },
  template: searchTemplate,
  serializeData: function() {
    var data = this.model.toJSON();

    var permalink;
    if (this.roomMenuModel) {
      var troupeModel = this.roomMenuModel.get('troupeModel');
      if (troupeModel) {
        var roomUri = troupeModel.get('uri');
        permalink = urlJoin(clientEnv.basePath, roomUri, '?at=' + data.id);
      }
    }

    return (!!data && data.fromUser) ?
      _.extend({}, SecondaryCollectionItemView.prototype.serializeData.apply(this, arguments), {
        userUrl:         urlJoin(clientEnv.basePath, data.fromUser.url),
        userDisplayName: data.fromUser.displayName,
        sent:            moment(data.sent).format('MMM Do LT'),
        permalink:       permalink
      }) :
      data;
  },
});
