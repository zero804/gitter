const mount = require('../../__test__/vuex-mount');
const { default: UserExportModal } = require('./user-export-modal.vue');

const STUB_USER = {
  id: '123'
};

describe('User export modal', () => {
  it('matches snapshot', () => {
    const { wrapper } = mount(UserExportModal, {}, store => {
      store.state.user = STUB_USER;
    });
    expect(wrapper.element).toMatchSnapshot();
  });
});
