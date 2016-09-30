import React, { PropTypes } from 'react';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'Submit',
  propTypes: {
    className: PropTypes.string,
    children: PropTypes.node
  },

  getDefaultProps() {
    return {
      className: 'submit-button'
    };
  },

  render(){

    const { className } = this.props;

    return (
      <button type="submit" className={className}>
        {this.props.children}
      </button>
    );
  }

});
