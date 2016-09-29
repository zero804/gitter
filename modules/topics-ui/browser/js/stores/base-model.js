import Backbone from 'backbone';
import SyncMixin from '../utils/sync-mixin';
import {SYNCED} from '../../../shared/constants/model-states';

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

  parse(res){
    //We only update text when the user locally updates a resource
    //when we get data from the server we need to wipe this out
    return Object.assign({}, res, {
      text: null,
      state: SYNCED
    });
  },

  sync: SyncMixin.sync
});
