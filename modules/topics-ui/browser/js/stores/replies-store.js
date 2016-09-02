import Backbone from 'backbone';
import $ from 'jquery';
import parseReply from '../../../shared/parse/reply';
import {subscribe} from '../../../shared/dispatcher';
import {SUBMIT_NEW_REPLY} from '../../../shared/constants/create-reply';
import LiveCollection from './live-collection';
import {getRealtimeClient} from './realtime-client';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';
import {getAccessToken} from './access-token-store';
import {getCurrentUser} from './current-user-store';
import {getForumId} from './forum-store'

export const ReplyStore = Backbone.Model.extend({
  defaults: {},
  url(){
    const topicId = this.collection.getTopicId();
    return this.get('id') ? null : `/api/v1/forums/${getForumId()}/topics/${topicId}/replies`;
  },

  sync(method, model, options){
    //Need to abstract and pull in the apiClient here so this is a bodge
    const headers = { "x-access-token": getAccessToken() }
    const data = JSON.stringify(this.toJSON());

    $.ajax({
      url: this.url(),
      contentType: 'application/json',
      type: 'POST',
      headers: headers,
      data: data,
      success: options.success
    });
  }

});

export const RepliesStore = dispatchOnChangeMixin(LiveCollection.extend({

  model: ReplyStore,
  client: getRealtimeClient(),
  urlTemplate: '/v1/forums/:forumId/topics/:topicId/replies',

  getContextModel(attrs){
    return new Backbone.Model({
      forumId: getForumId(),
      topicId: attrs.router.get('topicId'),
    });
  },

  initialize(models, attrs){
    this.router = attrs.router;
    this.topicsStore = attrs.topicsStore;
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
      user: getCurrentUser(),
    });
  },

  getTopicId(){
    return this.router.get('topicId');
  }

}));
