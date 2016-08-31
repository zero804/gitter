import Backbone from 'backbone';
import parseReply from '../../../shared/parse/reply';

export const ReplyStore = Backbone.Model.extend({
  defaults: {}
});

export const RepliesStore = Backbone.Collection.extend({

  model: ReplyStore,

  getReplies: function(){
    return this.models.map(model => parseReply(model.toJSON()));
  }
});
