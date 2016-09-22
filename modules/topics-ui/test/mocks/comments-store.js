import Backbone from 'backbone';

var CommentsStore = Backbone.Collection.extend({
  getComments(){ return this.toJSON(); },
  getCommentsByReplyId(){ return []; }
});

var store = new CommentsStore();
export default store;
