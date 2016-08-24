import Backbone from 'backbone';

var Model = Backbone.Model.extend({
  defaults: {}
});

export default Backbone.Collection.extend({

  model: Model,

  getReplies: function(){
    return this.models.map(model => model.toJSON());
  }
});
