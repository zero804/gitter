"use strict";

var fonts = require('../../web/fonts');

function renderEarlyBirdPage(req, res) {
  return res.render('early-bird', {
    hasCachedFonts: fonts.hasCachedFonts(req.cookies),
    fonts: fonts.getFonts(),
  });
}

module.exports = {
  renderEarlyBirdPage: renderEarlyBirdPage,
};
