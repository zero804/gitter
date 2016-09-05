import {equal, ok} from 'assert';
import {spy} from 'sinon';
import Backbone from 'backbone';
import dipatchOnChangeMixin from '../../../../../browser/js/stores/mixins/dispatch-on-change';

let collection;
const Constructor = Backbone.Collection.extend({});
dipatchOnChangeMixin(Constructor);

beforeEach(() => {
  collection = new Constructor();
});

describe('dispatchOnChangeMixin', () => {

  it('should give an object an onChange function', () => {
    ok(collection.onChange);
  });

  it('should call a function assigned within onChange', () => {
    const handle = spy();
    collection.onChange(handle);
    collection.reset([]);
    equal(handle.callCount, 1);
  });

  it('should allow handles to be completely removed', () => {
    const handle = spy();
    collection.onChange(handle);
    collection.removeListeners();
    collection.reset([]);
    equal(handle.callCount, 0);
  });

});
