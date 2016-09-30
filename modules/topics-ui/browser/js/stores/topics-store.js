import Backbone from 'backbone';
import _ from 'lodash';
import {subscribe, unsubscribe} from '../../../shared/dispatcher';
import SimpleFilteredCollection from 'gitter-realtime-client/lib/simple-filtered-collection';

import LiveCollection from './live-collection';
import {BaseModel} from './base-model';

import parseTopic from '../../../shared/parse/topic';
import parseTag from '../../../shared/parse/tag';
import {getRealtimeClient} from './realtime-client';
import {getForumId } from './forum-store';
import router from '../routers';
import {getCurrentUser} from '../stores/current-user-store';

import dispatchOnChangeMixin from './mixins/dispatch-on-change';

import {SUBMIT_NEW_TOPIC, TOPIC_CREATED} from '../../../shared/constants/create-topic';
import {DEFAULT_CATEGORY_NAME, DEFAULT_TAG_NAME} from '../../../shared/constants/navigation';
import {FILTER_BY_TOPIC} from '../../../shared/constants/forum-filters';
import {MOST_WATCHERS_SORT} from '../../../shared/constants/forum-sorts';

import {
  TITLE_UPDATE,
  BODY_UPDATE,
  CATEGORY_UPDATE,
  TAGS_UPDATE,
} from '../../../shared/constants/create-topic';

import {
  UPDATE_TOPIC,
  UPDATE_CANCEL_TOPIC,
  UPDATE_SAVE_TOPIC
} from '../../../shared/constants/topic';

import {
  UPDATE_TOPIC_SUBSCRIPTION_STATE,
  REQUEST_UPDATE_TOPIC_SUBSCRIPTION_STATE,
  SUBSCRIPTION_STATE_PENDING
} from '../../../shared/constants/forum.js';

import {MODEL_STATE_DRAFT, MODEL_STATE_SYNCED} from '../../../shared/constants/model-states';

const modelDefaults = {
  title: '',
  text: '',
  categoryId: '',
  tags: [],
};

