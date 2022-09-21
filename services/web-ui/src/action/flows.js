import axios from 'axios';

import { getConfig } from '../conf';

const conf = getConfig();
export const GET_FLOWS = 'GET_FLOWS';
export const GET_FLOWS_PAGE = 'GET_FLOWS_PAGE';
export const START_FLOW = 'START_FLOW';
export const STOP_FLOW = 'STOP_FLOW';
export const UPDATE_FLOW = 'UPDATE_FLOW';
export const UPDATE_FLOW_ERROR = 'UPDATE_FLOW_ERROR';
export const CREATE_FLOW = 'CREATE_FLOW';
export const DELETE_FLOW = 'DELETE_FLOW';
export const FLOW_ADD_STATE = 'FLOW_ADD_STATE';
export const EXECUTE_FLOW = 'EXECUTE_FLOW';

export const getFlows = () => async (dispatch) => {
    try {
        const result = await axios({
            method: 'get',
            url: `${conf.endpoints.flow}/flows`,
            withCredentials: true,
        });

        dispatch({
            type: GET_FLOWS,
            flows: result.data.data,
            meta: result.data.meta,
        });
    } catch (err) {
        console.log(err);
    }
};

export const getFlowsPage = (page) => async (dispatch) => {
    try {
        const result = await axios({
            method: 'get',
            url: `${conf.endpoints.flow}/flows?page[number]=${page}`,
            withCredentials: true,
        });

        dispatch({
            type: GET_FLOWS_PAGE,
            flows: result.data.data,
            meta: result.data.meta,
        });
    } catch (err) {
        console.log(err);
    }
};

export const updateFlow = (flow) => async (dispatch) => {
    try {
        await axios({
            method: 'patch',
            url: `${conf.endpoints.flow}/flows/${flow.id}`,
            withCredentials: true,
            json: true,
            data: flow,
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

export const createFlow = (payload) => async (dispatch) => {
    try {
        const { data } = await axios({
            method: 'post',
            url: `${conf.endpoints.flow}/flows`,
            withCredentials: true,
            json: true,
            data: payload,
        });

        dispatch({
            type: CREATE_FLOW,
        });
        dispatch(getFlows());

        return data.data;
    } catch (err) {
        console.log(err);
        return null;
    }
};

export const startFlow = (flowId) => async (dispatch) => {
    try {
        await axios({
            method: 'post',
            url: `${conf.endpoints.flow}/flows/${flowId}/start`,
            withCredentials: true,
        });

        dispatch({
            type: START_FLOW,
        });
        dispatch(getFlows());
    } catch (err) {
        console.log(err);
    }
};

export const stopFlow = (flowId) => async (dispatch) => {
    try {
        await axios({
            method: 'post',
            url: `${conf.endpoints.flow}/flows/${flowId}/stop`,
            withCredentials: true,
        });

        dispatch({
            type: STOP_FLOW,
        });
        dispatch(getFlows());
    } catch (err) {
        console.log(err);
    }
};

export const deleteFlow = (flowId) => async (dispatch) => {
    try {
        await axios({
            method: 'delete',
            url: `${conf.endpoints.flow}/flows/${flowId}`,
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

export const executeFlow = (flowId, data) => async (dispatch) => {
    try {
        await axios({
            method: 'post',
            url: `${conf.endpoints.webhooks}/hook/${flowId}`,
            withCredentials: true,
            json: true,
            data,
        });

        dispatch({
            type: EXECUTE_FLOW,
        });
    } catch (err) {
        console.log(err);
    }
};

export const switchAddState = () => async (dispatch) => {
    try {
        dispatch({
            type: FLOW_ADD_STATE,
        });
    } catch (err) {
        console.log(err);
    }
};
