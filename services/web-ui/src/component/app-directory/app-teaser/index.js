
import React from 'react';
import { Link } from 'react-router-dom';

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';

const AppTeaser = props => <React.Fragment><Grid container justify="center"
    alignItems="center" onClick={() => { props.onClick && props.onClick(props._id); }}>

    <Grid item xs={2}>
        {props.img && <img src={props.img} alt={props.name} style={{ width: '50px' }} />}
    </Grid>
    <Grid item xs={7}>
        <h4>{props.name}</h4>
        <small>{props.artifactId}</small>
    </Grid>

    {!props.hideControls && <Grid item xs={3}>
        <Link to={`/app-details/${props._id}`}>
            <Button variant="outlined" aria-label="Edit" onClick={props.onEdit}>
                Update
            </Button>
        </Link>
        <Button variant="outlined" aria-label="Delete" onClick={props.onDelete}>
            Delete
        </Button>
    </Grid>}
</Grid>

<Divider />
</React.Fragment>;

export default AppTeaser;
