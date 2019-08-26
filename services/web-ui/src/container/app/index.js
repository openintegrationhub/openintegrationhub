import React from 'react';
import axios from 'axios';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Route, Switch } from 'react-router-dom';
import { hot } from 'react-hot-loader/root';
import flow from 'lodash/flow';


import Main from '../main';
import Auth from '../auth';
import LoginCheck from '../../component/login-check';

// Actions
import { resetLogin } from '../../action/auth';

class App extends React.Component {
    constructor(props) {
        super(props);
        axios.interceptors.response.use(response => response, (error) => {
            if (error.response.status === 401) {
                console.log('REDIRECT TO LOGIN SCREEN', error);
                props.resetLogin();
            }
            return Promise.reject(error);
        });
    }

    componentDidMount() {
        document.title = 'Web UI';
    }

    render() {
        return <Switch>
            <Route exact path="/auth" component={Auth} />
            <LoginCheck>

                <Route path="/" component={Main} />
            </LoginCheck>
        </Switch>;
    }
}

const mapStateToProps = () => ({});
const mapDispatchToProps = dispatch => bindActionCreators({
    resetLogin,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    hot,
)(App);
