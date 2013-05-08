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

  describe("Sortable Marionette Collection View", function() {

    var firstOfJan = moment("2013-01-01Z");
    var secondOfJan = moment("2013-01-02Z");
    var thirdOfJan = moment("2013-01-03Z");
    var fourthOfJan = moment("2013-01-04Z");

    it("add the first view", function() {
      var thirdModel = collection.create({ sent: thirdOfJan, text: thirdOfJan });
      assert.equal(collection.at(0).get('sent'), thirdModel.get('sent'));
      assert.equal(view.$el[0].childNodes[0].innerHTML, thirdModel.get('sent').toString());
    });

    it ("should add a view before the first one", function() {
      var firstModel = collection.create({ sent: firstOfJan, text: firstOfJan });
      assert.equal(collection.at(0).get('sent'), firstModel.get('sent'));
      assert.equal(view.$el[0].childNodes[0].innerHTML, firstModel.get('sent').toString());
    });

    it("should add a view in between two existing", function() {
      var secondModel = collection.create({ sent: secondOfJan, text: secondOfJan });
      assert.equal(collection.at(1).get('sent'), secondModel.get('sent'));
      assert.equal(view.$el[0].childNodes[1].innerHTML, secondModel.get('sent').toString());
    });

    it("should add a view at the end", function() {
      var fourthModel = collection.create({ sent: fourthOfJan, text: fourthOfJan });
      assert.equal(collection.at(3).get('sent'), fourthModel.get('sent'));
      assert.equal(view.$el[0].childNodes[3].innerHTML, fourthModel.get('sent').toString());
    });

      /*
      for (var a = 0; a < 5; a++) {
        var d = new Date();
        collection.create({ sent: d, text: new Date() });
        // check collection and view size
        // ensure index in collection is the same as index in view
        // ensure dom element index in parent is the same as index in view
      }
      */
  /*
    function collectionCreate(obj) {
      var cL = collection.length;

      var m = collection.create(obj);

      expect(collection.length).eql(cL + 1);
      expect(view.children.length).eql(cL + 1);

      return m;
    }
  */

  });

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

  var collection = new Collection();

  var View = marionette.CollectionView.extend({
    itemView: backbone.View.extend({
      render: function() {
        this.$el.html(this.model.get('sent').toString());
      }
    }),
    initialize: function() {
      this.collection = collection;
      this.initializeSorting();
    }
  });
  _.extend(View.prototype, TroupeViews.SortableMarionetteView);

  var view = new View();

  if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
  } else {
    mocha.run();
  }

});