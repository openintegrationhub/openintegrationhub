/*  eslint-disable no-await-in-loop */
import axios from 'axios';

import { getConfig } from '../conf';

const conf = getConfig();
export const GET_DATA_OBJECTS = 'GET_DATA_OBJECTS';

export const getDataObjects = () => async (dispatch) => {
    try {
        const requestPerPage = 100;
        let dataObjects = [];
        let result = (await axios({
            method: 'get',
            url: `${conf.endpoints.dataHub}/data`,
            withCredentials: true,
            params: { 'page[size]': requestPerPage },
        })).data;

        if (result.data) {
            dataObjects = dataObjects.concat(result.data);
        }

        // request more pages if needed
        for (let i = result.meta.page; i < result.meta.totalPages; i++) {
            result = (await axios({
                method: 'get',
                url: `${conf.endpoints.dataHub}/data`,
                withCredentials: true,
                params: { 'page[size]': requestPerPage, 'page[number]': i + 1 },
            })).data;

            if (result.data) {
                dataObjects = dataObjects.concat(result.data);
            }
        }

        dispatch({
            type: GET_DATA_OBJECTS,
            data: dataObjects,
        });
    } catch (err) {
        console.log(err);
    }
};

// plain requests

export const enrichData = async () => {
    try {
        const result = await axios({
            method: 'post',
            url: `${conf.endpoints.dataHub}/data/enrich`,
            params: { 'page[size]': 100 },
            data: {
                functions: [
                    {
                        name: 'score',
                        active: true,
                        fields: [
                            {
                                key: 'firstName',
                                minLength: 5,
                                weight: 1,
                            },
                            {
                                key: 'lastName',
                                minLength: 5,
                                weight: 1,
                            },
                            {
                                key: 'jobTitle',
                                minLength: 5,
                                weight: 2,
                            },
                            {
                                key: 'description',
                                minLength: 5,
                                weight: 2,
                            },
                            {
                                key: 'description',
                                minLength: 4,
                                weight: 3,
                            },
                            {
                                key: 'name',
                                minLength: 8,
                                weight: 2,
                            },
                        ],
                    },
                    {
                        name: 'tag',
                        active: true,
                        fields: [
                            {
                                comparator: 'fieldEquals',
                                tag: 'special-salutation',
                                additive: true,
                                arguments: {
                                    field: 'salutation',
                                    targetValue: 'Dr.',
                                },
                            },
                            {
                                comparator: 'hasField',
                                tag: 'docx',
                                additive: true,
                                arguments: {
                                    field: 'filesize',
                                },
                            },
                            {
                                comparator: 'fieldEquals',
                                tag: 'stock-item',
                                additive: true,
                                arguments: {
                                    field: 'isStockItem',
                                    targetValue: true,
                                },
                            },
                        ],
                    },
                ],
            },
            withCredentials: true,
        });

        console.log(result);
    } catch (err) {
        console.log(err);
    }
};
