import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import SearchHeader from '../../../../../../shared/containers/components/search/search-header.jsx';

describe.only('<SearchHeader/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<SearchHeader/>);
  });

  it('should render a container', () => {
    equal(wrapper.find('Container').length, 1);
  });

  it('should render a panel', () => {
    equal(wrapper.find('Panel').length, 1);
  });

  it('should render a ForumCategoryLink', () => {
    equal(wrapper.find('ForumCategoryLink').length, 1);
  });

  it('should render a h1', () => {
    equal(wrapper.find('H1').length, 1);
  });

});
