/*jshint unused:true, browser:true*/
require([
  'jquery',
  'underscore',
  'expect',
  'mocha',
  'components/unread-items-client'
], function($, _, expect, mocha, unreadItemsClient) {
  mocha.setup({
    ui: 'bdd',
    timeout: 20000
  });

  describe('Tarpit', function(){
    it('should be able to add items, which are then promoted', function(done) {
      var count = 3;
      function promoted() {
        count--;
        if(count < 0) done('Too many callbacks');
        if(count === 0) done();
      }

      var underTest = new unreadItemsClient.Tarpit(20, promoted);
      underTest._add('chat', '1');
      underTest._add('file', '1');
      underTest._add('chat', '2');
    });

    it('should not promote items which have been removed', function(done) {
      var count = 1;
      function promoted(itemType, itemId) {
        count--;
        if(count < 0) done('Too many callbacks');
        expect(itemType).to.be('file');
        expect(itemId).to.be('2');
        done();
      }

      var underTest = new unreadItemsClient.Tarpit(20, promoted);
      underTest._add('chat', '1');
      underTest._add('file', '2');
      underTest._remove('chat', '1');
    });


    it('should not promote items which are duplicated', function(done) {
      var count = 1;
      function promoted(itemType, itemId) {
        count--;
        if(count < 0) done('Too many callbacks');
        expect(itemType).to.be('chat');
        expect(itemId).to.be('1');
        done();
      }

      var underTest = new unreadItemsClient.Tarpit(20, promoted);
      underTest._add('chat', '1');
      underTest._add('chat', '1');
    });

    it('should not deal with deletes that dont exist', function(done) {
      var count = 1;
      function promoted(itemType, itemId) {
        count--;
        if(count < 0) done('Too many callbacks');
        expect(itemType).to.be('file');
        expect(itemId).to.be('2');
        done();
      }

      var underTest = new unreadItemsClient.Tarpit(20, promoted);
      underTest._remove('chat', '1');
      underTest._add('file', '2');
    });

  });


  describe('UnreadItemStore', function() {
    it('should be able to add items, which are then promoted', function(done) {
      var underTest = new unreadItemsClient.UnreadItemStore();
      underTest._unreadItemAdded('chat', '1');
      underTest._unreadItemAdded('chat', '2');
      underTest._unreadItemAdded('chat', '3');

      var count = 1;
      underTest.onNewCountValue = function(newValue) {
        count--;
        switch(count) {
          case 0:
            expect(newValue).to.be(3);
            return done();

          default:
            return done('Too many count values');
        }
      };
    });

    it('should not add items that have been marked as read', function() {
      var underTest = new unreadItemsClient.UnreadItemStore();
      underTest._markItemRead('chat', '1');
      underTest._unreadItemAdded('chat', '1');

      expect(underTest._addTarpit._contains('chat', '1')).to.be(false);
    });

    it('should be able handle preloaded items', function(done) {
      var underTest = new unreadItemsClient.UnreadItemStore();

      var count = 2;
      underTest.onNewCountValue = function(newValue) {
        count--;
        switch(count) {
          case 1:
            expect(newValue).to.be(0);
            break;

          case 0:
            expect(newValue).to.be(3);
            return done();

          default:
            return done('Too many count values');
        }
      };

      underTest._markItemRead('chat', '1');
      underTest.preload({
        'chat': ['1', '2', '3'],
        'file': ['4']
      });

    });

  });


  if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
  } else {
    mocha.run();
  }

});