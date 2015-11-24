'use strict';

var Backbone = require('backbone');

module.exports = Backbone.Collection.extend({

  initialize: function() {

    //fake a snapshot event
    setTimeout(function() {

      this.add([
        { name: 'gitterHQ', githubType: 'ORG', favourite: 1 },
        { name: 'troupe', githubType: 'ORG' },
        { name: 'gitterHQ/test1', githubType: 'ORG_CHANNEL', favourite: 2 },
        { name: 'gitterHQ/test2', githubType: 'ORG_CHANNEL' },
        { name: 'troupe/test1', githubType: 'ORG_CHANNEL', favourite: 3 },
        { name: 'troupe/test2', githubType: 'ORG_CHANNEL' },
        { name: 'someusername', githubType: 'ONETOONE' },
        { name: 'someotherusername', githubType: 'ONETOONE', favourite: 4 },
        { name: 'username', githubType: 'ONETOONE' },
      ]);
      this.trigger('snapshot');

    }.bind(this), 0);
  },

});
