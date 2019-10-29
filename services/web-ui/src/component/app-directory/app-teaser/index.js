
import React from 'react';
import { Link } from 'react-router-dom';

import Grid from '@material-ui/core/Grid';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import InputLabel from '@material-ui/core/InputLabel';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Modal from '@material-ui/core/Modal';
import {
    AddBox,
} from '@material-ui/icons';


import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';

// Actions
import {
    deleteComponent, updateComponent,
} from '../../../action/components';

const useStyles = {
    heading: {
        fontSize: '0.9375rem',
        fontWeight: '400',
    },
    modal: {
        backgroundColor: 'white',
        margin: 'auto',
        outline: 'none',
    },
    appIcon: {
        width: '120px,',
    },
};

const AppTeaser = props => <React.Fragment><Grid container xs={12} justify="center"
    alignItems="center">

    <Grid item xs={2}>
        {props.img && <img src={props.img} alt={props.name} style={{ width: '50px' }} />}
    </Grid>
    <Grid item xs={7}>
        <h4>{props.name}</h4>
        <smal>{props.artifactId}</smal>
    </Grid>

    <Grid item xs={3}>
        <Link to={`/app-details/${props._id}`}>
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

export default AppTeaser;
