import { equal } from 'assert';
import React from 'react';
import sinon from 'sinon';
import { shallow } from 'enzyme';
import Editor from '../../../../../../shared/containers/components/forms/editor.jsx';
import mockEvt from '../../../../../mocks/event';
import {ENTER_KEY} from '../../../../../../shared/constants/keys';

describe('<Editor/>', () => {

  let wrapper;
  let changeHandle;
  let enterHandle;

  beforeEach(() => {
    changeHandle = sinon.spy();
    enterHandle = sinon.spy();
    wrapper = shallow(
      <Editor
        className="test"
        name="test"
        onChange={changeHandle}
        onEnter={enterHandle}>
        This is some text
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
    wrapper.find('textarea').simulate('change', mockEvt);
    equal(changeHandle.callCount, 1);
  });

  it('should call onENterPRessed when the enter key is pressed', () => {
    mockEvt.keyCode = ENTER_KEY;
    wrapper.find('textarea').simulate('keyDown', mockEvt);
    equal(enterHandle.callCount, 1, 'onEnter event not fired when enter key pressed');
  });

});
