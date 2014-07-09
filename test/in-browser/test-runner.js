require([
  'require',
  'mocha'
], function (require, mocha) {

  mocha.setup({
    ui: 'bdd',
    timeout: 20000
  });

  require([
      "in-browser/burstCalculator-test",
      'in-browser/roster-test',
      // 'in-browser/chat-scroll-test',
      // 'in-browser/faye-test',
      // 'in-browser/faye-wrapper-test',
      // 'in-browser/is-android-test',
      // 'in-browser/mixpanel-test',
      // 'in-browser/realtime-test',
      // 'in-browser/sortable-marionette-test',
      // 'in-browser/unread-items-client-test',
      // 'in-browser/rollers-test'
    ], function () {
      if (window.mochaPhantomJS) {
        mochaPhantomJS.run();
      } else {
        mocha.run();
      }
    });
});
