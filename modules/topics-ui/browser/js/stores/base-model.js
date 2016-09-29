import Backbone from 'backbone';
import SyncMixin from '../utils/sync-mixin';

export const BaseModel = Backbone.Model.extend({
  sync: SyncMixin.sync
});
