import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import SearchHeader from '../../../../../../shared/containers/components/search/search-header.jsx';

describe('<SearchHeader/>', () => {

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

});
