import Backbone from 'backbone';

var CommentsStore = Backbone.Collection.extend({
  getComments(){ return this.toJSON(); },
  getCommentsByReplyId(){ return []; },
  getActiveReplyId() { return 1; }
});

var store = new CommentsStore();
export default store;
