import {
    GET_SECRETS,
    GET_SECRETS_PAGE,
} from '../action/secrets';

const initialState = {
    secrets: [],
    meta: {},
};

export default (state = initialState, action) => {
    switch (action.type) {
    case GET_SECRETS:
        return {
            ...state,
            secrets: [...action.data],
            meta: {},
        };
    case GET_SECRETS_PAGE:
        return {
            ...state,
            secrets: [...action.data],
            meta: { ...action.meta },
        };
    default:
        return state;
    }
};
