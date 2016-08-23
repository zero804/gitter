import { equal } from 'assert';
import React from 'react';
import sinon from 'sinon';
import { shallow } from 'enzyme';
import Editor from '../../../../../../shared/containers/components/forms/editor.jsx';

describe('<Editor/>', () => {

  let wrapper;
  let changeHandle;

  beforeEach(() => {
    changeHandle = sinon.spy();
    wrapper = shallow(
      <Editor className="test" name="test" onChange={changeHandle}>
        thi sis some text
      </Editor>
    );
  });

  it('should render a text area', () => {
    equal(wrapper.find('textarea').length, 1);
  });

  it('should render an .editor class', () => {
    equal(wrapper.find('.editor').length, 1);
  });

  it('should render a custom class if provided', () => {
    equal(wrapper.find('.test').length, 1);
  });

  it('should pass down a name if provided', () => {
    equal(wrapper.find('textarea').at(0).prop('name'), 'test');
  });

  it('should call change when the text area updates', () => {
    wrapper.find('textarea').simulate('change', {preventDefault: ()=>{}, target:{value: ''}});
    equal(changeHandle.callCount, 1);
  });

});
