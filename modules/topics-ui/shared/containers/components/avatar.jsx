import React, { PropTypes } from 'react';

export default React.createClass({

  displayName: 'Avatar',
  propTypes: {
    src: PropTypes.string.isRequired,
    title: PropTypes.string,
    className: PropTypes.string,
    height: PropTypes.number,
    width: PropTypes.number
  },

  render(){
    const { src, title, className, width, height } = this.props;
    const compiledClass = !!className ? `avatar ${className}` : 'avatar';

    return (
      <img src={src} title={title} className={compiledClass} width={width} height={height}/>
    );
  }

});
