import axios from 'axios';

import { getConfig } from '../conf';

const conf = getConfig();
export const GET_DISPATCHER_CONFIGURATIONS = 'GET_DISPATCHER_CONFIGURATIONS';
export const CREATE_DISPATCHER_CONFIGURATION = 'CREATE_DISPATCHER_CONFIGURATION';
export const UPDATE_DISPATCHER_CONFIGURATION = 'UPDATE_DISPATCHER_CONFIGURATION';
export const DELETE_DISPATCHER_CONFIGURATION = 'DELETE_DISPATCHER_CONFIGURATION';

export const getDispatcherConfigs = () => async (dispatch) => {
    try {
        const result = await axios({
            method: 'get',
            url: `${conf.endpoints.dispatcher}/dispatches`,
            withCredentials: true,
        });

        dispatch({
            type: GET_DISPATCHER_CONFIGURATIONS,
            data: result.data.data,
        });
    } catch (err) {
        console.log(err);
    }
};
export const getDispatcherConfig = async (id) => {
    try {
        const { data } = await axios({
            method: 'get',
            url: `${conf.endpoints.dispatcher}/dispatches/${id}`,
            withCredentials: true,
        });
        return data.data;
    } catch (err) {
        console.log(err);
        return null;
    }
};

export const createDispatcherConfig = (data) => async (dispatch) => {
    try {
        await axios({
            method: 'post',
            url: `${conf.endpoints.dispatcher}/dispatches`,
            withCredentials: true,
            json: true,
            data,
        });

        dispatch({
            type: CREATE_DISPATCHER_CONFIGURATION,
        });
        dispatch(getDispatcherConfigs());
    } catch (err) {
        console.log(err);
    }
};

export const updateDispatcherConfig = async (id, payload) => {
    try {
        const { data } = await axios({
            method: 'patch',
            url: `${conf.endpoints.dispatcher}/dispatches/${id}`,
            withCredentials: true,
            json: true,
            data: payload,
        });

        return data.data;
    } catch (err) {
        console.log(err);
        return null;
    }
};

export const updateAppInDispatcherConfig = async (id, appId, appData) => {
    try {
        const { data } = await axios({
            method: 'patch',
            url: `${conf.endpoints.dispatcher}/dispatches/${id}/app/${appId}`,
            withCredentials: true,
            json: true,
            data: appData,
        });

        return data.data;
    } catch (err) {
        console.log(err);
        return null;
    }
};

export const deleteAppFromDispatcherConfig = async (id, appId) => {
    try {
        const { data } = await axios({
            method: 'delete',
            url: `${conf.endpoints.dispatcher}/dispatches/${id}/app/${appId}`,
            withCredentials: true,
        });

        return data.data;
    } catch (err) {
        console.log(err);
        return null;
    }
};

export const deleteDispatcherConfig = (id) => async (dispatch) => {
    try {
        await axios({
            method: 'delete',
            url: `${conf.endpoints.dispatcher}/dispatches/${id}`,
            withCredentials: true,
        });

        dispatch({
            type: DELETE_DISPATCHER_CONFIGURATION,
        });
        dispatch(getDispatcherConfigs());
    } catch (err) {
        console.log(err);
    }
};