export const TopicModel = BaseModel.extend({

  // Theres a problem with the realtime client here. When a message comes in from
  // the realtime connection it will create a new model and patch the values onto an existing model.
  // If you have any defaults the patch model with override the current models values with the defaults.
  // Bad Times.
  //
  // via @cutandpastey, https://github.com/troupe/gitter-webapp/pull/2293#discussion_r81304415
  defaults: {
    state: MODEL_STATE_DRAFT,
  },

  initialize(attrs = {}){
    //If the model is initialized by the application it will be in a draft state
    //In this case we need to setup listeners for the createTopic modal events
    //which will update the draft content
    if(this.get('state') === MODEL_STATE_DRAFT || attrs.state === MODEL_STATE_DRAFT) {
      this.listenToDraftUpdates();
    }

    //When this model is saved/edited we need to clear out all listeners and
    //add any newly appropriate ones like updating content etc
    this.listenTo(this, 'change:state', this.onChangeState, this);
  },


  //Listen out for any events that will update the model through UI actions
  //Typically found in the create-topic-modal used to make new topics
  listenToDraftUpdates(){
    subscribe(TITLE_UPDATE, this.onTitleUpdate, this);
    subscribe(BODY_UPDATE, this.onBodyTextUpdate, this);
    subscribe(CATEGORY_UPDATE, this.onCategoryUpdate, this);
    subscribe(TAGS_UPDATE, this.onTagsUpdate, this);
    subscribe(SUBMIT_NEW_TOPIC, this.onRequestSave, this);
  },

  //When we change state, mainly through saving the model we need to
  //clear out all the listeners that update a given model this means
  //you can craete new topics without updating the wrong model as that would be silly...
  clearSystemListeners(){
    unsubscribe(TITLE_UPDATE, this.onTitleUpdate, this);
    unsubscribe(BODY_UPDATE, this.onBodyTextUpdate, this);
    unsubscribe(CATEGORY_UPDATE, this.onCategoryUpdate, this);
    unsubscribe(TAGS_UPDATE, this.onTagsUpdate, this);
    unsubscribe(SUBMIT_NEW_TOPIC, this.onRequestSave, this);
  },

  onChangeState(){
    this.clearSystemListeners();
    //Initialize any draft listeners such that we can update the draft model
    switch(this.get('state')) {
      case MODEL_STATE_DRAFT: return this.listenToDraftUpdates();
    }
  },

  //Update the models title when a user updates it through the UI
  onTitleUpdate({ title }){
    this.set('title', title);
  },

  //Update the models body
  onBodyTextUpdate({body}){
    this.set('text', body);
  },

  //Change category
  onCategoryUpdate({categoryId}){
    this.set('categoryId', categoryId);
  },

  //Add tags
  //TODO we need to think about events that would remove tags from this array
  //typically when a user de-selects them in the modal
  onTagsUpdate(data){
    const tag = data.tag;
    const currentTags = this.get('tags') || [];
    if(currentTags.indexOf(tag) !== -1) { return; }
    currentTags.push(tag);
    this.set('tags', currentTags);

    // We have to trigger here beacuse backbone will not pickup this change
    // event if we were to `[].concat(currentTags)` we still wouldn't get a
    // change event :(
      this.trigger('change:tags');
  },

  onRequestSave() {
    //When we have saved back to the server then we need to change route
    //we do this here by triggering this event
    this.listenTo(this, 'sync', function(){
      this.trigger(TOPIC_CREATED, this.get('id'), this.get('slug'));
    });

    //Save the model back to the server
    this.save();
  },

  //The API endpoints used to save and update the model
  //we know we have not previously saved a model if we have no idea
  //so we derive a different url respectively
  url(){
    return this.get('id') ?
    `/v1/forums/${getForumId()}/topics/${this.get('id')}`:
    `/v1/forums/${getForumId()}/topics`;
  },

  validate(attributes){
    let errors = new Map();

    if(!attributes.title || !attributes.title.length) {
      errors.set('title', 'A new Topic requires a title');
    }

    //Only check the text attribute if we are in a draft state
    //Otherwise we are probably getting something back from the server
    //and we certainly dont want the text attribute in that case
    if(attributes.state === MODEL_STATE_DRAFT && (!attributes.text || !attributes.text.length)) {
      errors.set('text', 'A new Topic requires content');
    }

    //If we are editing a topic we have a category
    //If we are creating a new one we need a categoryId
    if(!attributes.category && (!attributes.categoryId || !attributes.categoryId.length)) {
      errors.set('categoryId', 'A new Topic must have a category');
    }

    return errors.size ? errors : null;
  },

  toPOJO() {
    var data = this.attributes;
    data.tags = (data.tags || []);

    return Object.assign({}, modelDefaults, data, {
      tags: data.tags.map(parseTag)
    });
  },

  //Used when saving as we have to clean tags that have been parsed
  getDataToSave(){
    const data = this.toPOJO();
    const tags = (data.tags || []);
    const parsedTags = tags.map((t) => t.label);

    return Object.assign({}, data, {
      tags: parsedTags
    });
  },

  parse(attrs){
    return Object.assign({}, attrs, {
      //When we have received data from the server we can assume
      //that it is no longer a draft or has been edited
      state: MODEL_STATE_SYNCED,
      text: null
    });
  }

});

