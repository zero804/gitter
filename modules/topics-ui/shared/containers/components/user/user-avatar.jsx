import React, { PropTypes } from 'react';
import avatars from 'gitter-web-avatars';
import Avatar from '../avatar.jsx';
import classNames from 'classnames';

import {
  AVATAR_SIZE_SMALL,
  AVATAR_SIZE_MEDIUM,
  AVATAR_SIZE_LARGE,
} from '../../../constants/avatar-sizes';

export default React.createClass({

  displayName: 'UserAvatar',
  propTypes: {
    className: PropTypes.string,
    user: PropTypes.shape({
      avatarUrl: PropTypes.string,
      displayName: PropTypes.string,
    }),
    size: PropTypes.oneOf([
      AVATAR_SIZE_SMALL,
      AVATAR_SIZE_MEDIUM,
      AVATAR_SIZE_LARGE,
    ]).isRequired,
  },

  render(){
    const { className, size } = this.props;
    let { avatarUrl, displayName } = this.props.user;
    const compiledClass = classNames('avatar--user', className);

    if(!avatarUrl) {
      avatarUrl = avatars.getDefault();
    }

    return (
      <Avatar
        title={displayName}
        src={avatarUrl}
        className={compiledClass}
        size={size} />
    );
  }

});
