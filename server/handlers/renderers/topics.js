"use strict";

var StatusError = require('statuserror');
var fonts       = require('../../web/fonts');

function renderForum(req, res){

  var hasTopics = req.fflip && req.fflip.has('topics');
  if(!hasTopics) { throw new StatusError(404); }

  res.render('topics/forum', {
    layout: 'topics-layout',
    groupName: req.params.roomPart1,
    hasCachedFonts: fonts.hasCachedFonts(req.cookies),
    fonts: fonts.getFonts(),
  });
}

module.exports = {
  renderForum: renderForum,
};
