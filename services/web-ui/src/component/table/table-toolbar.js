import React from 'react';
import { withStyles } from '@material-ui/styles';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import DeleteIcon from '@material-ui/icons/Delete';
import FilterListIcon from '@material-ui/icons/FilterList';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import Input from '@material-ui/core/Input';

const toolbarStyles = () => ({
    root: {
        paddingRight: 10,
    },
    highlight: {
        color: 'secondary',
    },
    spacer: {
        flex: '1 1 100%',
    },
    actions: {
        flex: '0 0 auto',
        color: 'secondary',
    },
    title: {
        flex: '0 0 auto',
    },
});

const TableToolbar = (props) => {
    const { numSelected, classes } = props;

    return (
        <Toolbar
            className={classNames(classes.root, {
                [classes.highlight]: numSelected > 0,
            })}
        >
            <div className={classes.title}>
                {numSelected > 0 ? (
                    <Typography color="inherit" variant="h6">
                        {numSelected} {props.type.toString()} selected
                    </Typography>
                ) : (
                    <Typography variant="h6" id="tableTitle">
                        {props.type.toString()}
                    </Typography>
                )}
            </div>
            <div className={classes.spacer} />
            <div className={classes.actions}>
                <Input id="filter" name="filter" placeholder={props.type} />
                <Tooltip title="Filter list">
                    <IconButton aria-label="Filter list">
                        <FilterListIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                    <IconButton aria-label="Delete" onClick={props.onDelete}>
                        <DeleteIcon />
                    </IconButton>
                </Tooltip>
            </div>
        </Toolbar>
    );
};

TableToolbar.propTypes = {
    classes: PropTypes.object.isRequired,
    numSelected: PropTypes.number.isRequired,
};

export default withStyles(toolbarStyles)(TableToolbar);
