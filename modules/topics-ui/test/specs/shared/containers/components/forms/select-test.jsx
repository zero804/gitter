import assert from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import Select from '../../../../../../shared/containers/components/forms/select.jsx';

describe('<Select/>', () => {

  let wrapper;
  const options = [
    { label: 'test1', value: '1' },
    { label: 'test2', value: '2' }
  ]
  const defaultValue = 'test1';

  beforeEach(() => {
    wrapper = shallow(
      <Select
        options={options}
        defaultValue={defaultValue}/>
    );
  });

  it('it should return a select with the right class', () => {
    assert.equal(wrapper.find('select').at(0).prop('className'), 'select');
  });

  it('should render an option for each option', () => {
    assert.equal(wrapper.find('option').length, options.length);
  });

});
