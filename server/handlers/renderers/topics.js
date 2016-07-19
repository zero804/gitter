"use strict";
var StatusError = require('statuserror');

function renderForum(req, res){

  var hasTopics = req.fflip && req.fflip.has('topics');
  if(!hasTopics) { throw new StatusError(404); }

  res.render('topics/forum', {
    layout: 'topics-layout',
    groupName: req.params.roomPart1,
  });
}

module.exports = {
  renderForum: renderForum,
};
