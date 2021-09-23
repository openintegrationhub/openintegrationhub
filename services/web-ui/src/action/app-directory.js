import axios from 'axios';

import { getConfig } from '../conf';

const conf = getConfig();
export const GET_APPS = 'GET_APPS';
export const UPDATE_APP = 'UPDATE_APP';
export const CREATE_APP = 'CREATE_APP';
export const DELETE_APP = 'DELETE_APP';

export const getApps = () => async (dispatch) => {
    try {
        const result = await axios({
            method: 'get',
            url: `${conf.endpoints.appDirectory}/apps`,
            withCredentials: true,
        });

        dispatch({
            type: GET_APPS,
            data: result.data.data,
        });
    } catch (err) {
        console.log(err);
    }
};

export const getAppById = async (id) => {
    try {
        const { data } = await axios({
            method: 'get',
            url: `${conf.endpoints.appDirectory}/apps/${id}`,
            withCredentials: true,
        });
        return data;
    } catch (err) {
        console.log(err);
        return null;
    }
};

export const updateApp = async (data) => axios({
    method: 'patch',
    url: `${conf.endpoints.appDirectory}/apps/${data._id}`,
    withCredentials: true,
    json: true,
    data,
});

export const createApp = (data) => async (dispatch) => {
    try {
        await axios({
            method: 'post',
            url: `${conf.endpoints.appDirectory}/apps`,
            withCredentials: true,
            json: true,
            data,
        });

        dispatch({
            type: CREATE_APP,
        });
        dispatch(getApps());
    } catch (err) {
        console.log(err);
    }
};

export const deleteApp = (appId) => async (dispatch) => {
    try {
        await axios({
            method: 'delete',
            url: `${conf.endpoints.appDirectory}/apps/${appId}`,
            withCredentials: true,
        });

        dispatch({
            type: DELETE_APP,
        });
        dispatch(getApps());
    } catch (err) {
        console.log(err);
    }
};
