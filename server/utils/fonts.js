"use strict";

var cdn = require("../web/cdn");

var FONTS = [
  { fontPath: cdn('fonts/sourcesans/SourceSansPro-Regular.otf.woff'), weight: 'normal', family: 'source-sans-pro', style: 'normal' },
  { fontPath: cdn('fonts/sourcesans/SourceSansPro-It.otf.woff'), weight: 'italic', family: 'source-sans-pro', style: 'italic' },
  { fontPath: cdn('fonts/sourcesans/SourceSansPro-Bold.otf.woff'), weight: 'bold', family: 'source-sans-pro', style: 'normal' },
  { fontPath: cdn('fonts/sourcesans/SourceSansPro-Semibold.otf.woff'), weight: 600, family: 'source-sans-pro', style: 'normal' },
  { fontPath: cdn('fonts/sourcesans/SourceSansPro-BoldIt.otf.woff'), weight: 'italic', family: 'source-sans-pro', style: 'italic' },
  { fontPath: cdn('fonts/sourcesans/SourceSansPro-Light.otf.woff'), weight: 300, family: 'source-sans-pro', style: 'normal' },
  { fontPath: cdn('fonts/sourcesans/SourceSansPro-ExtraLight.otf.woff'), weight: 200, family: 'source-sans-pro', style: 'normal' },
];

function getFonts(){
  return FONTS;
}

function hasCachedFonts(req) {
  return (req.cookies.webfontsLoaded || '') === 'true';
}

module.exports = {
  getFonts: getFonts,
  hasCachedFonts: hasCachedFonts,
};
