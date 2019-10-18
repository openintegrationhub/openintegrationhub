import {
    GET_CLIENTS,
    PROCESS_CALLBACK,
    PROCESS_AUTH,
    RESET_MODIFIED_SECRET,
} from '../action/auth-clients';

const initialState = {
    available: [],
    processedCallback: false,
    authUrl: null,
    successUrl: '',
    modifiedSecretId: null,
};

export default (state = initialState, action) => {
    switch (action.type) {
    case GET_CLIENTS:
        return {
            ...state,
            available: action.data,
        };

    case PROCESS_CALLBACK:
        return {
            ...state,
            processedCallback: true,
            successUrl: action.successUrl,
            modifiedSecretId: action.secretId,
        };

    case RESET_MODIFIED_SECRET:
        return {
            ...state,
            modifiedSecretId: null,
        };

    case PROCESS_AUTH:
        return {
            ...state,
            authUrl: action.authUrl,
        };
    default:
        return state;
    }
};
