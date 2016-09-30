import Backbone from 'backbone';
import data from './mock-data/new-reply';

var NewReplyStore = Backbone.Model.extend({
  onReplyBodyUpdate: function({value}) {
    this.set('text', value);
  },

  getTextContent: function() {
    this.get('text');
  },

  onReplySubmit: function() {
    this.set('text', '');
  }
});

var store = new NewReplyStore(data);

afterEach(function(){
  store.set(data);
});

export default store;
