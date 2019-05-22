import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import configureStore, { history } from '../../store';
import App from '.';

it('renders without crashing', () => {
    const div = document.createElement('div');
    ReactDOM.render(
        <Provider store={configureStore()}>
            <Router history={history}>
                <App />
            </Router>
        </Provider>,
        document.getElementById('root'),
    );
    ReactDOM.unmountComponentAtNode(div);
});
