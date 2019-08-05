const mount = require('../../__test__/vuex-mount');
const leftMenuConstants = require('../constants');
const { default: MenuBarItem } = require('./menu-bar-item.vue');

describe('menu-bar-item', () => {
  it('all matches snapshot', () => {
    const { wrapper } = mount(MenuBarItem, {
      type: 'all'
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('when all state, all item has highlight matches snapshot', () => {
    const { wrapper } = mount(
      MenuBarItem,
      {
        type: leftMenuConstants.LEFT_MENU_ALL_STATE
      },
      store => {
        store.state.leftMenuState = leftMenuConstants.LEFT_MENU_ALL_STATE;
      }
    );
    expect(wrapper.element).toMatchSnapshot();
  });

  it('search matches snapshot', () => {
    const { wrapper } = mount(MenuBarItem, {
      type: leftMenuConstants.LEFT_MENU_SEARCH_STATE
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('people matches snapshot', () => {
    const { wrapper } = mount(MenuBarItem, {
      type: leftMenuConstants.LEFT_MENU_PEOPLE_STATE
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('create matches snapshot', () => {
    const { wrapper } = mount(MenuBarItem, {
      type: leftMenuConstants.LEFT_MENU_CREATE_STATE
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('toggle matches snapshot', () => {
    const { wrapper } = mount(MenuBarItem, {
      type: leftMenuConstants.LEFT_MENU_TOGGLE_STATE
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('calls store action "setLeftMenuState" when item is clicked', () => {
    const { wrapper, stubbedActions } = mount(MenuBarItem, {
      type: leftMenuConstants.LEFT_MENU_ALL_STATE
    });

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(stubbedActions.setLeftMenuState).toHaveBeenCalledWith(
      expect.anything(),
      leftMenuConstants.LEFT_MENU_ALL_STATE,
      undefined
    );
  });

  it('calls store action "toggleLeftMenu" with toggled state when active item is clicked', () => {
    const beforeExpandedState = true;
    const { wrapper, stubbedActions } = mount(
      MenuBarItem,
      {
        type: leftMenuConstants.LEFT_MENU_ALL_STATE
      },
      store => {
        store.state.leftMenuState = leftMenuConstants.LEFT_MENU_ALL_STATE;
        store.state.leftMenuExpandedState = beforeExpandedState;
      }
    );

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(stubbedActions.toggleLeftMenu).toHaveBeenCalledWith(
      expect.anything(),
      !beforeExpandedState,
      undefined
    );
  });

  it('calls store action "toggleLeftMenu" with expanded state when new item is clicked', () => {
    const { wrapper, stubbedActions } = mount(
      MenuBarItem,
      {
        type: leftMenuConstants.LEFT_MENU_ALL_STATE
      },
      store => {
        store.state.leftMenuState = leftMenuConstants.LEFT_MENU_SEARCH_STATE;
        store.state.leftMenuExpandedState = false;
      }
    );

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(stubbedActions.toggleLeftMenu).toHaveBeenCalledWith(expect.anything(), true, undefined);
  });
});
