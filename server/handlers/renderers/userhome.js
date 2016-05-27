"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var contextGenerator = require('../../web/context-generator');
var useragent = require('useragent');

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

function renderHomePage(req, res, next) {
  contextGenerator.generateNonChatContext(req)
    .then(function (troupeContext) {
      var page = req.isPhone ? 'mobile/mobile-userhome' : 'userhome-template';

      var osName = useragent.parse(req.headers['user-agent']).os.family.toLowerCase();

      var isLinux = osName.indexOf('linux') >= 0;
      var isOsx = osName.indexOf('mac') >= 0;
      var isWindows = osName.indexOf('windows') >= 0;

      // show everything if we cant confirm the os
      var showOsxApp = !isLinux && !isWindows;
      var showWindowsApp = !isLinux && !isOsx;
      var showLinuxApp = !isOsx && !isWindows;

      res.render(page, {
        welcomeMessage: WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)],
        showOsxApp: showOsxApp,
        showWindowsApp: showWindowsApp,
        showLinuxApp: showLinuxApp,
        troupeContext: troupeContext,
        isNativeDesktopApp: troupeContext.isNativeDesktopApp,
        billingBaseUrl: nconf.get('web:billingBaseUrl')
      });
    })
    .catch(next);
}

function renderMobileUserHome(req, res, next) {
  contextGenerator.generateNonChatContext(req)
  .then(function(troupeContext) {
    res.render('mobile/mobile-userhome', {
      troupeName: req.uriContext.uri,
      troupeContext: troupeContext,
      agent: req.headers['user-agent'],
      user: req.user
    });
  })
  .catch(next);
}

function renderMobileNativeUserhome(req, res) {
  contextGenerator.generateNonChatContext(req)
    .then(function(troupeContext) {
      res.render('mobile/native-userhome-app', {
        bootScriptName: 'mobile-native-userhome',
        troupeContext: troupeContext
      });
    });
}

module.exports = exports = {
  renderHomePage: renderHomePage,
  renderMobileUserHome: renderMobileUserHome,
  renderMobileNativeUserhome: renderMobileNativeUserhome,
};
