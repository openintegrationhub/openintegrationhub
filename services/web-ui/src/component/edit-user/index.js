import React from 'react';
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';


const useStyles = {
    wrapper: {
        width: '100%',
        padding: '10vh 0 0 0',
    },
};

class EditUser extends React.Component {
    render() {
        const {
            classes,
        } = this.props;
        return (
            <div className={classes.wrapper}>

            </div>
        );
    }
}

const mapStateToProps = state => ({

});
const mapDispatchToProps = dispatch => bindActionCreators({

}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(EditUser);
