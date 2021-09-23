/* eslint no-alert: 0 */
import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import axios from 'axios';

// Ui
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import Button from '@material-ui/core/Button';
import InputLabel from '@material-ui/core/InputLabel';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import CircularProgress from '@material-ui/core/CircularProgress';
import Modal from '@material-ui/core/Modal';
import {
    Delete, Edit, Add, CloudUpload,
} from '@material-ui/icons';

// Domain
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';

import { getConfig } from '../../../conf';

// Actions
import {
    updateDomain, deleteDomain, createDomainSchema, deleteDomainSchema, updateDomainSchema,
} from '../../../action/metadata';

const conf = getConfig();

const useStyles = {
    heading: {
        fontSize: '0.9375rem',
        fontWeight: '400',
    },
    modal: {
        backgroundColor: 'white',
        width: '601px',
        margin: 'auto',
        outline: 'none',
    },
};

class MetaDataTeaser extends React.PureComponent {
    state= {
        editDomain: false,
        addSchema: false,
        editSchema: false,
        uploadSchema: false,
        waitForUpload: false,
        wasChanged: false,
        editorData: null,
        schemaClone: null,
        modalOpen: false,
        schemas: [],
    }

    constructor(props) {
        super(props);
        this.dummyData = {
            name: 'String',
            description: 'String',
            value: {
                $id: 'address',
                required: [
                    'street_address',
                    'city',
                    'state',
                ],
                properties: {
                    street_address: {
                        type: 'string',
                    },
                    city: {
                        type: 'string',
                    },
                    state: {
                        type: 'string',
                    },
                },
            },
        };
    }

    getSchemas() {
        return this.state.schemas.map((schema) => <Grid item xs={12} key={schema.id}>
            <Grid container spacing={2}>
                <Grid item xs={2}><InputLabel>Name:</InputLabel><Typography>{schema.name}</Typography></Grid>
                <Grid item xs={8}><InputLabel>Uri:</InputLabel><Typography>{schema.uri}</Typography></Grid>
                <Grid item xs={2}>
                    <Button variant="outlined" aria-label="next" onClick={async () => {
                        const result = await axios({
                            method: 'get',
                            url: `${conf.endpoints.metadata}/${schema.uri.replace('/api/v1/', '')}`,
                            withCredentials: true,
                            json: true,
                        });
                        this.setState({
                            editSchema: true,
                            editorData: result.data.data,
                            schemaClone: result.data.data,
                            modalOpen: true,
                        });
                    }}>
                        <Edit/>
                    </Button>
                    <Button variant="outlined" aria-label="next" onClick={this.deleteSchema.bind(this, this.props.data.id, schema.uri)}>
                        <Delete/>
                    </Button>
                </Grid>
            </Grid>
        </Grid>);
    }

    async saveSchema(domainId, e) {
        e.stopPropagation();
        if (this.state.wasChanged && this.state.addSchema) {
            await this.props.createDomainSchema(domainId, this.state.editorData);
            const result = await axios({
                method: 'get',
                url: `${conf.endpoints.metadata}/domains/${domainId}/schemas`,
                withCredentials: true,
                json: true,
            });

            this.setState({
                schemas: result.data.data,
                addSchema: false,
                wasChanged: false,
                editorData: null,
                modalOpen: false,
            });
        }
        if (this.state.wasChanged && this.state.editSchema) {
            if (this.state.schemaClone.value.$id === this.state.editorData.value.$id) {
                await this.props.updateDomainSchema(this.state.editorData);
                const result = await axios({
                    method: 'get',
                    url: `${conf.endpoints.metadata}/domains/${domainId}/schemas`,
                    withCredentials: true,
                    json: true,
                });

                this.setState({
                    schemas: result.data.data,
                    editSchema: false,
                    wasChanged: false,
                    editorData: null,
                    modalOpen: false,
                });
            } else {
                alert('value.$id can not be changed');
                this.setState({
                    editSchema: false,
                    wasChanged: false,
                    editorData: null,
                    schemaClone: null,
                    modalOpen: false,
                });
            }
        }
    }

    async deleteSchema(domainId, uri, e) {
        e.stopPropagation();
        await this.props.deleteDomainSchema(domainId, uri);
        const result = await axios({
            method: 'get',
            url: `${conf.endpoints.metadata}/domains/${this.props.data.id}/schemas`,
            withCredentials: true,
            json: true,
        });
        this.setState({
            schemas: result.data.data,
        });
    }

    deleteDomain = (e) => {
        e.stopPropagation();
        this.props.deleteDomain(this.props.data.id);
    }

    updateDomain = (e) => {
        e.stopPropagation();
        if (this.state.wasChanged) {
            this.props.updateDomain(this.state.editorData);
            this.setState({
                editDomain: false,
                wasChanged: false,
                modalOpen: false,
                editorData: null,
            });
        }
    }

    editorChange(e) {
        if (!e.error) {
            this.setState({
                editorData: e.jsObject,
                wasChanged: true,
            });
        }
    }

    async handleExpansion(e, expanded) {
        let result = null;
        if (expanded) {
            result = await axios({
                method: 'get',
                url: `${conf.endpoints.metadata}/domains/${this.props.data.id}/schemas`,
                withCredentials: true,
                json: true,
            });
            this.setState({
                schemas: result.data.data,
            });
        }
    }

