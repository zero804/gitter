"use strict";

import React, {PropTypes} from 'react';
import Modal from '../modal.jsx';
import Input from '../forms/input.jsx';
import H1 from '../text/h-1.jsx';
import Editor from '../forms/editor.jsx';

export default React.createClass({

  displayName: 'CreateTopicModal',
  propTypes: {
    active: PropTypes.bool.isRequired
  },

  render(){
    const { active } = this.props;
    return (
      <Modal active={active}>
        <form name="create-topic">
          <H1 className="create-topic__heading">Create Topic</H1>
          <Input className="create-topic__input--name" name="title" placeholder="Add title ..."/>
          <Editor className="create-topic__editor--body"/>
          <div className="create-topic__control-row">

          </div>
        </form>
      </Modal>
    );
  }

});
