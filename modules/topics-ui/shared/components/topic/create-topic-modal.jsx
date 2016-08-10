"use strict";

import React, {PropTypes} from 'react';
import Modal from '../modal.jsx';
import Input from '../forms/input.jsx';

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
          <Input name="title" />
        </form>
      </Modal>
    );
  }

});
