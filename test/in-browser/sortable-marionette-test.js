/*jshint unused:true, browser:true*/
require([
  'jquery',
  'underscore',
  'assert',
  'mocha',
  'views/base',
  'marionette',
  'collections/base',
  'backbone',
  'utils/momentWrapper'
], function($, _, assert, mocha, TroupeViews, marionette, TroupeCollections, backbone, moment) {
  mocha.setup({
    ui: 'bdd',
    timeout: 20000
  });

  /* Sorted Collection */
  var Collection = backbone.Collection.extend({
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

  _.extend(Collection.prototype, TroupeCollections.ReversableCollectionBehaviour);

  /* Marionette Collection View */
  var View = marionette.CollectionView.extend({
    itemView: backbone.View.extend({
      render: function() {
        this.$el.html(this.model.get('sent')._d.toISOString());
      }
    }),
    initialize: function() {
      this.initializeSorting();
    }
  });
  _.extend(View.prototype, TroupeViews.SortableMarionetteView);

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
  });

  if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
  } else {
    mocha.run();
  }

});