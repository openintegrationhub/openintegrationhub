import React from 'react';
import update from 'immutability-helper';

export default function withForm(Component) {
    return class Form extends React.Component {
        state = {
            formData: {},
        }

        setVal = (fieldName, e) => {
            switch (e.target.type) {
            case 'checkbox':
                this.setState({
                    formData: {
                        ...this.state.formData,
                        [fieldName]: e.target.checked,
                    },
                });
                break;
            case 'select-one':
                this.setState({
                    formData: {
                        ...this.state.formData,
                        [fieldName]: e.target.value,
                    },
                });
                break;
            default:
                this.setState({
                    formData: update(this.state.formData, {
                        [fieldName]: {
                            $set: e.target.value,
                        },
                    }),
                });
            }
        }

        setExplicitVal = (fieldName, value) => {
            this.setState({
                formData: {
                    ...this.state.formData,
                    [fieldName]: value,
                },
            });
        }

        setFormData = (formData) => {
            this.setState({
                formData,
            });
        }

        removeVal = (fieldName) => {
            const formData = {
                ...this.state.formData,
            };

            delete formData[fieldName];
            this.setState({
                formData,
            });
        }

        render() {
            const { ...other } = this.props;
            return <Component
                setVal={this.setVal}
                setExplicitVal={this.setExplicitVal}
                setFormData={this.setFormData}
                removeVal={this.removeVal}
                formData={this.state.formData}
                {...other}
            />;
        }
    };
}
