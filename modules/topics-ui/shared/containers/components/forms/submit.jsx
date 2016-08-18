import React, { PropTypes } from 'react';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'Submit',
  propTypes: {
    className: PropTypes.string,
    children: PropTypes.node
  },

  render(){

    const { className } = this.props;
    const compiledClass = classNames('submit-button', className);

    return (
      <button type="submit" className={compiledClass}>
        {this.props.children}
      </button>
    );
  }

});
