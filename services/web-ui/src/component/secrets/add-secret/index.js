import React from 'react';
import flow from 'lodash/flow';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';
// Ui
import { withStyles } from '@material-ui/styles';
import Button from '@material-ui/core/Button';

import { getConfig } from '../../../conf';

const conf = getConfig();

const useStyles = {
    button: {
        margin: '20px',
    },
};

class AddSecret extends React.Component {
    state = {
        type: '',
        editorUsed: false,
        editorData: {
            name: 'String',
            payload: {
            },
        },
    }

    setTyoe(type) {
        this.setState({
            type,
        });
    }

    editorChange(e) {
        if (!e.error) {
            this.setState({
                editorData: e.jsObject,
                editorUsed: true,
            });
        }
    }

    render() {
        const {
            classes,
        } = this.props;
        const template = (() => {
            switch (this.state.type) {
            case conf.secret.type.OA2_AUTHORIZATION_CODE:
                return (
                    < React.Fragment >
                        {
                            this.props.authClients.available.map((client) => (
                                <Button
                                    key={client._id}
                                    variant="contained"
                                    className={classes.button}
                                    onClick={this.props.startFlow.bind(this, client._id)}
                                >
                                    {client.name}
                                </Button>
                            ))

                        }
                        < Button
                            className={classes.button}
                            onClick={() => { this.setState({ type: '' }); }}
                        >
                                BACK
                        </Button>
                    </React.Fragment >
                );
            case conf.secret.type.MIXED:
                return (
                    <React.Fragment>
                        <JSONInput
                            id='jsonEdit'
                            locale={locale}
                            theme='dark_vscode_tribute'
                            placeholder={this.state.editorData}
                            height='550px'
                            width='600px'
                            onChange={this.editorChange.bind(this)}
                        />
                        <Button
                            variant="outlined"
                            disabled={!this.state.editorUsed}
                            onClick={() => {
                                this.props.addMixed({
                                    data: {
                                        name: this.state.editorData.name,
                                        type: conf.secret.type.MIXED,
                                        value: {
                                            payload: JSON.stringify(this.state.editorData.payload),
                                        },

                                    },
                                });
                                this.props.close();
                            }}>
                                SAVE
                        </Button>
                    </React.Fragment>
                );
            default:
                return (
                    <React.Fragment>
                    </React.Fragment>
                );
            }
        })();

        return (
            < React.Fragment >
                {
                    this.state.type === '' ? (
                        < React.Fragment >
                            <Button
                                variant="contained"
                                className={classes.button}
                                onClick={() => { this.setState({ type: conf.secret.type.OA2_AUTHORIZATION_CODE }); }}
                            >
                                {conf.secret.type.OA2_AUTHORIZATION_CODE}
                            </Button>
                            <Button
                                variant="contained"
                                className={classes.button}
                                onClick={() => { this.setState({ type: conf.secret.type.MIXED }); }}
                            >
                                {conf.secret.type.MIXED}
                            </Button>
                        </React.Fragment>

                    ) : (
                        <React.Fragment>
                            {template}
                        </React.Fragment>
                    )}

            </React.Fragment>
        );
    }
}

AddSecret.propTypes = {
    authClients: PropTypes.object.isRequired,
    startFlow: PropTypes.func.isRequired,
    addMixed: PropTypes.func.isRequired,
    close: PropTypes.func.isRequired,
};

const mapStateToProps = () => ({

});
const mapDispatchToProps = (dispatch) => bindActionCreators({

}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(AddSecret);
