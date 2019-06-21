'use strict';

var env = require('gitter-web-env');
var nconf = env.config;
const asyncHandler = require('express-async-handler');
var contextGenerator = require('../../web/context-generator');
var fonts = require('../../web/fonts');
const mixinHbsDataForVueLeftMenu = require('./vue/mixin-vue-left-menu-data');

var WELCOME_MESSAGES = [
  'Code for people',
  'Talk about it',
  "Let's try something new",
  'Computers are pretty cool',
  "Don't build Skynet",
  'Make the world better',
  'Computers need people',
  'Everyone secretly loves robots',
  'Initial commit',
  'Hello World',
  'From everywhere, with love',
  '200 OK',
  'UDP like you just dont care',
  'Lovely code for lovely people',
  "Don't drop your computer",
  'Learn, Teach, Repeat. Always Repeat.',
  'Help out on the projects you love',
  "HTTP 418: I'm a teapot",
  'Hey there, nice to see you',
  'Welcome home'
];

async function renderHomePage(req, res, next) {
  contextGenerator
    .generateBasicContext(req)
    .then(async function(troupeContext) {
      const useVueLeftMenu = req.fflip.has('vue-left-menu');
      var page = 'userhome-template';
      if (!useVueLeftMenu && req.isPhone) {
        page = 'mobile/mobile-userhome';
      }

      var osName = req.getParsedUserAgent().os.family.toLowerCase();

      var isLinux = osName.indexOf('linux') >= 0;
      var isOsx = osName.indexOf('mac') >= 0;
      var isWindows = osName.indexOf('windows') >= 0;

      // show everything if we cant confirm the os
      var showOsxApp = !isLinux && !isWindows;
      var showWindowsApp = !isLinux && !isOsx;
      var showLinuxApp = !isOsx && !isWindows;

      res.render(
        page,
        await mixinHbsDataForVueLeftMenu(req, {
          bootScriptName: 'router-userhome',
          cssFileName: 'styles/userhome.css',
          hasCachedFonts: fonts.hasCachedFonts(req.cookies),
          fonts: fonts.getFonts(),
          welcomeMessage: WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)],
          showOsxApp: showOsxApp,
          showWindowsApp: showWindowsApp,
          showLinuxApp: showLinuxApp,
          troupeContext: troupeContext,
          isNativeDesktopApp: troupeContext.isNativeDesktopApp
        })
      );
    })
    .catch(next);
}

function renderMobileUserHome(req, res, next) {
  contextGenerator
    .generateBasicContext(req)
    .then(function(troupeContext) {
      res.render('mobile/mobile-userhome', {
        hasCachedFonts: fonts.hasCachedFonts(req.cookies),
        fonts: fonts.getFonts(),
        troupeName: (troupeContext.troupe && troupeContext.troupe.uri) || 'Home',
        troupeContext: troupeContext,
        agent: req.headers['user-agent'],
        user: req.user
      });
    })
    .catch(next);
}

function renderMobileNativeUserhome(req, res) {
  contextGenerator.generateBasicContext(req).then(function(troupeContext) {
    res.render('mobile/native-userhome-app', {
      hasCachedFonts: fonts.hasCachedFonts(req.cookies),
      fonts: fonts.getFonts(),
      bootScriptName: 'mobile-native-userhome',
      troupeContext: troupeContext
    });
  });
}

module.exports = exports = {
  renderHomePage: asyncHandler(renderHomePage),
  renderMobileUserHome: renderMobileUserHome,
  renderMobileNativeUserhome: renderMobileNativeUserhome
};
