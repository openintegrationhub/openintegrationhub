import {
    GET_DISPATCHER_CONFIGURATIONS,
} from '../action/hub-spoke';

const initialState = {
    list: [],
    error: null,
};

export default (state = initialState, action) => {
    switch (action.type) {
    case GET_DISPATCHER_CONFIGURATIONS:
        return {
            list: [
                ...action.data,
            ],
        };
    default:
        return state;
    }
};
