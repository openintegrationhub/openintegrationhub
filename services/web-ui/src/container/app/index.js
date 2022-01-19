import React from 'react';
import axios from 'axios';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Route, Switch } from 'react-router-dom';
import { hot } from 'react-hot-loader/root';
import flow from 'lodash/flow';

import Hook from '../hook';
import Main from '../main';
import Auth from '../auth';
import LoginCheck from '../../component/login-check';

// Actions
import { resetLogin, checkLogin } from '../../action/auth';
import { getUsers } from '../../action/users';
import { getTenants } from '../../action/tenants';
import { getRoles } from '../../action/roles';

class App extends React.Component {
    state = {
        initialLoginCheckDone: false,
    }

    constructor(props) {
        super(props);
        axios.interceptors.response.use((response) => response, async (error) => {
            if (error.response.status === 401) {
                console.log('REDIRECT TO LOGIN SCREEN', error);
                props.resetLogin(); // TODO: do not logout user if the 401 came from one of the services and not IAM
            }
            return Promise.reject(error);
        });
    }

    async componentDidMount() {
        document.title = 'Web UI';
        await this.props.checkLogin();

        this.props.getUsers();
        this.props.getRoles();
        this.props.getTenants();

        this.setState({
            initialLoginCheckDone: 1,
        });
    }

    async componentDidUpdate() {
        if (!this.props.auth || !this.props.auth.isLoggedIn) {
            await this.props.checkLogin();
        }
    }

    render() {
        if (!this.state.initialLoginCheckDone) {
            return null;
        }

        return <Switch>
            <Route path="/hook" component={Hook} />
            <Route exact path="/auth" component={Auth} />
            <LoginCheck>

                <Route path="/" component={Main} />
            </LoginCheck>
        </Switch>;
    }
}

const mapStateToProps = () => ({});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    resetLogin,
    getUsers,
    getTenants,
    getRoles,
    checkLogin,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    hot,
)(App);
