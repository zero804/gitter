require([
  'require',
  'mocha'
], function (require, mocha) {

  mocha.setup({
    ui: 'bdd',
    timeout: 20000
  });

  require([
      "in-browser/burst-calculator-test",
      'in-browser/roster-test',
      'in-browser/chat-scroll-test',
      'in-browser/is-android-test',
      'in-browser/mixpanel-test',
      'in-browser/realtime-test',
      'in-browser/unread-items-client-test',
      'in-browser/rollers-test'
    ], function () {
      if (window.mochaPhantomJS) {
        mochaPhantomJS.run();
      } else {
        mocha.run();
      }
    });
});

// TODO: failing at the moment, FIX IT!
// 'in-browser/sortable-marionette-test',
