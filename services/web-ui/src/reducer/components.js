import {
    GET_COMPONENTS, UPDATE_COMPONENT, UPDATE_COMPONENT_ERROR, GET_COMPONENTS_PAGE, START_COMPONENT, STOP_COMPONENT,
} from '../action/components';

const initialState = {
    all: [],
    error: null,
    meta: null,
};

export default (state = initialState, action) => {
    switch (action.type) {
    case GET_COMPONENTS:
        return {
            ...state,
            error: null,
            all: [
                ...action.components,
            ],
            meta: { ...action.meta },
        };
    case GET_COMPONENTS_PAGE:
        return {
            ...state,
            error: null,
            all: [
                ...action.components,
            ],
            meta: { ...action.meta },
        };
    case START_COMPONENT:
        return {
            ...state,
            error: null,
        };
    case STOP_COMPONENT:
        return {
            ...state,
            error: null,
        };
    case UPDATE_COMPONENT:
        return {
            ...state,
            error: null,
        };
    case UPDATE_COMPONENT_ERROR:
        return {
            ...state,
            error: action.err,
        };
    default:
        return state;
    }
};
