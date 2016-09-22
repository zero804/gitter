import Backbone from 'backbone';
import { BaseModel } from './base-model';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';

export const CommentStore = BaseModel.extend({
  url(){
    //TODO
  }
});

export const CommentsStore = Backbone.Collection.extend({
  getContextModel(){
    return new Backbone.Model({
      replyId: null,
    });
  },

  getComments(){
    //TODO
  }

});

dispatchOnChangeMixin(CommentsStore);

let store;

export function getCommentsStore(){
  if(!store) { store = new CommentsStore(); }
  return store;
}
