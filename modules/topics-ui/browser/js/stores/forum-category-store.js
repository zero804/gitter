import { Collection, Model } from 'backbone';
import { UPDATE_ACTIVE_CATEGORY } from '../../../shared/constants/forum-categories';
import router from '../routers/index';
import dispatchOnChangeMixin from './mixins/dispatch-on-change';

var CategoryModel = Model.extend({
  defaults: { category: null },
});

export const ForumCategoryStore = Collection.extend({
  model: CategoryModel,

  initialize: function() {
    this.listenTo(router, 'change:categoryName', this.onCategoryUpdate, this);
  },

  getCategories: function() {
    return this.models.map(model => model.toJSON());
  },

  getActiveCategoryName(){
    return this.findWhere({ active: true }).get('category');
  },

  onCategoryUpdate(model, val){
    this.where({ active: true }).forEach((m) => m.set('active', false));
    var activeModel = this.findWhere({ slug: val });
    if(activeModel) { activeModel.set('active', true); }
    this.trigger(UPDATE_ACTIVE_CATEGORY);
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
