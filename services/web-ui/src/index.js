import axios from 'axios';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { create } from 'jss';
import { StylesProvider, jssPreset } from '@material-ui/styles';
import App from './container/app';
import { updateConfig } from './conf';

import configureStore, { history } from './store';

import * as serviceWorker from './serviceWorker';

const jss = create({
    ...jssPreset(),
    // Define a custom insertion point that JSS will look for when injecting the styles into the DOM.
    insertionPoint: document.getElementById('jss-insertion-point'),
});

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

const render = (Component) => {
    ReactDOM.render(
        <StylesProvider jss={jss}>
            <Provider store={configureStore()}>
                <Router history={history}>
                    <Component />
                </Router>
            </Provider>
        </StylesProvider>,
        document.getElementById('root'),
    );
};

(async () => {
    updateConfig((await axios.get('/config')).data);
    render(App);
})();
