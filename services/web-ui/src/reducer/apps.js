import {
    GET_APPS,
} from '../action/app-directory';

const initialState = {
    list: [],
    error: null,
};

export default (state = initialState, action) => {
    switch (action.type) {
    case GET_APPS:
        return {
            list: [
                ...action.data,
            ],
        };
    default:
        return state;
    }
};
