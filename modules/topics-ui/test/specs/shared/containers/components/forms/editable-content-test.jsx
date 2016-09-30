import assert from 'assert';
import {spy} from 'sinon';
import React from 'react';
import { shallow } from 'enzyme';
import EditableContent from '../../../../../../shared/containers/components/forms/editable-content.jsx';

describe('<EditableContent/>', () => {

  let wrapper;
  const content = {
    text: '',
    body: {
      text: '',
      html: ''
    }
  }

  it('should render', () => {
    wrapper = shallow(
      <EditableContent content={content}/>
    );
    assert(wrapper.length);
  });

  it('should render a div if isEditing is false', () => {
    wrapper = shallow(<EditableContent isEditing={false} content={content}/>);
    assert.equal(wrapper.find('div').length, 1);
  });


  it('should render an Editor when isEditing is true', () => {
    wrapper = shallow(<EditableContent isEditing={true} content={content}/>);
    assert.equal(wrapper.find('Editor').length, 1);
  });

});
