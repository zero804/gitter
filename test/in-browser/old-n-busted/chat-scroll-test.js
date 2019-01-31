/*jshint unused:true, browser:true*/
define([
  'jquery',
  'underscore',
  'expect',
  'collections/chat',
  'views/chat/chatCollectionView'
], function($, _, expect, chatModel, ChatCollectionView) {
  /*
   * Default browser scroll behaviour:
   *   When an element is added to the bottom of a container the browser does not scroll the container, it keeps the current content in view and the new message is below the fold.
   *   When an element is added to the top of a container the browser does not scroll the container, and it does NOT keep the current content in view, the original content will be lower (it's displaced), and the new content may be visible.
   *
   * Desired chat collection scroll behaviour:
   *   When a message is added to either the top or bottom, and the viewer is at the bottom of the screen, the scroll should "stay" at the NEW bottom of the screen.
   *   When a subsequent message is added to the bottom, no scrolling is needed (unless the viewer is already at the bottom of the page).
   *   When a chunk of older messages are loaded at the top, the current items in view must stay in view.
   *   When the window is not in focus, subsequent (unread) messages at the bottom must not cause the top most unread item to be scrolled above the fold.
   */

  // to ensure that our test environment is working properly
  xdescribe('Mimmick default browser scroll behaviour', function() {
    it('should keep the current scroll position as the height of the container grows', function(done) {
      done();
    });
  });

  xdescribe('Chat scroll behaviour for new messages added at the bottom', function() {
    it('should scroll to the new bottom if the viewer was already at the bottom', function() {
      var env = new TestEnvironment();

      for (var a = 0; a < 30; a++) {
        env.newMessage();
      }

      expect(env.scrollOf.scrollTop()).greaterThan(
        Math.max(0, env.container.height() - env.scrollOf.height()) - 1
      );
    });

    it('should not scroll past the top unread message when a new message comes in at the bottom', function() {
      var env = new TestEnvironment();

      // take up some space, with read messages
      for (var a = 0; a < 30; a++) env.newMessage();

      // store this position as the top unread item
      env.topUnreadPosition = env.scrollOf.scrollTop();
      // add enough "unread" messages to fill the screen
      for (var b = 0; b < 20; b++) env.newMessage();

      // ensure the scroll position has not gone past the top unread position previously saved
      expect(env.scrollOf.scrollTop()).to.be.lessThan(env.topUnreadPosition);
    });
  });

  xdescribe('ChatCollection', function() {
    /*
    it("should send a reset / sync event after the initial models come in through live collection listening", function(done) {
      var env = new TestEnvironment();
      env.collection.listen();
      env.collection.on('reset sync', function() {
        done();
      });
    });
    */
  });

  xdescribe('ChatCollectionView', function() {
    it('should wait for a collection sync / reset before enabling the scroll delegate', function(done) {
      var env = new TestEnvironment();

      expect(env.view.hasRendered).not.to.be(true);
      env.collection.on('reset sync', function() {
        expect(env.view.hasRendered).equal(true);
        done();
      });
      env.collection.trigger('sync');
    });
  });

  function TestEnvironment() {
    // mock the scrollOf jquery element

    $('#content-frame').remove();
    $('#chat-frame').remove();
    $('<div id="content-frame"></div>').appendTo('body');
    $('<div id="chat-frame"></div>').appendTo('#content-frame');

    this.scrollOf = $('#content-frame');
    this.scrollOf.height(800);
    this.scrollOf.css({ overflow: 'scroll' });

    /*{
      scroll: 0,
      scrollTop: function(top) {
        if (top === 0 || top)
          this.scroll = top;

        return this.scroll;
      },
      h: 800,
      height: function() {
        //if (y === 0 || y)
        //  this.h = y;

        return this.h;
      }
    };*/

    // mock the container jquery element
    this.container = $('#chat-frame');

    /*
    {
      h: 0,
      height: function(y) {
        if (y === 0 || y) {
          this.h = y;
          //scrollOf.h = y;
        }

        return this.h;
      }
    };
    */

    // setup the collection view
    this.collection = new chatModel.ChatCollection();
    this.view = new ChatCollectionView({ collection: this.collection });

    this.topUnreadPosition = null;

    this.newMessage = function() {
      this.container.height(this.container.height() + 60);
    };
  }
});
