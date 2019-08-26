import {
    GET_DOMAINS, UPDATE_DOMAIN, UPDATE_METADATA_ERROR, GET_METADATA_PAGE,
} from '../action/metadata';

const initialState = {
    domains: [],
    error: null,
    meta: null,
};

export default (state = initialState, action) => {
    switch (action.type) {
    case GET_DOMAINS:
        return {
            ...state,
            error: null,
            domains: [
                ...action.domains,
            ],
            meta: { ...action.meta },
        };
    case GET_METADATA_PAGE:
        return {
            ...state,
            error: null,
            domains: [
                ...action.domains,
            ],
            meta: { ...action.meta },
        };
    case UPDATE_DOMAIN:
        return {
            ...state,
            error: null,
        };
    case UPDATE_METADATA_ERROR:
        return {
            ...state,
            error: action.err,
        };
    default:
        return state;
    }
};
