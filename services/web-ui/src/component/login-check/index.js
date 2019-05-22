import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Redirect } from 'react-router-dom';


class LoginCheck extends React.Component {
    state={
        isLoggedIn: false,
    }

    constructor(props) {
        super(props);
        if (props.user) {
            this.setState({
                isLoggedIn: true,
            });
        }
    }

    // componentDidUpdate(prevProps) {
    //     if (this.props.user !== prevProps.user) {
    //         if (this.props.user !== null) {
    //             setAxiosAuth(this.props.user.access_token);
    //         }
    //     }

    //     if (prevProps.tokenInvalid !== this.props.tokenInvalid) {
    //         this.setState({
    //             isLoggedIn: false,
    //         });
    //     }
    // }

    render() {
        if (this.props.isLoggedIn) {
            return <React.Fragment>
                {this.props.children}
            </React.Fragment>;
        }

        return (
            <Redirect to="/login"></Redirect>
        );
    }
}

const mapStateToProps = state => ({
    user: state.user,
});

const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(LoginCheck);
