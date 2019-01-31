/*jshint unused:true, browser:true*/
define([
  'jquery',
  'underscore',
  'collections/troupes',
  'utils/context',
  'expect',
  'components/unread-items-frame-client'
], function($, _, troupeModels, context, expect, unreadItemsClient) {
  'use strict';

  describe('TroupeCollectionRealtimeSync', function() {
    it('should handle unread items count changes coming in from the server', function(done) {
      window.troupeContext = { troupe: { id: '1' }, user: { id: 'USER1' } };

      var troupeCollection = new troupeModels.TroupeCollection([{ id: '1' }, { id: '2' }]);

      var count = 0;
      troupeCollection.on('change', function(a) {
        expect(a.get('id')).to.be('2');

        var b = troupeCollection.get('1');
        expect(b.get('unreadItems')).to.be(undefined);

        switch (count++) {
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
      var troupeCollection = new troupeModels.TroupeCollection([{ id: '1' }, { id: '2' }]);
      new unreadItemsClient.TroupeUnreadNotifier(troupeCollection, unreadItemStore);

      troupeCollection.get('1').set('unreadItems', 1);

      var count = 0;
      function step1(e, counts) {
        // Watch out for a stray 'zero' event that we get (in phantomjs mostly)
        // If we get it, give the test one more chance before checking that
        // the values in the events are correct
        if (counts.overall === 0 && count++ === 0) {
          $(document).one('troupeUnreadTotalChange', step1);
          return;
        }

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

              troupeCollection.add({ id: '3', unreadItems: 1 });
              $(document).one('troupeUnreadTotalChange', function(e, counts) {
                expect(counts.overall).to.be(1);
                done();
              });
            });
          });
        });
      }
      $(document).one('troupeUnreadTotalChange', step1);

      done();
    });
  });
});
