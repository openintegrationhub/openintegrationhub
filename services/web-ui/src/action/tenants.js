import axios from 'axios';

import { getConfig } from '../conf';

const conf = getConfig();
export const GET_TENANTS = 'GET_TENANTS';
export const UPDATE_TENANT = 'UPDATE_TENANT';
export const CREATE_TENANT = 'CREATE_TENANT';
export const DELETE_TENANT = 'DELETE_USER';
export const TENANTS_ERROR = 'TENANTS_ERROR';
export const TENANTS_ERROR_CLEAR = 'TENANTS_ERROR_CLEAR';

export const getTenants = () => async (dispatch) => {
    try {
        const result = await axios({
            method: 'get',
            url: `${conf.endpoints.iam}/api/v1/tenants`,
            withCredentials: true,
        });

        dispatch({
            type: GET_TENANTS,
            tenants: result.data,
        });
    } catch (err) {
        dispatch({
            type: TENANTS_ERROR,
            err,
        });
    }
};

export const updateTenant = (tenant) => async (dispatch) => {
    try {
        await axios({
            method: 'patch',
            url: `${conf.endpoints.iam}/api/v1/tenants/${tenant._id}`,
            withCredentials: true,
            data: tenant,
        });

        dispatch({
            type: UPDATE_TENANT,
        });
        dispatch(getTenants());
    } catch (err) {
        dispatch({
            type: TENANTS_ERROR,
            err,
        });
    }
};

export const createTenant = (tenant) => async (dispatch) => {
    try {
        await axios({
            method: 'post',
            url: `${conf.endpoints.iam}/api/v1/tenants`,
            withCredentials: true,
            data: {
                ...tenant,
            },
        });

        dispatch({
            type: CREATE_TENANT,
        });
        dispatch(getTenants());
    } catch (err) {
        dispatch({
            type: TENANTS_ERROR,
            err,
        });
    }
};

export const deleteTenant = (tenantId) => async (dispatch) => {
    try {
        await axios({
            method: 'delete',
            url: `${conf.endpoints.iam}/api/v1/tenants/${tenantId}`,
            withCredentials: true,
        });

        dispatch({
            type: DELETE_TENANT,
        });
        dispatch(getTenants());
    } catch (err) {
        dispatch({
            type: TENANTS_ERROR,
            err,
        });
    }
};

export const clearError = () => (dispatch) => {
    dispatch({
        type: TENANTS_ERROR_CLEAR,
    });
};
