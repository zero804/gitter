import { Collection } from 'backbone';
import { UPDATE_ACTIVE_TAG } from '../../../shared/constants/forum-tags';

export default Collection.extend({

  initialize: function(models, attrs) {
    this.router = attrs.router;
    this.listenTo(this.router, 'change:tagName', this.onTagUpdate, this);
  },

  onTagUpdate(model, val){
    this.where({ active: true }).forEach((m) => m.set('active', false));
    const activeModel = this.findWhere({ value: val });
    if(activeModel) { activeModel.set('active', true); }
    this.trigger(UPDATE_ACTIVE_TAG);
  },

  getActiveTagName(){
    return this.findWhere({ active: true }).get('value');
  },

  getTags: function() {
    return this.models.map(model => model.toJSON());
  },
});