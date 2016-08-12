"use strict";

import React, { PropTypes } from 'react';
import Avatar from '../avatar.jsx';

export default React.createClass({

  displayName: 'UserAvatar',
  propTypes: {
    width: PropTypes.number,
    height: PropTypes.number,
    user: PropTypes.shape({
      avatarUrl: PropTypes.string.isRequired,
      displayName: PropTypes.string.isRequired,
    }).isRequired,
  },

  render(){
    const { width, height } = this.props;
    const { avatarUrl, displayName } = this.props.user;
    return (
      <Avatar title={displayName} src={avatarUrl} className="avatar--user" width={width} height={height}/>
    );
  }

});