export const TopicsLiveCollection = LiveCollection.extend({

  model: TopicModel,
  client: getRealtimeClient(),
  urlTemplate: '/v1/forums/:forumId/topics',

  getContextModel(){
    return new Backbone.Model({
      forumId: getForumId()
    });
  },

  initialize(){
    subscribe(UPDATE_TOPIC, this.onTopicUpdate, this);
    subscribe(UPDATE_CANCEL_TOPIC, this.onTopicEditCancel, this);
    subscribe(UPDATE_SAVE_TOPIC, this.onTopicEditSaved, this);
    this.listenTo(router, 'change:createTopic', this.onCreateTopicChange, this);
  },

  //The default case for snapshots is to completely reset the collection
  //to a safe server state. As we hold draft topics in the collection this
  //is problematic. Here, we need to grab the draft model and re-add it once
  //the snapshot has been handled. It would be much nicer to be able to pass remove: false
  //to this function to avoid this
  handleSnapshot(){
    const draftModel = this.findWhere({ state: MODEL_STATE_DRAFT });
    LiveCollection.prototype.handleSnapshot.apply(this, arguments);
    if(!draftModel) { return; }
    this.add(draftModel);
  },

  //When a user updates the content of a pre-existing topic then update here
  //TODO we should put the model in a "edited" state and allow it to update itself
  onTopicUpdate({text}) {
    const topicId = router.get('topicId');
    const model = this.get(topicId);
    if(!model) { return; }
    model.set('text', text);
  },

  //If a user presses the cancel button reset the text
  //this will cause body.html to be displayed
  //TODO we should reset the models state to synced here
  onTopicEditCancel(){
    const topicId = router.get('topicId');
    const model = this.get(topicId);
    if(!model) { return; }
    model.set('text', null);
  },

  //When a user clicks save on the editor we must save it back to the server
  //TODO we should migrate this up into the model itself
  onTopicEditSaved(){
    const topicId = router.get('topicId');
    const model = this.get(topicId);
    if(!model) { return; }
    const text = model.get('text');
    if(!text) { return; }
    model.save({ text: model.get('text') }, { patch: true });
  },

  //If a user visits or returns from /create-topic we must either:
  //1, create a new draft model
  //2, remove a draft model from the collection
  onCreateTopicChange(){
    const isCreatingTopic = router.get('createTopic');
    if(isCreatingTopic) { return this.addNewDraftItem(); }
    return this.removeDraftItems();
  },

  //Add a draft model
  addNewDraftItem(){
    const model = new TopicModel({ state: MODEL_STATE_DRAFT });
    this.add(model);
  },

  //Remove a draft model
  removeDraftItems(){
    const models = this.filter((model) => model.get('state') === MODEL_STATE_DRAFT);
    this.remove(models);
  }

});

export class TopicsStore {

  constructor(models, options) {
    //Get access to listenTo etc
    _.extend(this, Backbone.Events);

    //Make a new live collection
    this.topicCollection = new TopicsLiveCollection(models, options);

    //This filtered collection will allow us to filter out any models based on the url state
    this.collection = new SimpleFilteredCollection([], {
      collection: this.topicCollection,
      filter: this.getFilter(),
      comparator: (a, b) => {
        const sort = router.get('sortName');
        if(sort === MOST_WATCHERS_SORT) {
          return (b.get('replyingUsers').length - a.get('replyingUsers').length);
        }
        return new Date(b.get('sent')) - new Date(a.get('sent')) ;
      }
    });

    this.listenTo(router, 'change:categoryName change:tagName change:filterName', this.onRouterUpdate, this);
    this.listenTo(router, 'change:sortName', this.onSortUpdate, this);

    //Proxy events from the filtered collection
    this.listenTo(this.collection, 'all', (type, collection, val) => {
      this.trigger(type, collection, val);
    });

    //Proxy up events from a draft model that is being updated
    this.listenTo(this.topicCollection, 'change:title', (model, val, options) => {
      this.trigger('change:title', model, val, options);
    });

    this.listenTo(this.topicCollection, 'change:text', (model, val, options) => {
      this.trigger('change:text', model, val, options);
    });

    this.listenTo(this.topicCollection, 'change:categoryId', (model, val, options) => {
      this.trigger('change:categoryId', model, val, options);
    });

    this.listenTo(this.topicCollection, 'change:tags', (model, val, options) => {
      this.trigger('change:tags', model, val, options);
    });

    this.listenTo(this.topicCollection, 'invalid', (model, val, options) => {
      this.trigger('invalid', model, val, options);
    });


    //TODO figure out why we need to call a filter here
    //I think this is due to a race condition, manually calling here fixes this
    //but it is less than ideal
    this.listenTo(this.topicCollection, TOPIC_CREATED, (topicId, slug) => {
      this.collection.setFilter(this.getFilter());
      this.trigger(TOPIC_CREATED, topicId, slug);
    });

    subscribe(REQUEST_UPDATE_TOPIC_SUBSCRIPTION_STATE, this.onRequestSubscriptionStateUpdate, this);
    subscribe(UPDATE_TOPIC_SUBSCRIPTION_STATE, this.onSubscriptionStateUpdate, this);
  }

