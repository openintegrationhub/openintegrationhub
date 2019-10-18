import React from 'react';
import { mount } from 'enzyme';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import Component from '.';

it('renders without crashing', () => {
    mount(
        <Provider store={global.configureStore()}>
            <MemoryRouter>
                <Component
                    data={{ name: 'Test' }}
                    provider={{ name: 'foo', type: 'OA2_AUTHORIZATION_CODE' }}
                    authClients={{
                        available: [],
                    }}
                    startFlow={() => { }}
                    addMixed={() => { }}
                    close={() => { }}
                />
            </MemoryRouter>
        </Provider>,
    );
});
