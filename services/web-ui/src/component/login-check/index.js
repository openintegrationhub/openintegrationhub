import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Redirect } from 'react-router-dom';
import axios from 'axios';
import { login } from '../../action/users';


// const setAxiosAuth = (token) => {
//     axios.defaults.headers.common.Authorization = `Bearer ${token}`;
// };


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
        if (this.state.isLoggedIn) {
            console.log('true');
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

const mapDispatchToProps = dispatch => bindActionCreators({
    login,
}, dispatch);

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(LoginCheck);
