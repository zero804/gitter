'use strict';

const mount = require('../../vuex-mount');
const {
  default: ListItem
} = require('../../../../../public/js/vue/left-menu/components/list-item.vue');

const {
  createSerializedRoomFixture,
  createSerializedOneToOneRoomFixture
} = require('../../fixture-helpers');

describe('list-item', () => {
  it('community room matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
      item: createSerializedRoomFixture('my-community/community')
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room with short name matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
      item: createSerializedRoomFixture('foo/bar')
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room with long name matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
      item: createSerializedRoomFixture('abcdefghijklmnop/qrstuvwxyz')
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('one to one room matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
      item: createSerializedOneToOneRoomFixture('EricGitterTester')
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('favourite room matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
      item: {
        ...createSerializedRoomFixture('my-community/community'),
        favourite: 1
      }
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('active room matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
      item: createSerializedRoomFixture('my-community/room1'),
      active: true
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('favourite loading room matches snapshot', () => {
    const { wrapper } = mount(ListItem, {
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
    const { wrapper, stubbedActions } = mount(ListItem, {
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
