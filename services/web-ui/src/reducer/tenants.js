import {
    GET_TENANTS, TENANTS_ERROR, TENANTS_ERROR_CLEAR, UPDATE_TENANT,
} from '../action/tenants';

const initialState = {
    all: [],
    error: null,
};

export default (state = initialState, action) => {
    switch (action.type) {
    case GET_TENANTS:
        return {
            ...state,
            error: null,
            all: [
                ...action.tenants,
            ],
        };
    case UPDATE_TENANT:
        return {
            ...state,
            error: null,
        };
    case TENANTS_ERROR:
        return {
            ...state,
            error: action.error,
        };
    case TENANTS_ERROR_CLEAR:
        return {
            ...state,
            error: null,
        };
    default:
        return state;
    }
};
