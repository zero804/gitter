import Backbone from 'backbone';
import $ from 'jquery';
import parseReply from '../../../shared/parse/reply';
import {subscribe} from '../../../shared/dispatcher';
import {SUBMIT_NEW_REPLY, REPLY_CREATED} from '../../../shared/constants/create-reply';

export const ReplyStore = Backbone.Model.extend({
  defaults: {},
  url(){
    const forumId = this.collection.getForumId();
    const topicId = this.collection.getTopicId();
    return this.get('id') ? null : `/api/v1/forums/${forumId}/topics/${topicId}/replies`;
  },

  sync(){
    //Need to abstract and pull in the apiClient here so this is a bodge
    const headers = { "x-access-token": this.collection.getAccessToken() }
    const data = JSON.stringify(this.toJSON());

    $.ajax({
      url: this.url(),
      contentType: 'application/json',
      type: 'POST',
      headers: headers,
      data: data,
      success: this.onSuccess.bind(this),
      error: this.onError.bind(this),
    })
  },

  onSuccess(attrs) {
    this.set(attrs);
    this.trigger(REPLY_CREATED, this);
  },

  onError(err){},
});

export const RepliesStore = Backbone.Collection.extend({

  model: ReplyStore,

  initialize(models, attrs){
    this.accessTokenStore = attrs.accessTokenStore;
    this.router = attrs.router;
    this.forumStore = attrs.forumStore;
    this.topicsStore = attrs.topicsStore;
    subscribe(SUBMIT_NEW_REPLY, this.createNewReply, this);
  },

  getReplies: function(){
    return this.models.map(model => parseReply(model.toJSON()));
  },

  createNewReply(data){
    const newReply = this.create({ text: data.body });
    newReply.on(REPLY_CREATED, () => {
      this.trigger(REPLY_CREATED);
    });
  },

  getAccessToken(){
    return this.accessTokenStore.get('accessToken');
  },

  getForumId(){
    return this.forumStore.get('id');
  },

  getTopicId(){
    const topic = this.topicsStore.get(this.router.get('topicId'));
    if(!topic) { return; }
    return topic.get('id');
  }

});
