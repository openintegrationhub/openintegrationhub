import React from 'react';
import { withStyles } from '@material-ui/styles';
// import Grid from '@material-ui/core/Grid';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// import EditTenant from '../edit-tenant';


// components
import FlowTeaser from './flow-teaser';

// actions
import { getFlows } from '../../action/flows';


const useStyles = {
    wrapper: {
        width: '100%',
        padding: '10vh 0 0 0',
    },
};

class Flows extends React.Component {
    state= {
        editUserIsOpen: false,
    }

    constructor(props) {
        super();
        props.getFlows();
    }

    editHandler = (userId) => {
        this.setState({
            editUserIsOpen: true,
            editUserId: userId,
        });
    };

    render() {
        // const {
        //     classes,
        // } = this.props;
        return (
            <div >
                <FlowTeaser/>
            </div>
        );
    }
}

const mapStateToProps = state => ({
    flows: state.flows,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    getFlows,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(Flows);
