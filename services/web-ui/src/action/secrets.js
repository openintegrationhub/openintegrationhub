import axios from 'axios';
import { getConfig } from '../conf';

const conf = getConfig();
export const GET_SECRETS = 'GET_SECRETS';
export const GET_SECRETS_PAGE = 'GET_SECRETS_PAGE';

export const getSecrets = () => async (dispatch) => {
    try {
        const { data } = (await axios({
            method: 'get',
            url: `${conf.endpoints.secrets}/secrets`,
            withCredentials: true,
        })).data;

        dispatch({
            type: GET_SECRETS,
            data,
        });
    } catch (err) {
        console.log(err);
    }
};

export const getSecretsPage = (page) => async (dispatch) => {
    try {
        const result = await axios({
            method: 'get',
            url: `${conf.endpoints.secrets}/secrets?page[number]=${page}`,
            withCredentials: true,
        });

        dispatch({
            type: GET_SECRETS_PAGE,
            data: result.data.data,
            meta: result.data.meta,
        });
    } catch (err) {
        console.log(err);
    }
};

export const deleteSecret = (secretId) => async (dispatch) => {
    try {
        await axios({
            method: 'delete',
            url: `${conf.endpoints.secrets}/secrets/${secretId}`,
            withCredentials: true,
        });
        dispatch(getSecrets());
    } catch (err) {
        console.log(err);
    }
};

export const createMixedSecret = ({ data }) => async (dispatch) => {
    try {
        await axios({
            method: 'post',
            url: `${conf.endpoints.secrets}/secrets`,
            data,
            withCredentials: true,
        });
        dispatch(getSecrets());
    } catch (err) {
        console.log(err);
    }
};
