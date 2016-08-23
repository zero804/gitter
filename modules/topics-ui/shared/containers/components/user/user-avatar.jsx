import React, { PropTypes } from 'react';
import Avatar from '../avatar.jsx';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'UserAvatar',
  propTypes: {
    width: PropTypes.number,
    height: PropTypes.number,
    className: PropTypes.string,
    user: PropTypes.shape({
      avatarUrl: PropTypes.string.isRequired,
      displayName: PropTypes.string.isRequired,
    }).isRequired,
  },

  render(){
    const { width, height, className } = this.props;
    const { avatarUrl, displayName } = this.props.user;
    const compiledClass = classNames("avatar--user", className);
    return (
      <Avatar title={displayName} src={avatarUrl} className={compiledClass} width={width} height={height}/>
    );
  }

});
