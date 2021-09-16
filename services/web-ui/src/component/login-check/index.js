import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Redirect } from 'react-router-dom';

class LoginCheck extends React.Component {
    render() {
        if (this.props.auth && this.props.auth.isLoggedIn) {
            return <React.Fragment>
                {this.props.children}
            </React.Fragment>;
        }
        return (
            <Redirect to="/auth"></Redirect>
        );
    }
}

const mapStateToProps = (state) => ({
    auth: state.auth,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({}, dispatch);

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(LoginCheck);
