'use strict';

var PrimaryCollectionView = require('../primary-collection/primary-collection-view');
var BaseCollectionView    = require('../base-collection/base-collection-view');

var FavouriteCollection = PrimaryCollectionView.extend({
  getChildContainerToBeIndexed: function () {
    //For the favourite collection we use the first child because there
    //is no search header unlike the primary collection
    return this.el.children[0];
  },

  //JP 29/3/16
  //The primary collection has some show/hide logic around it's search header
  //in the favourite collection we don't have that piece of UI so we override and delegate
  //down to the base class. Not ideal but I don't want to introduce another layer of inheritance
  //between this and the primary collection at this point.
  //If the complexity around this rises I may consider it
  setActive: function (){
    BaseCollectionView.prototype.setActive.apply(this, arguments);
  },

});

module.exports =  FavouriteCollection;
