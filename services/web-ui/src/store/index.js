import { applyMiddleware, compose, createStore } from 'redux';
import thunk from 'redux-thunk';
import { routerMiddleware } from 'react-router-redux';
import { createBrowserHistory } from 'history';
import rootReducer from '../reducer';

export const history = createBrowserHistory();

const enhancers = [];
const middleware = [
    thunk,
    routerMiddleware(history),
];

if (process.env.NODE_ENV === 'development') {
    const { __REDUX_DEVTOOLS_EXTENSION__ } = window;

    if (typeof __REDUX_DEVTOOLS_EXTENSION__ === 'function') {
        enhancers.push(__REDUX_DEVTOOLS_EXTENSION__());
    }
}

const composedEnhancers = compose(
    applyMiddleware(...middleware),
    ...enhancers,
);

export default function configureStore(initialState = {}) {
    const store = createStore(
        rootReducer,
        initialState,
        composedEnhancers,
    );

    if (process.env.NODE_ENV !== 'production') {
        if (module.hot) {
            module.hot.accept('../reducer', () => store.replaceReducer(rootReducer)); // eslint-disable-line global-require
        }
    }

    return store;
}
