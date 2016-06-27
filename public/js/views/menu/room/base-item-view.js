"use strict";

var ItemView = require('backbone.marionette').ItemView;
var _super = ItemView.prototype;

module.exports = ItemView.extend({
  //Put everything in the constructo so it can't be overridden
  //also won't get in the way of any modelEvents hashes
  constructor: function (attrs, options){
    var model = (this.model || attrs.model);
    this.listenTo(model, 'change:focus', this.onModelChangeFocus, this);
    //Manually listen to the render event to guard against onRender being overridden
    this.listenTo(this, 'render', this.afterRender, this);
    _super.constructor.apply(this, arguments);
  },

  onModelChangeFocus: function (model, val){
    return (!!val) ? this.focusElement() : this.blurElement();
  },

  focusElement: function (){
    this.el.classList.add('focus');
    this.activeElement.focus();
  },

 blurElement: function (){
    this.el.classList.remove('focus');
    this.activeElement.blur();
  },

  afterRender: function (){
    this.activeElement = this.el.querySelector('a') || this.el.querySelector('button');
    if(this.model.get('focus')) { this.el.classList.add('focus'); }
  }

});
