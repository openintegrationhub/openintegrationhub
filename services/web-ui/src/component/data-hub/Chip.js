import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Chip from '@material-ui/core/Chip';
import DoneIcon from '@material-ui/icons/Done';
// import ClearIcon from '@material-ui/icons/Clear';

const useStyles = makeStyles(() => ({
  root: {
    marginTop: 30,
  },
}));

const chipDisplay = ['default', 'active', 'invert'];
const counter = 1;
export default function SmallOutlinedChips({ label }) {
  const classes = useStyles();
  const [chipState] = useState(chipDisplay[counter]);

  let chipIcon;
  switch (chipState) {
    case 'invert':
      chipIcon = <DoneIcon/>;
      break;
    case 'active':
      chipIcon = <DoneIcon style={{ color: 'white' }}/>;
      break;
    default:
      chipIcon = '';
      break;
  }

  const handleDelete = () => {
    console.info('You clicked the delete icon.');
  };

  const handleClick = () => {
    console.info('You clicked the Chip.');
  };

  return (
    <div className={classes.root}>
      <Chip
        variant="outlined"
        size="small"
        style={{
          background: 'orange', color: 'black', padding: 3, fontSize: 12,
        }}
        label={label}
        onClick={handleClick}
        onDelete={handleDelete}
        deleteIcon={chipIcon}
      />
    </div>
  );
}
