import React from 'react';
import update from 'immutability-helper';

export default function withForm(Component) {
    return class WithForm extends React.Component {
        state = {
            formData: {},
            validity: {},
            allValid: true,
        }

        setVal = (fieldName, e) => {
            const validity = (e.target.validity && e.target.validity.valid);
            const validities = { ...this.state.validity };

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

                validities[fieldName] = validity;
                // console.log(validities);
                // console.log(Object.values(this.state.validity));
                // console.log(this.state.validity);
                // console.log(this.state.validity);
                // allValid = Object.values(this.state.validity).reduce(val => val);

                this.setState({
                    formData: update(this.state.formData, {
                        [fieldName]: {
                            $set: e.target.value,
                        },
                    }),
                    validity: {
                        ...this.state.validity,
                        [fieldName]: validity,
                    },
                    allValid: Object.values(validities).reduce((val) => val),
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
                validity: {},
            });
        }

        removeVal = (fieldName) => {
            const formData = {
                ...this.state.formData,
            };

            delete formData[fieldName];
            this.setState({
                formData,
                validity: {},
            });
        }

        isValid = (fieldName) => {
            if (typeof this.state.validity[fieldName] !== 'undefined') {
                return this.state.validity[fieldName];
            }

            return true;
        }

        render() {
            const { ...other } = this.props;
            return <Component
                setVal={this.setVal}
                setExplicitVal={this.setExplicitVal}
                setFormData={this.setFormData}
                removeVal={this.removeVal}
                formData={this.state.formData}
                isValid={this.isValid}
                allValid={this.state.allValid}
                error={this.state.error}
                {...other}
            />;
        }
    };
}
