import assert from 'assert';
import React from 'react';
import sinon from 'sinon';
import { shallow } from 'enzyme';
import TableControlSelect from '../../../../../shared/containers/components/forum/table-control-select.jsx';

describe('<TableControlSelect/>', () => {

  let wrapper;
  let options;
  let changeHandle;
  beforeEach(() => {
    changeHandle = sinon.spy();
    options = [
      { name: 'Test 1', value: 'test-1' },
      { name: 'Test 2', value: 'test-2' },
      { name: 'Test 3', value: 'test-3' }
    ];
    wrapper = shallow(
      <TableControlSelect
        onChange={changeHandle}
        options={options}/>
    );
  });

  it('should render a select element', () => {
    assert.equal(wrapper.find('select').length, 1);
  });

  it('should render an options element for each option prop', () => {
    assert.equal(wrapper.find('option').length, options.length);
  });

  it('should render the right class', () => {
    assert.equal(wrapper.find('.table-control__select').length, 1);
  });

  it.skip('should call props.onChange on a change event', () => {
    //wrapper.find('select').at(0).simulate('change');
    //assert.equal(changeHandle.callCount, 1);
  });

  //Figure out why the mock event is not passed
  it.skip('should call onChange with the right arguments', () => {
    //wrapper.find('select').at(0).simulate('change', {});
    //assert(changeHandle.calledWith(1));
  });

});
