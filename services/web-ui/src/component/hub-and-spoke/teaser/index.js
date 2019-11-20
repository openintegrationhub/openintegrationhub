
import React from 'react';
import { Link } from 'react-router-dom';

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';

const DispatcherConfigTeaser = props => <React.Fragment><Grid container xs={12} justify="center"
    alignItems="center">

    <Grid item xs={2}>
        {props.img && <img src={props.img} alt={props.name} style={{ width: '50px' }} />}
    </Grid>
    <Grid item xs={7}>
        <h4>Name: {props.name}</h4>
        <small>Data domain: {props.domain && props.domain.name}</small>
        <div style={{ height: '50px', display: 'flex', alignItems: 'center' }}>
            <span>Connected apps: </span>
            {props.apps.map(app => <img
                key={app._id}
                src={app.img}
                alt={app.name}
                style={{ width: '20px', margin: '5px' }}
            />)}
        </div>
    </Grid>

    <Grid item xs={3}>
        <Link to={`/hub-and-spoke/${props.id}`}>
            <Button variant="outlined" aria-label="Edit" onClick={props.onEdit}>
                Update
            </Button>
        </Link>
        <Button variant="outlined" aria-label="Delete" onClick={props.onDelete}>
            Delete
        </Button>
    </Grid>
</Grid>

<Divider />
</React.Fragment>;

export default DispatcherConfigTeaser;
