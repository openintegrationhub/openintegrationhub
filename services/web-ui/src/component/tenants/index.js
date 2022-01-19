import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

// Ui
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';

// actions
import { Container } from '@material-ui/core';
import { getTenants } from '../../action/tenants';
// import EditTenant from '../edit-tenant';

// components
import Table from '../table';
import EditTenant from '../edit-tenant';

const useStyles = {
    wrapper: {
        width: '100%',
        position: 'inherit',
    },
    tools: {
        padding: '10px 0 0 10px',
    },
};

class Tenants extends React.Component {
    state= {
        editTenantIsOpen: false,
    }

    constructor(props) {
        super();
        props.getTenants();
    }

    editHandler = (tenantId) => {
        this.setState({
            editTenantIsOpen: true,
            editTenantId: tenantId,
        });
    };

    addTenant = () => {
        this.setState({
            editTenantIsOpen: true,
            editTenantId: '',
        });
    };

    render() {
        const {
            classes,
        } = this.props;
        return (
            <Container className={classes.wrapper}>
                <Grid item xs={12} className={classes.tools}>
                    <Button variant="outlined" aria-label="Add" onClick={this.addTenant}>
                        Add<AddIcon/>
                    </Button>

                </Grid>
                <Grid item xs={12}>
                    <EditTenant
                        side={'right'}
                        open={this.state.editTenantIsOpen}
                        tenantId={this.state.editTenantId}
                        onClose={() => {
                            this.setState({
                                editTenantIsOpen: false,
                            });
                        }}
                    />
                    <Table data={this.props.tenants.all} editHandler={this.editHandler} type='tenant'/>
                </Grid>

            </Container>
        );
    }
}

const mapStateToProps = (state) => ({
    tenants: state.tenants,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    getTenants,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(Tenants);
