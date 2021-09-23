import React from 'react';
import { Link } from 'react-router-dom';

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';

import {
    Edit, Delete,
} from '@material-ui/icons';
import { withStyles } from '@material-ui/styles';

const useStyles = {
    buttonTeaser: {
        margin: '0 4px',
    },
    title: {
        margin: '0 0 4px 0',
    },
    description: {
        margin: '0 0 4px 0',
    },
    appTeaser: {
        padding: '16px',
    },
    placeholderImg: {
        width: '50px',
        height: '50px',
        backgroundColor: 'rgba(0,0,0,0.08)',
        borderRadius: '4px',
        display: 'block',
        margin: 'auto',
    },
};

const AppTeaser = (props) => <React.Fragment><Grid className={props.classes.appTeaser} xs={12} container justify="center"
    alignItems="center" onClick={() => { props.onClick && props.onClick(props._id); }}>

    <Grid item xs={!props.hideControls ? 1 : 3}>
        {props.img ? <img src={props.img} alt={props.name} style={{ width: '50px', margin: 'auto', display: 'block' }} />
            : <div className={props.classes.placeholderImg}></div>}
    </Grid>
    <Grid item xs={9}>
        <h4 className={props.classes.title}>{props.name}</h4>
        <span className={props.classes.description}>{props.artifactId}</span>
    </Grid>

    {!props.hideControls && <Grid item xs={2}>
        <Link to={`/app-details/${props._id}`}>
            <Button variant="text" className={props.classes.buttonTeaser} aria-label="Edit" onClick={props.onEdit}>
                <Edit />
            </Button>
        </Link>
        <Button variant="text" className={props.classes.buttonTeaser} aria-label="Delete" onClick={props.onDelete}>
            <Delete/>
        </Button>
    </Grid>}
</Grid>

<Divider />
</React.Fragment>;

export default withStyles(useStyles)(AppTeaser);
