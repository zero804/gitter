/*jshint unused:true, browser:true*/
require([
  'jquery',
  'underscore',
  'expect',
  'mocha',
  'components/unread-items-client'
], function($, _, expect, mocha, unreadItemsClient) {
  "use strict";

  mocha.setup({
    ui: 'bdd'
  });

  describe('DoubleHash', function() {
    it('should be able to add items', function(done) {
      var underTest = new unreadItemsClient.DoubleHash();
      expect(underTest._add('chat', '1')).to.be(true);
      expect(underTest._count()).to.be(1);

      expect(underTest._add('chat', '1')).to.be(false);
      expect(underTest._count()).to.be(1);

      expect(underTest._add('chat', '2')).to.be(true);
      expect(underTest._count()).to.be(2);

      expect(underTest._add('file', '1')).to.be(true);
      expect(underTest._count()).to.be(3);

      done();

    });

    it('should be able to remove items', function(done) {
      var underTest = new unreadItemsClient.DoubleHash();
      underTest._add('chat', '1');
      expect(underTest._count()).to.be(1);

      expect(underTest._remove('chat', '1')).to.be(true);
      expect(underTest._count()).to.be(0);

      expect(underTest._remove('chat', '1')).to.be(false);
      expect(underTest._count()).to.be(0);

      done();
    });

    it('should be able to tell if an item is contained', function(done) {
      var underTest = new unreadItemsClient.DoubleHash();

      expect(underTest._contains('chat', '1')).to.be(false);
      underTest._add('chat', '1');
      expect(underTest._contains('chat', '1')).to.be(true);

      expect(underTest._contains('chat', '2')).to.be(false);

      expect(underTest._remove('chat', '1')).to.be(true);

      expect(underTest._contains('chat', '1')).to.be(false);

      done();
    });

    it('should be able to marshall the array out', function(done) {
      var underTest = new unreadItemsClient.DoubleHash();

      underTest._add('chat', '1');
      underTest._add('chat', '2');
      underTest._add('chat', '3');

      underTest._add('file', '1');
      underTest._add('file', '2');
      underTest._remove('file', '2');

      var o = underTest._marshall();

      expect(o).to.only.have.keys('chat', 'file');

      expect(o.chat).to.have.length(3);
      expect(o.chat).to.contain('1');
      expect(o.chat).to.contain('2');
      expect(o.chat).to.contain('3');

      expect(o.file).to.have.length(1);
      expect(o.file).to.only.contain('1');

      done();
    });
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
      underTest.on('newcountvalue', function(e, newValue) {
        count--;
        switch(count) {
          case 0:
            expect(newValue).to.be(3);
            return done();

          default:
            return done('Too many count values');
        }
      });

    });

    it('should not add items that have been marked as read', function() {
      var underTest = new unreadItemsClient.UnreadItemStore();
      underTest._markItemRead('chat', '1');
      underTest._unreadItemAdded('chat', '1');

      expect(underTest._addTarpit._contains('chat', '1')).to.be(false);
    });

    it('should be able handle preloaded items', function(done) {
      var underTest = new unreadItemsClient.UnreadItemStore();

      var count = 1;
      underTest.on('newcountvalue', function(e, newValue) {
        count--;
        switch(count) {
          case 0:
            expect(newValue).to.be(3);
            return done();

          default:
            return done('Too many count values');
        }
      });

      underTest._markItemRead('chat', '1');
      underTest.preload({
        'chat': ['1', '2', '3'],
        'file': ['4']
      });

    });

    it('should raise unreadItemRemoved events at the appropriate times', function(done) {
      var underTest = new unreadItemsClient.UnreadItemStore();

      underTest.on('unreadItemRemoved', function(e, itemType, itemId) {
        expect(itemType).to.be('file');
        expect(itemId).to.be('1');
        done();
      });

      underTest._unreadItemAdded('file', '1');
      underTest._unreadItemRemoved('file', '1');
    });


    it('should raise unreadItemRemoved events at the appropriate times', function(done) {
      var underTest = new unreadItemsClient.UnreadItemStore();

      underTest.on('itemMarkedRead', function(e, itemType, itemId) {
        expect(itemType).to.be('file');
        expect(itemId).to.be('1');
        done();
      });

      underTest._unreadItemAdded('file', '2');
      underTest._markItemRead('file', '1');
    });


  });


  if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
  } else {
    mocha.run();
  }

});