  getFilter() {
    const categorySlug = (router.get('categoryName') || DEFAULT_CATEGORY_NAME);
    const tagName = (router.get('tagName') || DEFAULT_TAG_NAME);
    const currentUser = getCurrentUser();
    const filterName = router.get('filterName');

    //We must return a new function here to avoid caching issues within simpleFilteredCollection
    return function(model){

      //Never show draft models
      if(model.get('state') === MODEL_STATE_DRAFT) { return false; }

      //filter by category
      const category = (model.get('category') || {});
      let categoryResult = false;
      if(categorySlug === DEFAULT_CATEGORY_NAME) { categoryResult = true; }
      if(category.slug === categorySlug) { categoryResult = true; }

      if(categoryResult === false) { return false; }

      const tags = (model.get('tags') || []);
      let tagResult = false;
      if(tagName === DEFAULT_TAG_NAME) { tagResult = true; }
      else { tagResult = tags.some((t) => t === tagName); }

      if(tagResult === false) { return false; }

      if(filterName === FILTER_BY_TOPIC && model.get('user').username !== currentUser.username) {
        return false;
      }

      return true;

    }
  }

  //Return all the viable models in the collection to the UI
  getTopics() {
    return this.collection.map(model => {
      return parseTopic(model.toPOJO());
    });
  }

  //Return a draft model to the UI as it is removed from teh filtered collection
  //we need an extra function
  getDraftTopic(){
    const model = this.topicCollection.findWhere({ state: MODEL_STATE_DRAFT });

    //Return a sensible default
    if(!model) { return _.extend({}, modelDefaults); }

    //Or just return the model
    return Object.assign({}, model.toPOJO(), {
      //Add the validation errors into the returned data
      //so we can show validation errors
      validationError: model.validationError
    });
  }

  //Get a model by its ID attribute
  getById(id) {
    const model = this.collection.get(id);
    if(!model) { return; }
    return parseTopic(model.toPOJO());
  }

  //Whenever the router updates make sure we have to
  //correctly filtered models to give to the UI
  onRouterUpdate() {
    this.collection.setFilter(this.getFilter());
  }

  //Sort your bad self
  onSortUpdate(){
    this.collection.sort();
  }

  onRequestSubscriptionStateUpdate({topicId}) {
    var topic = this.collection.get(topicId);
    if(!topic) { return; }

    topic.set({
      subscriptionState: SUBSCRIPTION_STATE_PENDING
    });
  }

  onSubscriptionStateUpdate(data) {
    var {topicId, state} = data;
    var topic = this.collection.get(topicId);
    if(!topic) { return; }

    topic.set({
      subscriptionState: state
    });
  }

}

//All events that must be observed
dispatchOnChangeMixin(TopicsStore, [
  'sort',
  'change:text',
  'change:subscriptionState',
  'change:title',
  'change:text',
  'change:body',
  'change:categoryId',
  'change:tags',
  'invalid'
]);

const serverStore = (window.context.topicsStore || {});
const serverData = (serverStore.data || []);
let store;
export function getTopicsStore(data){
  if(!store) { store = new TopicsStore(serverData); }
  //TODO remove, this was for testing and to be frank is slightly dangerous...
  if(data) { store.set(data); }
  return store;
}
