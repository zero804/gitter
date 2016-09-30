import Backbone from 'backbone';
import { UPDATE_ACTIVE_TAG } from '../../../shared/constants/forum-tags';
import {DEFAULT_TAG_VALUE} from '../../../shared/constants/forum-tags';
import router from '../routers/index';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';

const serverStore = (window.context.tagStore || {});
const serverData = (serverStore.data || []);

export const ForumTagStore = Backbone.Collection.extend({

  initialize: function() {
    this.listenTo(router, 'change:tagName', this.onTagUpdate, this);
  },

  onTagUpdate(model, val){
    this.where({ active: true }).forEach((m) => m.set('active', false));
    const activeModel = this.findWhere({ value: val });
    if(activeModel) { activeModel.set('active', true); }
    this.trigger(UPDATE_ACTIVE_TAG);
  },

  getActiveTagName(){
    const model = this.findWhere({ active: true });
    if(!model) { return; }
    model.get('value');
  },

  getTags() {
    return this.models.map(model => model.toJSON());
  },

  getTagsByLabel(values){
    values = (values || []);
    return values.map((val) => {
      const model = this.findWhere({label: val});
      if(!model) { return; }
      return model.toJSON();
    });
  },

  pluckValues(){
    //For some reason pluck doesn't work here :(
    //We slice here to remove the "All Tags" entry
    return this.models
      .filter((t) => t.attributes.value !== DEFAULT_TAG_VALUE)
      .map(m => m.get('label'));
  }

});

dispatchOnChangeMixin(ForumTagStore);


let store;
export function getForumTagStore(data){
  if(!store) { store = new ForumTagStore(serverData); }
  if(data) { store.set(data); }
  return store;
}
