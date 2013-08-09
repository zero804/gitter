require([
  'require',
  'mocha'
  ], function(require){

    mocha.setup({
      ui: 'bdd',
      timeout: 20000
    });

    require([
      'in-browser/chat-scroll-test',
      'in-browser/faye-test',
      'in-browser/faye-wrapper-test',
      'in-browser/mixpanel-test',
      'in-browser/realtime-test',
      'in-browser/sortable-marionette-test',
      'in-browser/unread-items-client-test'
      ], function() {

      if (window.mochaPhantomJS) {
        mochaPhantomJS.run();
      } else {
        mocha.run();
      }

    });

  });
