const mount = require('../../__test__/vuex-mount');
const { default: RoomExportModal } = require('./room-export-modal.vue');

describe('Room export modal', () => {
  it('matches snapshot', () => {
    const { wrapper } = mount(RoomExportModal, {
      roomId: '123'
    });
    expect(wrapper.element).toMatchSnapshot();
  });
});
