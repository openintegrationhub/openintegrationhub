import axios from 'axios';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { create } from 'jss';
import { StylesProvider, jssPreset } from '@material-ui/styles';
import { I18nextProvider } from 'react-i18next';
import App from './container/app';
import { updateConfig } from './conf';
import i18n from './translation/i18next';
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
            <I18nextProvider i18n={i18n}>
                <Provider store={configureStore()}>
                    <Router history={history}>
                        <Component />
                    </Router>
                </Provider>
            </I18nextProvider>
        </StylesProvider>,
        document.getElementById('root'),
    );
};

(async () => {
    updateConfig((await axios.get('/config')).data);
    render(App);
})();
