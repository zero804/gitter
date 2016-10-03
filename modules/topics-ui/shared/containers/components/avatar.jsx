import React, { PropTypes } from 'react';
import {
  AVATAR_SIZE_SMALL,
  AVATAR_SIZE_MEDIUM,
  AVATAR_SIZE_LARGE,
  AVATAR_SIZE_SMALL_DIM,
  AVATAR_SIZE_MEDIUM_DIM,
  AVATAR_SIZE_LARGE_DIM,
} from '../../constants/avatar-sizes';

export default React.createClass({

  displayName: 'Avatar',
  propTypes: {
    src: PropTypes.string.isRequired,
    title: PropTypes.string,
    className: PropTypes.string,
    size: PropTypes.oneOf([
      AVATAR_SIZE_SMALL,
      AVATAR_SIZE_MEDIUM,
      AVATAR_SIZE_LARGE,
    ]).isRequired,
  },

  render(){
    const { src, title, className, size} = this.props;
    const compiledClass = className ? `avatar ${className}` : 'avatar';
    let dimension;

    if(size === AVATAR_SIZE_SMALL) { dimension = AVATAR_SIZE_SMALL_DIM; }
    if(size === AVATAR_SIZE_MEDIUM) { dimension = AVATAR_SIZE_MEDIUM_DIM; }
    if(size === AVATAR_SIZE_LARGE) { dimension = AVATAR_SIZE_LARGE_DIM; }

    return (
      <img
        src={src}
        title={title}
        className={compiledClass}
        width={dimension}
        height={dimension}/>
    );
  }

});
