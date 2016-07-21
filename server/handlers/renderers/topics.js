"use strict";

var StatusError = require('statuserror');
var fonts = require('../../web/fonts');

function renderForum(req, res, next) {

  if (!req.fflip || !req.fflip.has('topics')) {
    return next(new StatusError(404));
  }

  res.render('topics/forum', {
    layout: 'topics-layout',
    hasCachedFonts: fonts.hasCachedFonts(req.cookies),
    fonts: fonts.getFonts(),
    componentData: {
      groupName: req.params.roomPart1,
    }
  });
}

module.exports = {
  renderForum: renderForum,
};
