"use strict";

var ItemView = require('backbone.marionette').ItemView;
var _super = ItemView.prototype;

module.exports = ItemView.extend({
  //Put everything in the constructo so it can't be overridden
  //also won't get in the way of any modelEvents hashes
  constructor: function (attrs, options){
    var model = (this.model || attrs.model);
    this.listenTo(model, 'change:focus', this.onModelChangeFocus, this);
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

  render: function (){
    _super.render.apply(this, arguments);
    //I don't want to provide a onRender as this is easy to forget to override
    //adding this assignment here is a bit dodge but gets the job done in the safest way possible
    this.activeElement = this.el.querySelector('a') || this.el.querySelector('button');
    if(this.model.get('focus')) { this.el.classList.add('focus'); }
  },

});
