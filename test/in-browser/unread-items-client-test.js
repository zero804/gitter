/*jshint unused:true, browser:true*/
require([
  'jquery',
  'underscore',
  'collections/troupes',
  'expect',
  'mocha',
  'components/unread-items-client'
], function($, _, troupeModels, expect, mocha, unreadItemsClient) {
  "use strict";

  mocha.setup({
    ui: 'bdd',
    globals: ['troupeContext']
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

      underTest.once('newcountvalue', function(e, newValue) {
        expect(newValue).to.be(0);

        underTest.once('newcountvalue', function(e, newValue) {
          expect(newValue).to.be(1);

          underTest.once('newcountvalue', function(e, newValue) {
            expect(newValue).to.be(3);
            done();
          });

          underTest._unreadItemAdded('chat', '2');
          underTest._unreadItemAdded('chat', '3');

        });
      });

      underTest._unreadItemAdded('chat', '1');

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


    it('should raise itemMarkedRead events at the appropriate times', function(done) {
      var underTest = new unreadItemsClient.UnreadItemStore();

      underTest.on('itemMarkedRead', function(e, itemType, itemId) {
        expect(itemType).to.be('file');
        expect(itemId).to.be('1');
        done();
      });

      underTest._unreadItemAdded('file', '2');
      underTest._markItemRead('file', '1');
    });

    it('it items are added then immediately removed, the counts should remain in sync', function(done) {
      var underTest = new unreadItemsClient.UnreadItemStore();

      underTest.preload({
        chat: ['1','2','3','4']
      });

      underTest.once('newcountvalue', function(e, newValue) {
        expect(newValue).to.be(4);

        underTest._unreadItemRemoved('chat', '1');
        underTest._markItemRead('chat', '1');

        underTest.once('newcountvalue', function(e, newValue) {
          expect(newValue).to.be(3);

          done();
        });

      });
    });

    it('it should raise newcountvalue events when the store changes', function(done) {
      var underTest = new unreadItemsClient.UnreadItemStore();

      function firstNewCountValueEvent(e, newValue) {
        expect(newValue).to.be(4);

        underTest.once('newcountvalue', secondNewCountValueEvent);
        underTest._unreadItemRemoved('chat', '1');
        underTest._markItemRead('chat', '1');
      }

      function secondNewCountValueEvent(e, newValue) {
        expect(newValue).to.be(3);

        underTest.once('newcountvalue', thirdNewCountValueEvent);
        underTest._unreadItemAdded('chat', '1');
        underTest._unreadItemAdded('chat', '4');
        underTest._unreadItemAdded('chat', '5'); // <- only this item should be added
      }

      function thirdNewCountValueEvent(e, newValue) {
        expect(newValue).to.be(4);

        underTest.once('newcountvalue', forthNewCountValueEvent);
        underTest._markItemRead('chat', '1');
        underTest._markItemRead('chat', '2');
        underTest._markItemRead('chat', '3');
        underTest._markItemRead('chat', '4');
        underTest._markItemRead('chat', '5');
      }

      function forthNewCountValueEvent(e, newValue) {
        expect(newValue).to.be(0);

        done();
      }

      underTest.once('newcountvalue', firstNewCountValueEvent);
      underTest.preload({
        chat: ['1','2','3','4']
      });


    });

    it('it should handle things that are in the wrong order', function(done) {
      var underTest = new unreadItemsClient.UnreadItemStore();

      underTest.once('newcountvalue', firstNewCountValueEvent);
      underTest._markItemRead('chat', '1');
      underTest._markItemRead('chat', '2');
      underTest._markItemRead('chat', '3');
      underTest._markItemRead('chat', '4');
      underTest._markItemRead('chat', '5');


      function firstNewCountValueEvent(e, newValue) {
        expect(newValue).to.be(0);

        underTest.once('newcountvalue', function() {
          done("We did not expect event at this time!");
        });

        underTest._unreadItemAdded('chat', '1');
        underTest._unreadItemAdded('chat', '2');
        underTest._unreadItemAdded('chat', '3');
        underTest._unreadItemRemoved('chat', '4');
        underTest._unreadItemRemoved('chat', '5');

        window.setTimeout(function() {
          return done();
        }, 100);
      }



    });

  });

  describe('TroupeCollectionSync', function() {
    it('should sync changes from the store to the troupe collection', function(done) {

      window.troupeContext = { troupe: { id: '1' }, user: { id: 'USER1' } };
      var troupeCollection = new troupeModels.TroupeCollection([{ id: '1' }, { id: '2' } ]);

      var unreadItemStore;

      troupeCollection.once('change', function(a) {
        expect(a.get('id')).to.be('1');
        expect(a.get('unreadItems')).to.be(0);

        unreadItemStore._unreadItemAdded('file', 1);
        unreadItemStore._unreadItemAdded('file', 2);

        troupeCollection.once('change', function(a) {
          expect(a.get('id')).to.be('1');
          expect(a.get('unreadItems')).to.be(2);

          var b = troupeCollection.get('2');
          expect(b.get('unreadItems')).to.be(undefined);

          done();
        });
      });

      unreadItemStore = new unreadItemsClient.UnreadItemStore();
      new unreadItemsClient.TroupeCollectionSync(troupeCollection, unreadItemStore);



    });
  });

  describe('TroupeCollectionRealtimeSync', function() {
    it('should handle unread items count changes coming in from the server', function(done) {

      window.troupeContext = { troupe: { id: '1' }, user: { id: 'USER1' } };

      var troupeCollection = new troupeModels.TroupeCollection([{ id: '1' }, { id: '2' } ]);

      var count = 0;
      troupeCollection.on('change', function(a) {
        expect(a.get('id')).to.be('2');

        var b = troupeCollection.get('1');
        expect(b.get('unreadItems')).to.be(undefined);

        switch(count++) {
          case 0:
            expect(a.get('unreadItems')).to.be(2);
            break;
          case 1:
            expect(a.get('unreadItems')).to.be(30);
            done();

        }
      });

      var underTest = new unreadItemsClient.TroupeCollectionRealtimeSync(troupeCollection);
      underTest._handleIncomingMessage({ troupeId: '1', totalUnreadItems: 100 });
      underTest._handleIncomingMessage({ troupeId: '1', totalUnreadItems: 200 });

      underTest._handleIncomingMessage({ troupeId: '2', totalUnreadItems: 2 });
      underTest._handleIncomingMessage({ troupeId: '2', totalUnreadItems: 30 });

    });
  });

  describe('TroupeUnreadNotifier', function() {
    it('should broadcast changes to the number of troupes with unread items', function(done) {
      window.troupeContext = { troupe: { id: '1' }, user: { id: 'USER1' } };

      var unreadItemStore = new unreadItemsClient.UnreadItemStore();
      var troupeCollection = new troupeModels.TroupeCollection([{ id: '1' }, { id: '2' } ]);
      new unreadItemsClient.TroupeUnreadNotifier(troupeCollection, unreadItemStore);

      troupeCollection.get('1').set('unreadItems', 1);
      $(document).one('troupeUnreadTotalChange', function(e, counts) {
        expect(counts.overall).to.be(1);

        troupeCollection.get('2').set('unreadItems', 1);
        $(document).one('troupeUnreadTotalChange', function(e, counts) {
          expect(counts.overall).to.be(2);

          troupeCollection.get('2').set('unreadItems', 0);
          $(document).one('troupeUnreadTotalChange', function(e, counts) {
            expect(counts.overall).to.be(1);

            troupeCollection.remove(1);
            $(document).one('troupeUnreadTotalChange', function(e, counts) {
              expect(counts.overall).to.be(0);

              troupeCollection.add({ id: '3', 'unreadItems': 1 });
              $(document).one('troupeUnreadTotalChange', function(e, counts) {
                expect(counts.overall).to.be(1);
                done();
              });
            });

          });


        });
      });

      done();
    });
  });

  if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
  } else {
    mocha.run();
  }

});