import React from 'react';
import { Link } from 'react-router-dom';

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import {
    Edit, Delete, CompareArrows,
} from '@material-ui/icons';

import { withStyles } from '@material-ui/styles';

const useStyles = {
    buttonTeaser: {
        margin: '0 4px',
    },

    h4: {
        margin: '0',
    },
    placeholderImg: {
        width: '50px',
        height: '50px',
        backgroundColor: 'rgba(0,0,0,0.08)',
        borderRadius: '4px',
        // display: 'block',
        margin: 'auto',
        fontSize: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
};

const DispatcherConfigTeaser = (props) => <React.Fragment>
    <Grid container xs={12} justify="center" alignItems="center" style={{ padding: '16px' }}>
        <Grid item xs={1}>
            <div className={props.classes.placeholderImg}>
                <CompareArrows style={{ width: '30px', height: '30px', opacity: '0.8' }}/>
            </div>
        </Grid>
        <Grid item xs={5}>
            <h4 className={props.classes.h4}>{props.name}</h4>
            <span>Data domain: {props.domain && props.domain.name}</span>
        </Grid>
        <Grid item xs={4}>
            <div style={{ height: '50px', display: 'flex', alignItems: 'center' }}>
                <small>Connected apps: </small>
                {props.apps.map((app) => <img
                    key={app._id}
                    src={app.img}
                    alt={app.name}
                    style={{ width: '20px', margin: '5px' }}
                />)}
            </div>
        </Grid>

        <Grid item xs={2}>
            <Link to={`/hub-and-spoke/${props.id}`}>
                <Button variant="text" className={props.classes.buttonTeaser} aria-label="Edit" onClick={props.onEdit}>
                    <Edit />
                </Button>
            </Link>
            <Button variant="text" className={props.classes.buttonTeaser} aria-label="Delete" onClick={props.onDelete}>
                <Delete/>
            </Button>
        </Grid>
    </Grid>

    <Divider />
</React.Fragment>;

export default withStyles(useStyles)(DispatcherConfigTeaser);
