import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Redirect } from 'react-router-dom';


class LoginCheck extends React.Component {
    render() {
        const redirectUrl = `/auth?redirect=${window.location.pathname}`;
        if (this.props.auth && this.props.auth.isLoggedIn) {
            const redirectMatch = window.location.search.match(/redirect=([a-z/0-9]*)/);
            if (redirectMatch) {
                return <Redirect to={redirectMatch} />;
            }
            return <React.Fragment>
                {this.props.children}
            </React.Fragment>;
        }
        return (
            <Redirect to={redirectUrl} />
        );
    }
}

const mapStateToProps = state => ({
    auth: state.auth,
});

const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(LoginCheck);
