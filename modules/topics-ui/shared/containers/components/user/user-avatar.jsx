import React, { PropTypes } from 'react';
import avatars from 'gitter-web-avatars';
import Avatar from '../avatar.jsx';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'UserAvatar',
  propTypes: {
    width: PropTypes.number,
    height: PropTypes.number,
    className: PropTypes.string,
    user: PropTypes.shape({
      avatarUrl: PropTypes.string,
      displayName: PropTypes.string,
    }),
  },

  render(){
    const { width, height, className } = this.props;
    let { avatarUrl, displayName } = this.props.user;
    const compiledClass = classNames("avatar--user", className);

    if(!avatarUrl) {
      avatarUrl = avatars.getDefault();
    }

    return (
      <Avatar title={displayName} src={avatarUrl} className={compiledClass} width={width} height={height}/>
    );
  }

});
