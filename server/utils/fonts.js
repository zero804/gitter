"use strict";

var cdn = require("gitter-web-cdn");

var FONTS = [
  { fontPath: cdn('fonts/sourcesans/SourceSansPro-Regular.otf.woff'), weight: 'normal', family: 'source-sans-pro', style: 'normal' },
  { fontPath: cdn('fonts/sourcesans/SourceSansPro-It.otf.woff'), weight: 'normal', family: 'source-sans-pro', style: 'italic' },
  { fontPath: cdn('fonts/sourcesans/SourceSansPro-Bold.otf.woff'), weight: 'bold', family: 'source-sans-pro', style: 'normal' },
  { fontPath: cdn('fonts/sourcesans/SourceSansPro-Semibold.otf.woff'), weight: 600, family: 'source-sans-pro', style: 'normal' },
  { fontPath: cdn('fonts/sourcesans/SourceSansPro-BoldIt.otf.woff'), weight: 'bold', family: 'source-sans-pro', style: 'italic' },
  { fontPath: cdn('fonts/sourcesans/SourceSansPro-Light.otf.woff'), weight: 300, family: 'source-sans-pro', style: 'normal' },
  { fontPath: cdn('fonts/sourcesans/SourceSansPro-ExtraLight.otf.woff'), weight: 200, family: 'source-sans-pro', style: 'normal' },
];

var LOCAL_FONTS = [
  { name: 'SourceSansPro-Bold', weight: 'bold', style: 'normal' },
  { name: 'SourceSansPro-BoldIt', weight: 'bold', style: 'italic' },
  { name: 'SourceSansPro-ExtraLight', weight: 200, style: 'normal' },
  { name: 'SourceSansPro-It', weight: 'normal', style: 'italic' },
  { name: 'SourceSansPro-Light', weight: 300, style: 'normal' },
  { name: 'SourceSansPro-Regular', weight: 'normal', style: 'normal' },
  { name: 'SourceSansPro-Semibold', weight: 600, style: 'normal' },
];

function getFonts(){
  return { local: LOCAL_FONTS, preload: FONTS };
}

function hasCachedFonts(req) {
  return (req.cookies.webfontsLoaded || '') === 'true';
}

module.exports = {
  getFonts: getFonts,
  hasCachedFonts: hasCachedFonts,
};
