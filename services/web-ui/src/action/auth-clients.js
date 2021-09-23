import axios from 'axios';
import qs from 'qs';
import { getConfig } from '../conf';

const conf = getConfig();

export const GET_CLIENTS = 'GET_CLIENTS_SUCCESS';
export const PROCESS_CALLBACK = 'PROCESS_CALLBACK';
export const RESET_MODIFIED_SECRET = 'RESET_MODIFIED_SECRET';
export const PROCESS_AUTH = 'PROCESS_AUTH';

export const getClients = () => async (dispatch) => {
    try {
        const { data } = (await axios({
            method: 'get',
            url: `${conf.endpoints.secrets}/auth-clients`,
            withCredentials: true,
        })).data;

        dispatch({
            type: GET_CLIENTS,
            data,
        });
    } catch (err) {
        console.log(err);
    }
};

export const processCallback = (query) => async (dispatch) => {
    try {
        const { data } = await axios({
            method: 'get',
            url: `${conf.endpoints.secrets}/callback?${qs.stringify(query)}`,
            withCredentials: true,
        });

        dispatch({
            type: PROCESS_CALLBACK,
            successUrl: data.data.successUrl,
            secretId: data.data.secretId,
        });
    } catch (err) {
        console.log(err);
    }
};

export const resetModifiedSecretId = () => (dispatch) => {
    dispatch({
        type: RESET_MODIFIED_SECRET,
    });
};

export const processAuth = (clientId, body) => async (dispatch) => {
    try {
        const { data } = (await axios({
            method: 'post',
            url: `${conf.endpoints.secrets}/auth-clients/${clientId}/start-flow`,
            withCredentials: true,
            data: {
                data: body,
            },
        })).data;
        dispatch({
            type: PROCESS_AUTH,
            authUrl: data.authUrl,
        });
        return data.authUrl;
    } catch (err) {
        console.log(err);
        return null;
    }
};
