import {
    GET_ROLES, GET_PERMISSIONS, UPDATE_ROLE, ROLES_ERROR, ROLES_ERROR_CLEAR,
} from '../action/roles';

const initialState = {
    all: [],
    permissions: [],
    error: null,
};

export default (state = initialState, action) => {
    switch (action.type) {
    case GET_ROLES:
        return {
            ...state,
            error: null,
            all: [
                ...action.roles,
            ],
        };
    case GET_PERMISSIONS:
        return {
            ...state,
            error: null,
            permissions: [
                ...action.permissions,
            ],
        };
    case UPDATE_ROLE:
        return {
            ...state,
            error: null,
        };
    case ROLES_ERROR:
        return {
            ...state,
            error: action.error,
        };
    case ROLES_ERROR_CLEAR:
        return {
            ...state,
            error: null,
        };
    default:
        return state;
    }
};
