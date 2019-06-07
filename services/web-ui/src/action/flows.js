import axios from 'axios';

import { getConfig } from '../conf';

const conf = getConfig();
export const GET_FLOWS = 'GET_FLOWS';
export const UPDATE_FLOW = 'UPDATE_FLOW';
export const UPDATE_FLOW_ERROR = 'UPDATE_FLOW_ERROR';
export const CREATE_FLOW = 'CREATE_FLOW';
export const DELETE_FLOW = 'DELETE_FLOW';


export const getFlows = () => async (dispatch) => {
    try {
        const result = await axios({
            method: 'get',
            url: `${conf.endpoints.flow}/api/v1/flows`,
            withCredentials: true,
        });

        dispatch({
            type: GET_FLOWS,
            flows: result.data,
        });
    } catch (err) {
        console.log(err);
    }
};

export const updateFlow = user => async (dispatch) => {
    try {
        await axios({
            method: 'patch',
            url: `${conf.endpoints.flow}/api/v1/flows/${user._id}`,
            withCredentials: true,
            data: user,
        });

        dispatch({
            type: UPDATE_FLOW,
        });
        dispatch(getFlows());
    } catch (err) {
        dispatch({
            type: UPDATE_FLOW_ERROR,
            err,
        });
    }
};

export const createFlow = data => async (dispatch) => {
    try {
        await axios({
            method: 'post',
            url: `${conf.endpoints.flow}/api/v1/flows`,
            withCredentials: true,
            data,
        });

        dispatch({
            type: CREATE_FLOW,
        });
        dispatch(getFlows());
    } catch (err) {
        console.log(err);
    }
};

export const deleteFlow = userId => async (dispatch) => {
    try {
        await axios({
            method: 'delete',
            url: `${conf.endpoints.flow}/api/v1/flows/${userId}`,
            withCredentials: true,
        });

        dispatch({
            type: DELETE_FLOW,
        });
        dispatch(getFlows());
    } catch (err) {
        console.log(err);
    }
};
