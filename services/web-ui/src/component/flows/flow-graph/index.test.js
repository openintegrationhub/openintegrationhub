import React from 'react';
import { mount } from 'enzyme';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import Component from '.';

it('renders without crashing', () => {
    mount(
        <Provider store={global.configureStore()}>
            <MemoryRouter>
                <Component />
            </MemoryRouter>
        </Provider>,
    );
});
