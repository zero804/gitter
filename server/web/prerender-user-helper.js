/*jshint globalstrict: true, trailing: false, unused: true, node: true */
'use strict';
var fs = require('fs');
var path = require('path');
var nconf = require('../utils/config');

var resolveAvatarUrl = require('../../public/js/utils/resolve-avatar-url');
var _ = require('underscore');
var handlebars = require('handlebars');

var baseDir = path.normalize(__dirname + '/../../' + nconf.get('web:staticContent'));
var buffer = fs.readFileSync(baseDir + '/js/views/widgets/tmpl/avatar.hbs');
var template = handlebars.compile(buffer.toString());

module.exports = function (model) {

  var extra = {
    avatarUrl: resolveAvatarUrl({ username: model.username, size: 30 }),
    avatarSize: 's',
    inactive: model.invited,
    presenceClass: model.online ? 'online' : 'offline',
    showStatus: true
  };

  var data = _.extend(model, extra);
  var result = template(data);

  return result;
};
