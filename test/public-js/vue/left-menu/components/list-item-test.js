'use strict';

const { createLocalVue, shallowMount } = require('@vue/test-utils');
const Vuex = require('vuex');

const createStore = require('../../../../../public/js/vue/store').default;
const actions = require('../../../../../public/js/vue/store/actions');
const ListItem = require('../../../../../public/js/vue/left-menu/components/list-item.vue');

const {
  createSerializedRoomFixture,
  createSerializedOneToOneRoomFixture
} = require('../../fixture-helpers');

let wrapper;
let stubbedActions = {};
function factory(propsData = {}, extendStore = () => {}) {
  const localVue = createLocalVue();
  localVue.use(Vuex);

  Object.keys(actions).forEach(actionKey => {
    stubbedActions[actionKey] = jest.fn();
  });

  const store = createStore({
    actions: stubbedActions
  });
  extendStore(store);

  wrapper = shallowMount(ListItem.default, {
    localVue,
    store,
    propsData
  });
}

describe('list-item', () => {
  afterEach(() => {
    wrapper.destroy();
  });

  it('community room matches snapshot', () => {
    factory({
      item: createSerializedRoomFixture('my-community/community')
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room with short name matches snapshot', () => {
    factory({
      item: createSerializedRoomFixture('foo/bar')
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room with long name matches snapshot', () => {
    factory({
      item: createSerializedRoomFixture('abcdefghijklmnop/qrstuvwxyz')
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('one to one room matches snapshot', () => {
    factory({
      item: createSerializedOneToOneRoomFixture('EricGitterTester')
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('favourite room matches snapshot', () => {
    factory({
      item: {
        ...createSerializedRoomFixture('my-community/community'),
        favourite: 1
      }
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('favourite loading room matches snapshot', () => {
    factory({
      item: {
        ...createSerializedRoomFixture('my-community/community'),
        favourite: 1,
        loading: true
      }
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('calls store action "changeDisplayedRoom" and "toggleLeftMenu" when item is clicked', () => {
    const room = createSerializedRoomFixture('my-community/community');
    factory({
      item: room
    });

    wrapper.find({ ref: 'link' }).trigger('click');

    expect(stubbedActions.changeDisplayedRoom).toHaveBeenCalledWith(
      expect.anything(),
      room.id,
      undefined
    );

    expect(stubbedActions.toggleLeftMenu).toHaveBeenCalledWith(expect.anything(), false, undefined);
  });
});
