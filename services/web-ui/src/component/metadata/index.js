import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// Ui
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import InputLabel from '@material-ui/core/InputLabel';
import {
    Add, NavigateNext, NavigateBefore,
} from '@material-ui/icons';

import Modal from '@material-ui/core/Modal';

// Domains
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';

import MetadataTeaser from './metadata-teaser';

// actions
import { getDomains, createDomain, getMetadataPage } from '../../action/metadata';

const useStyles = {
    wrapper: {
        padding: '20px 0',
        justifyContent: 'center',
    },
    modal: {
        backgroundColor: 'white',
        margin: 'auto',
        outline: 'none',
    },
};

class MetaData extends React.Component {
    state= {
        addDomain: false,
        editorData: null,
        wasChanged: false,
    }

    constructor(props) {
        super(props);
        props.getDomains();
        this.dummyData = {
            name: 'String',
            description: 'string',
            public: true,
            owners: [
                {
                    id: props.auth._id,
                    type: 'USER',
                },
            ],
        };
    }

    addDomain = () => {
        this.setState({
            addDomain: true,
        });
    };

    saveDomain = () => {
        if (this.state.wasChanged) {
            this.props.createDomain(this.state.editorData);
            this.setState({
                addDomain: false,
                wasChanged: false,
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

    prePage = () => {
        if (this.props.metadata.meta.page === 1) {
            this.props.getMetadataPage(this.props.metadata.meta.totalPages);
        } else {
            this.props.getMetadataPage(this.props.metadata.meta.page - 1);
        }
    };

    nextPage = () => {
        if (this.props.metadata.meta.page === this.props.metadata.meta.totalPages) {
            this.props.getMetadataPage(1);
        } else {
            this.props.getMetadataPage(this.props.metadata.meta.page + 1);
        }
    };

    render() {
        const {
            classes,
        } = this.props;

        return (
            <Container className={classes.wrapper}>
                <Grid container spacing={2}>

                    <Grid item xs={6}>
                        <Button variant="outlined" aria-label="Add" onClick={this.addDomain}>
                        Add<Add/>
                        </Button>
                    </Grid>
                    {this.props.metadata.meta && <Grid item xs={6}>
                        <Grid container justify="flex-end" spacing={2}>
                            <Grid item>
                                <InputLabel>Domains: </InputLabel>{this.props.metadata.meta.total}
                            </Grid>
                            <Grid item>
                                <Button variant="outlined" aria-label="before" onClick={this.prePage} >
                                    <NavigateBefore/>
                                </Button>
                            </Grid>
                            <Grid item>
                                {this.props.metadata.meta.page}/{this.props.metadata.meta.totalPages}
                            </Grid>
                            <Grid item>
                                <Button variant="outlined" aria-label="next" onClick={this.nextPage}>
                                    <NavigateNext/>
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>}

                </Grid>
                <Grid container justify="center" spacing={2}>
                    {
                        this.props.metadata.domains.length && this.props.metadata.domains.map((item) => <MetadataTeaser key={`metadataTeaser-${item.id}`} data={item}/>)
                    }
                </Grid>

                <Modal
                    aria-labelledby="simple-modal-title"
                    aria-describedby="simple-modal-description"
                    open={this.state.addDomain}
                    onClose={ () => { this.setState({ addDomain: false }); }}
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                >
                    <div className={classes.modal}>
                        <JSONInput
                            id = 'jsonEdit'
                            locale = {locale}
                            placeholder = {this.dummyData}
                            theme = 'dark_vscode_tribute'
                            height = '550px'
                            width = '600px'
                            onChange={this.editorChange.bind(this)}
                        />
                        <Button variant="outlined" aria-label="Add" onClick={() => { this.setState({ addDomain: false }); }}>
                            close
                        </Button>
                        <Button variant="outlined" aria-label="Add" onClick={this.saveDomain} disabled={!this.state.wasChanged}>
                            Save
                        </Button>
                    </div>

                </Modal>
            </Container>
        );
    }
}

const mapStateToProps = (state) => ({
    metadata: state.metadata,
    auth: state.auth,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    getDomains,
    createDomain,
    getMetadataPage,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(MetaData);
