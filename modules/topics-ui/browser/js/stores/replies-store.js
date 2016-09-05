import Backbone from 'backbone';
import $ from 'jquery';
import parseReply from '../../../shared/parse/reply';
import {subscribe} from '../../../shared/dispatcher';
import {SUBMIT_NEW_REPLY, REPLY_CREATED} from '../../../shared/constants/create-reply';
import LiveCollection from './live-collection';
import {getRealtimeClient} from './realtime-client';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';

export const ReplyStore = Backbone.Model.extend({
  defaults: {},
  url(){
    const forumId = this.collection.getForumId();
    const topicId = this.collection.getTopicId();
    return this.get('id') ? null : `/api/v1/forums/${forumId}/topics/${topicId}/replies`;
  },

  sync(method, model, options){
    //Need to abstract and pull in the apiClient here so this is a bodge
    const headers = { "x-access-token": this.collection.getAccessToken() }
    const data = JSON.stringify(this.toJSON());

    $.ajax({
      url: this.url(),
      contentType: 'application/json',
      type: 'POST',
      headers: headers,
      data: data,
      success: (data) => {
        options.success(data);
        this.onSuccess();
      },
      error: () => {
        //Dome some error shiz
      }
    })
  },

  onSuccess() {this.trigger(REPLY_CREATED, this);}
});

export const RepliesStore = dispatchOnChangeMixin(LiveCollection.extend({

  model: ReplyStore,
  client: getRealtimeClient(),
  urlTemplate: '/v1/forums/:forumId/topics/:topicId/replies',
  getContextModel(attrs){
    return new Backbone.Model({
      forumId: attrs.forumStore.get('id'),
      topicId: attrs.router.get('topicId'),
    });
  },

  initialize(models, attrs){
    this.accessTokenStore = attrs.accessTokenStore;
    this.router = attrs.router;
    this.forumStore = attrs.forumStore;
    this.topicsStore = attrs.topicsStore;
    this.currentUserStore = attrs.currentUserStore;
    subscribe(SUBMIT_NEW_REPLY, this.createNewReply, this);
  },

  getReplies: function(){
    return this.models.map(model => {
      return parseReply(model.toJSON())
    });
  },

  createNewReply(data){
    this.create({
      text: data.body,
      user: this.currentUserStore.getCurrentUser()
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

}));
