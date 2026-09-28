import React from "react";
import PropTypes from "prop-types";

/**
 * App-shell crash guard. Error boundaries have no hook equivalent, so this
 * is a class component by necessity, the one place in the app that is.
 * It wraps the page area only: if a page crashes, the header, footer and
 * cart drawer keep working, and "Try again" re-renders the page.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="container section">
          <div className="empty-state" role="alert">
            <h1>Something went wrong on this page</h1>
            <p className="muted">
              The rest of the shop still works. Try again, or head back home.
            </p>
            <button type="button" className="btn btn-primary" onClick={this.handleReset}>
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};
