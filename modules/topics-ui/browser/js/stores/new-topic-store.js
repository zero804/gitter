//TODO Extend a Topic Model
import Backbone from 'backbone';
import {subscribe} from '../../../shared/dispatcher';
import * as consts from '../../../shared/constants/create-topic';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';

const NewTopicStore = Backbone.Model.extend({

  defaults: {
    title: '',
    body: '',
    categoryId: '',
    tags: [],
  },

  events: [
    'change:title',
    'change:body',
    'change:categoryId',
    'change:tags',
  ],

  initialize(){
    subscribe(consts.TITLE_UPDATE, this.onTitleUpdate, this);
    subscribe(consts.BODY_UPDATE, this.onBodyUpdate, this);
    subscribe(consts.CATEGORY_UPDATE, this.onCategoryUpdate, this);
    subscribe(consts.TAGS_UPDATE, this.onTagsUpdate, this);
  },

  onTitleUpdate(data){
    this.set('title', data.title);
  },

  onBodyUpdate(data){
    this.set('body', data.body);
  },

  onCategoryUpdate(data){
    this.set('categoryId', data.categoryId);
  },

  onTagsUpdate(data){
    const tag = data.tag;
    const currentTags = this.get('tags');
    if(currentTags.indexOf(tag) !== -1) { return; }
    currentTags.push(tag);
    this.set('tags', currentTags);
    //We have to trigger here beacuse backbone will not pickup this change
    //event if we were to `[].concat(currentTags)` we still wouldn't get a
    //change ecebt :(
    this.trigger('change:tags');
  },

  getNewTopic(){
    return this.toJSON();
  },

});

dispatchOnChangeMixin(NewTopicStore);
export default NewTopicStore;