    async onUpload(e) {
        e.preventDefault();
        this.setState({
            waitForUpload: true,
        });
        try {
            await this.fileUpload(this.state.file);
        } catch (error) {
            alert(error);
        }
        const result = await axios({
            method: 'get',
            url: `${conf.endpoints.metadata}/domains/${this.props.data.id}/schemas`,
            withCredentials: true,
            json: true,
        });
        this.setState({
            uploadSchema: false,
            modalOpen: false,
            file: null,
            schema: result.data.data,
        });
    }

    onUploadChange = (e) => {
        this.setState({ file: e.target.files[0] });
    }

    async fileUpload(file) {
        const url = `${conf.endpoints.metadata}/domains/${this.props.data.id}/schemas/import`;
        const formData = new FormData();
        formData.append('archive', file);
        const config = {
            headers: {
                'content-type': 'multipart/form-data',
            },
        };
        await axios.post(url, formData, config);
    }

    render() {
        const {
            classes,
        } = this.props;
        return (
            <Grid item xs={12}>
                <Accordion onChange={this.handleExpansion.bind(this)}>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="panel1a-content"
                        id="panel1a-header"
                    >

                        <Grid container>
                            <Grid item xs={3}><InputLabel>Name:</InputLabel><Typography >{this.props.data.name}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Description:</InputLabel><Typography >{this.props.data.description}</Typography></Grid>

                            <Grid item xs={4} />
                            <Grid item xs={2} >
                                <Button variant="outlined" aria-label="next" onClick={(e) => {
                                    e.stopPropagation();
                                    this.setState({
                                        modalOpen: true,
                                        editDomain: true,
                                        editorData: this.props.data,
                                    });
                                }}>
                                    <Edit/>
                                </Button>
                                <Button variant="outlined" aria-label="next" onClick={this.deleteDomain}>
                                    <Delete/>
                                </Button>
                            </Grid>
                        </Grid>

                    </AccordionSummary>
                    <AccordionSummary>
                        <Grid container>
                            <Grid item xs={12} container>
                                <Grid item xs={2}>
                                    <h3>Schemas</h3>
                                </Grid>
                                <Grid item xs={2}>
                                    <Button variant="outlined" onClick={() => {
                                        this.setState({
                                            modalOpen: true,
                                            addSchema: true,
                                            editorData: this.dummyData,
                                        });
                                    }}>
                                        <Add />
                                    </Button>
                                    <Button variant="outlined" onClick={() => {
                                        this.setState({
                                            modalOpen: true,
                                            uploadSchema: true,
                                        });
                                    }}>
                                        <CloudUpload/>
                                    </Button>
                                </Grid>

                            </Grid>
                            {
                                this.state.schemas.length && this.getSchemas()
                            }
                        </Grid>
                    </AccordionSummary>
                </Accordion>
                <Modal
                    aria-labelledby="simple-modal-title"
                    aria-describedby="simple-modal-description"
                    open={this.state.modalOpen}
                    onClose={ () => {
                        this.setState({
                            editDomain: false,
                            editSchema: false,
                            addSchema: false,
                            uploadSchema: false,
                            modalOpen: false,
                        });
                    }}
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                >
                    <div className={classes.modal}>
                        {
                            this.state.editDomain || this.state.editSchema || this.state.addSchema
                                ? <div>
                                    <JSONInput
                                        id = 'jsonEdit'
                                        locale = {locale}
                                        theme = 'dark_vscode_tribute'
                                        placeholder = {this.state.editorData}
                                        height = '550px'
                                        width = '600px'
                                        onChange={this.editorChange.bind(this)}
                                    />
                                    <Button variant="outlined" onClick={() => {
                                        this.setState({
                                            editDomain: false,
                                            editSchema: false,
                                            addSchema: false,
                                            modalOpen: false,
                                        });
                                    }}>
                                    close
                                    </Button>
                                    {
                                        this.state.editDomain
                                            ? <Button variant="outlined" onClick={this.updateDomain} disabled={!this.state.wasChanged}>
                                Save
                                            </Button>
                                            : null
                                    }
                                    {
                                        this.state.addSchema
                                            ? <Button variant="outlined" onClick={this.saveSchema.bind(this, this.props.data.id)} disabled={!this.state.wasChanged}>
                            Save
                                            </Button>
                                            : null
                                    }
                                    {
                                        this.state.editSchema
                                            ? <Button variant="outlined" onClick={this.saveSchema.bind(this, this.props.data.id)} disabled={!this.state.wasChanged}>
                            Save
                                            </Button>
                                            : null
                                    }
                                </div>
                                : null
                        }
                        {
                            this.state.uploadSchema && !this.state.waitForUpload
                                ? <form onSubmit={this.onUpload.bind(this)}>
                                    <h1>File Upload</h1>
                                    <input type="file" onChange={this.onUploadChange} accept=".zip, .tgz"/>
                                    <Button type="submit" variant="outlined" >
                                        Upload
                                    </Button>
                                </form>
                                : this.state.waitForUpload && <CircularProgress/>
                        }

                    </div>
                </Modal>
            </Grid>
        );
    }
}

const mapStateToProps = (state) => ({
    metadata: state.metadata,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    deleteDomain,
    updateDomain,
    createDomainSchema,
    deleteDomainSchema,
    updateDomainSchema,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(MetaDataTeaser);
