"use strict";

var fonts = require('../../web/fonts');

module.exports = {
  renderEarlyBirdPage: renderEarlyBirdPage,
};

function renderEarlyBirdPage(req, res) {
  return res.render('early-bird', {
    hasCachedFonts: fonts.hasCachedFonts(req.cookies),
    fonts: fonts.getFonts(),
  });
}
