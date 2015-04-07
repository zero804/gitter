/*jshint unused:true, browser:true*/
define([
  'jquery',
  'underscore',
  'assert',
  'views/base',
  'marionette',
  'collections/base',
  'backbone',
  'cocktail',
  'moment'
], function($, _, assert, TroupeViews, marionette, TroupeCollections, Backbone, cocktail, moment) {
  "use strict";

  /* Sorted Collection */
  var Collection = Backbone.Collection.extend({
    model: Backbone.Model.extend({sync: function() {}}),
    sortByMethods: {
      'sent': function(chat) {
        var sent = chat.get('sent');
        if(!sent) return 0;
        return sent.valueOf();
      }
    },

    initialize: function() {
      this.setSortBy('sent');
    },

    findModelForOptimisticMerge: function(newModel) {
      var optimisticModel = this.find(function(model) {
        return !model.id && model.get('text') === newModel.get('text');
      });

      return optimisticModel;
    },

    sync: function(method, model, options) { if (options.success) options.success(); }
  });
  cocktail.mixin(Collection, TroupeCollections.ReversableCollectionBehaviour);

  /* Marionette Collection View */
  var View = marionette.CollectionView.extend({
    itemView: Backbone.View.extend({
      render: function() {
        this.$el.html(this.model.get('sent')._d.toISOString());
      }
    })
  });
  cocktail.mixin(View, TroupeViews.SortableMarionetteView);

  function createCollection() {
    return new Collection();
  }

  function createView(collection) {
    return new View({ collection: collection });
  }


  describe("Sortable Marionette Collection View", function() {

    var firstOfJan = moment("2013-01-01Z");
    var secondOfJan = moment("2013-01-02Z");
    var thirdOfJan = moment("2013-01-03Z");
    var fourthOfJan = moment("2013-01-04Z");
    var fifthOfJan = moment("2013-01-05Z");
    var sixthOfJan = moment("2013-01-06Z");
    var seventhOfJan = moment("2013-01-07Z");
    var eighthOfJan = moment("2013-01-08Z");
    var ninthOfJan = moment("2013-01-09Z");
    var tenthOfJan = moment("2013-01-10Z");
    var tendays = [firstOfJan, secondOfJan, thirdOfJan, fourthOfJan, fifthOfJan, sixthOfJan, seventhOfJan, eighthOfJan, ninthOfJan, tenthOfJan];

    var collection = createCollection();
    var view = createView(collection);

    it("add the first view", function() {
      var thirdModel = collection.create({ sent: thirdOfJan, text: thirdOfJan });
      assert.equal(collection.at(0).get('sent'), thirdModel.get('sent'));
      assert.equal(view.$el[0].childNodes[0].innerHTML, thirdModel.get('sent')._d.toISOString());
    });

    it ("should add a view before the first one", function() {
      var firstModel = collection.create({ sent: firstOfJan, text: firstOfJan });
      assert.equal(collection.at(0).get('sent'), firstModel.get('sent'));
      assert.equal(view.$el[0].childNodes[0].innerHTML, firstModel.get('sent')._d.toISOString());
    });

    it("should add a view in between two existing", function() {
      var secondModel = collection.create({ sent: secondOfJan, text: secondOfJan });
      assert.equal(collection.at(1).get('sent'), secondModel.get('sent'));
      assert.equal(view.$el[0].childNodes[1].innerHTML, secondModel.get('sent')._d.toISOString());
    });

    it("should add a view at the end", function() {
      var fourthModel = collection.create({ sent: fourthOfJan, text: fourthOfJan });
      assert.equal(collection.at(3).get('sent'), fourthModel.get('sent'));
      assert.equal(view.$el[0].childNodes[3].innerHTML, fourthModel.get('sent')._d.toISOString());
    });

    it("should add views in order even when given in random order", function() {

      var collection = createCollection();
      var view = createView(collection);

      for (var a = 0; a < tendays.length; a++) {
        var i = Math.ceil((Math.random() * tendays.length) - 1);

        collection.create({ sent: tendays[i], text: i });

        for (var b = 0; b < view.$el[0].childNodes.length; b++) {
          // it is less than the view after it
          if (b > 0 && b < view.$el[0].childNodes.length - 1)
            assert(view.$el[0].childNodes[b].innerHTML <= view.$el[0].childNodes[b + 1].innerHTML);
          // it is greater than the view before it
          else if (b > 0)
            assert(view.$el[0].childNodes[b].innerHTML >= view.$el[0].childNodes[b - 1].innerHTML);
        }
      }
    });

    it("should accept the add events in an order that does not match the collection order", function() {
      var collection = createCollection();
      var view = createView(collection);

      // create 5 models and views
      for (var a = 9; a > 5; a--) {
        collection.create({ sent: tendays[a], text: a});
      }

      checkOrder(view);

      // create three models at the beginning without sending out the events
      var m1 = collection.create({ sent: tendays[1], text: 1 }, { silent: true });
      var m2 = collection.create({ sent: tendays[2], text: 2 }, { silent: true });
      var m3 = collection.create({ sent: tendays[3], text: 3 }, { silent: true });
      var m4 = collection.create({ sent: tendays[4], text: 4 }, { silent: true });

      // send through the events such that the new view for position 0 doesn't have a view immediately after it
      m1.trigger('add', m1, collection);
      checkOrder(view, "Incorrect after inserting a new top view that doesn't have a view immediately after it (should be at position 1 now and eventually)");
      // send through the events such that the new view doesn't have a view immediately before it or after it
      m3.trigger('add', m3, collection);
      checkOrder(view, "Incorrect after inserting a new view that doesn't have a view immediately before it or after it (should be at position 2 now and 3 eventually");
      // and it all magically falls into place
      m4.trigger('add', m4, collection);
      checkOrder(view, "Incorrect after inserting a new view that should be at position 3 now and 4 eventually");
      m2.trigger('add', m2, collection);
      checkOrder(view, "Incorrect after inserting a new view that should be at position 2 now and eventually");

    });

    function checkOrder(view, msg) {
      var el = view.$el[0];

      for (var b = 0; b < view.$el[0].childNodes.length; b++) {
        var curInnerHTML = el.childNodes[b].innerHTML;
        // it is less than the view after it
        if (b > 0 && b < view.$el[0].childNodes.length - 1) {
          var nextInnerHTML = view.$el[0].childNodes[b + 1].innerHTML;
          assert(curInnerHTML <= nextInnerHTML, msg || "The view at position "+b+" with value "+curInnerHTML+" is not less than the view after it with value " + nextInnerHTML);
        }
        // it is greater than the view before it
        else if (b > 0) {
          var prevInnerHTML = view.$el[0].childNodes[b - 1].innerHTML;
          assert(curInnerHTML >= prevInnerHTML, msg || "The view at position "+b+" with value "+curInnerHTML+" is not greater than the view before it with value " + prevInnerHTML);
        }
      }
    }
  });

});
