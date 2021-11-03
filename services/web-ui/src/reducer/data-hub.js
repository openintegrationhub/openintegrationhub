import {
    GET_DATA_OBJECTS,
} from '../action/data-hub';

const initialState = {
    dataObjects: [],
    error: null,
};

export default (state = initialState, action) => {
    switch (action.type) {
    case GET_DATA_OBJECTS:
        return {
            dataObjects: [
                ...action.data,
            ],
        };
    default:
        return state;
    }
};
