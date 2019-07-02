'use strict';

const mount = require('../vuex-mount');
const {
  default: LoadingSpinner
} = require('../../../../public/js/vue/components/loading-spinner.vue');

describe('loading-spinner', () => {
  it('matches snapshot', () => {
    const { wrapper } = mount(LoadingSpinner);
    expect(wrapper.element).toMatchSnapshot();
  });
});
