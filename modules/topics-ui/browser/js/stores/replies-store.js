import Backbone from 'backbone';
import parseReply from '../../../shared/parse/reply';

var Model = Backbone.Model.extend({
  defaults: {}
});

export default Backbone.Collection.extend({

  model: Model,

  getReplies: function(){
    return this.models.map(model => parseReply(model.toJSON()));
  }
});
