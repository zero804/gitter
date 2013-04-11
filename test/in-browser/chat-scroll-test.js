/*jshint unused:true, browser:true*/
require([
  'jquery',
  'underscore',
  'expect',
  'mocha',
  'views/chat/scrollDelegate'
], function($, _, expect, mocha, delegates) {
  mocha.setup({
    ui: 'bdd',
    timeout: 20000
  });

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
  describe("Mimmick default browser scroll behaviour", function() {
    it("should keep the current scroll position as the height of the container grows", function(done) {
      done();
    });
  });

  describe("Chat scroll behaviour for new messages added at the bottom", function() {
    it("should scroll to the new bottom if the viewer was already at the bottom", function() {

    });
  });

  // mock the scrollOf jquery element
  var scrollOf = {
    scroll: 0,
    scrollTop: function(top) {
      if (top === 0 || top)
        this.scroll = top;

      return this.scroll;
    },
    h: 0,
    height: function(y) {
      if (y === 0 || y)
        this.h = y;

      return this.h;
    }
  };

  // mock the container jquery element
  var container = {
    height: function() {}
  };

  // setup the scroll delegate
  var scrollDelegate = new delegates.DefaultScrollDelegate(scrollOf, container, 'trpChatItem', findTopMostVisibleUnreadItem);
  // what do we need to return as the unread item?
  function findTopMostVisibleUnreadItem(/* itemType */) {

  }

  function newMessage() {
    scrollDelegate.onBeforeItemAdded();
    container.height(container.height() + 60);
    scrollOf.scrollTop();
    scrollDelegate.onAfterItemAdded();
  }


  mocha.run();

});