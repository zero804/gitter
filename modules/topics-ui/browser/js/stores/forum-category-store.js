import { Collection } from 'backbone';
import { UPDATE_ACTIVE_CATEGORY } from '../../../shared/constants/forum-categories';
import router from '../routers/index';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';
import { BaseModel } from './base-model';

var CategoryModel = BaseModel.extend({
  defaults: { category: null },
});

export const ForumCategoryStore = Collection.extend({
  model: CategoryModel,

  initialize: function() {
    this.listenTo(router, 'change:category', this.onCategoryUpdate, this);
  },

  getCategories: function() {
    return this.map(model => model.toPOJO());
  },

  getActiveCategoryName() {
    const activeModel = this.findWhere({ active: true });
    return activeModel && activeModel.get('category');
  },

  onCategoryUpdate(model, val){
    this.where({ active: true }).forEach((m) => m.set('active', false));
    var activeModel = this.findWhere({ category: val });
    if(activeModel) { activeModel.set('active', true); }
    this.trigger(UPDATE_ACTIVE_CATEGORY);
  },

  mapForSelectControl(){
    return this.models.map((m) => ({
      selected: m.get('active'),
      label: m.get('label') || m.get('category'),
      value: m.get('id')
    }))
  },

  getById(id){
    const model = this.get(id);
    if(!model) { return; }
    return model.toPOJO();
  }

});

dispatchOnChangeMixin(ForumCategoryStore);

const serverStore = (window.context.categoryStore || {});
const serverData = (serverStore.data || []);
let store;
export function getForumCategoryStore(data) {
  if(!store) { store = new ForumCategoryStore(serverData); }
  if(data) { store.reset(data); }
  return store;
}
