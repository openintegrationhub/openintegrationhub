import { GET_FLOWS, UPDATE_FLOW, UPDATE_FLOW_ERROR } from '../action/flows';

const initialState = {
    all: [],
    error: null,
};

export default (state = initialState, action) => {
    switch (action.type) {
    case GET_FLOWS:
        return {
            ...state,
            error: null,
            all: [
                ...action.flows,
            ],
        };
    case UPDATE_FLOW:
        return {
            ...state,
            error: null,
        };
    case UPDATE_FLOW_ERROR:
        return {
            ...state,
            error: action.err,
        };
    default:
        return state;
    }
};
