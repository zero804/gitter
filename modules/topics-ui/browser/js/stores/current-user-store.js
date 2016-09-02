import Backbone from 'backbone';

export default Backbone.Model.extend({
  defaults: {},
  getCurrentUser(){ return this.toJSON(); }
});
