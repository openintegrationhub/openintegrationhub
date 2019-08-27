import React from 'react';
import { mount } from 'enzyme';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import Component from '.';

it('renders without crashing', () => {
    mount(
        <Provider store={global.configureStore({
            auth: {
                _id: 'sadferhrwthasdg',
            },
            users: {
                all: [
                    {
                        _id: 'sadferhrwthasdg',
                        isLoggedIn: true,
                        username: 'test@test.de',
                        tenant: '123456789',
                        firstname: 'test',
                        lastname: 'test',
                        permissions: ['all'],
                    },
                ],
            },
            tenants: {
                all: [
                    {
                        _id: '123456789',
                        isLoggedIn: true,
                        username: 'test@test.de',
                        firstname: 'test',
                        lastname: 'test',
                        permissions: ['all'],
                    },
                ],
            },
        })}>
            <MemoryRouter>
                <Component />
            </MemoryRouter>
        </Provider>,
    );
});
