/*jslint node: true */
/*global describe: true it: true */
"use strict";

var assert = require("better-assert");

describe("ChatCollectionView", function() {

  describe("scroll behaviour", function() {

    it("should scroll to the bottom of chats when page is opened");

    it("should scroll to the bottom of chats when the viewer sends a new chat");

    it("should scroll to the new bottom of chat when another user sends a new chat, but only if the viewer is already at the bottom of the chat"); // does this happen by default in browsers?

    it("should keep it's scroll position if the viewer has scrolled manually, and then another sends a new chat message");

  });
});
