import Backbone from 'backbone';
import SyncMixin from '../utils/sync-mixin';

export const BaseModel = Backbone.Model.extend({
  /**
   * Return a simple pojo of the object used for
   * presenting a view to a user
   */
  toPOJO() {
    // By default, toPOJO is the same as toJSON
    // but ancestor classes can override it
    return this.toJSON();
  },
  sync: SyncMixin.sync
});
