/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define(function () {
  "use strict";

  // const - 5 minutes window to merge messages into previous burst
  var BURST_WINDOW = 5 * 60 * 1000;

  /**
   * toCollection() converts an Array to a Backbone.Collection
   * we do this in order to separate business logic from infrastructure workaround
   *
   * collection   Array or Backbone.Collection - Structure in which a check is performed
   * returns      Backbone.Collection - the converted structure
   */
  function toCollection (collection) {
    if (_.isArray(collection)) return new Backbone.Collection(collection);
    return collection;
  }

  /**
   * findBurstAbove() finds the first burstStart above the given index
   *
   * index Number - index used to find burst start
   * @return Number - the index of burstStart found above
   */
  function findBurstAbove (index) {
    var chat = null;
    if (index === 0) return index;
    while (index--) {
      chat = this.at(index);
      if (chat.get('burstStart')) break;
    }
    return index;
  }
  /**
   * findBurstBelow() finds the first burstStart below the given index
   *
   * index Number - index used to find burst start
   * @return Number - the index of burstStart found below
   */
  function findBurstBelow (index) {
    if (index === this.length - 1) return index;
    var chat = null;
    while (index <= this.length) {
      chat = this.at(index);
      if (chat.get('burstStart')) break;
      index++;
    }
    return index;
  }

  /**
   * calculate() triggers a parse based on a model, however it finds the correct `slice`
   * of the chat-collection to be recalculated.
   *
   * model    Backbone.Model - the model that is to be added to the collection
   * returns  void - it simply calls parse(), which mutates the collection directly
   */
  function calculate (model) {
    if('burstStart' in model.attributes) return; // already calculated bursts for this batch
    var index = this.indexOf(model);
    var start = findBurstAbove.call(this, index);
    var end = findBurstBelow.call(this, index);
    parse(this, start, end);
  }

  /**
   * parse() detects each chat-item on a Collection regarding their burst status
   *
   * collection   Backbone.Collection - the collection to be iterated over
   * start        Number - index set as the starting point of the iteration
   * end          Number - index set as the ending point of the iteration
   *
   * returns Backbone.Collection - the mutated collection
   */
  function parse (collection_, start, end) {
    var collection = toCollection(collection_);

    // pre-run checks
    if (!collection) return;
    start = (typeof start !== 'undefined') ? start : 0; // start defaults at index 0
    end = (typeof end !== 'undefined') ? end : collection.length; // end defaults at index n

    var burstUser,
        burstStart,
        self = this;

    collection
      .slice(start, end + 1)
      .forEach(function (chat) {

        var index = collection.indexOf(chat);

        var newSentTime = chat.get('sent').valueOf();
        var sinceBurstStart = newSentTime - burstStart; // get the duration since last burst
        var newUser = chat.get('fromUser') && chat.get('fromUser').username;
        var prevChatIsStatus = (index > 0) ? collection.at(index - 1).get('status') : false;

        // always set the chat-item to be false for both final and start
        chat.set('burstFinal', false);
        chat.set('burstStart', false);

        // `/me` status
        if (chat.get('status')) {
          burstUser = null;
          chat.set('burstStart', true);
          chat.set('burstFinal', true);
          if (index > 0) collection.at([index - 1]).set('burstFinal', true);
        }

        // if we do not currently have a burst user set new as current and create a new burst
        if (!burstUser) {
          burstUser = newUser;
          burstStart = newSentTime;
          chat.set('burstStart', true);
          if (index > 0) collection.at([index - 1]).set('burstFinal', true);
        }

        // if the current user is different or the duration since last burst is larger than 5 minutes we have a new burst
        if (prevChatIsStatus || newUser !== burstUser || sinceBurstStart > BURST_WINDOW) {
          burstUser = newUser;
          burstStart = newSentTime;
          chat.set('burstStart', true);
          if (index > 0) collection.at([index - 1]).set('burstFinal', true);
        }
      });
    return collection.toJSON();
  }

  /* public interface */
  return {
    calc: calculate,
    parse: parse
  };
});
