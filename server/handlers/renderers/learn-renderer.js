'use strict';

const asyncHandler = require('express-async-handler');
const mixinHbsDataForVueLeftMenu = require('./vue/mixin-vue-left-menu-data');
const fonts = require('../../web/fonts');

async function renderLearnPage(req, res) {
  res.render(
    'learn',
    await mixinHbsDataForVueLeftMenu(
      req,
      {},
      {
        bootScriptName: 'router-home-learn',
        cssFileName: 'styles/userhome.css',
        fonts: fonts.getFonts(),
        hasCachedFonts: fonts.hasCachedFonts(req.cookies)
      }
    )
  );
}

module.exports = {
  renderLearnPage: asyncHandler(renderLearnPage)
};
