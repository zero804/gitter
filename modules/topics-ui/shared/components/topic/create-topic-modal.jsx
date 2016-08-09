"use strict";

import React, {PropTypes} from 'react';
import Modal from '../modal.jsx';

export default React.createClass({

  displayName: 'CreateTopicModal',
  propTypes: {
    active: PropTypes.bool.isRequired
  },

  render(){
    const { active } = this.props;
    return (
      <Modal active={active} />
    );
  }

});
