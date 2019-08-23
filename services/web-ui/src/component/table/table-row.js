import React from 'react';
import TableRow from '@material-ui/core/TableRow';
import Checkbox from '@material-ui/core/Checkbox';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import TableCell from '@material-ui/core/TableCell';
import EditIcon from '@material-ui/icons/Edit';

const TableRowData = (props) => {
    if (props && props.type === 'user') {
        return (<TableRow
            hover
            role="checkbox"
            aria-checked={props.isSelected}
            tabIndex={-1}
            selected={props.isSelected}
        >
            <TableCell padding="checkbox">
                <Checkbox checked={props.isSelected} onClick={props.handleClick} disabled={props.disabled}/>
            </TableCell>
            <TableCell
                component="th"
                scope="row"
                padding="none">
                {props.data.username}
            </TableCell>
            <TableCell align="right">{props.data.roles}</TableCell>
            <TableCell align="right">{props.data.createdAt}</TableCell>
            <TableCell align="right">{props.data.updatedAt}</TableCell>
            <TableCell align="right">{props.data.status}</TableCell>
            <TableCell align="right">
                <Tooltip title="Edit">
                    <IconButton type="button" aria-label="Edit" onClick={props.editHandler}>
                        <EditIcon />
                    </IconButton>
                </Tooltip>
            </TableCell>
        </TableRow>);
    } if (props && props.type === 'tenant') {
        return (<TableRow
            hover
            role="checkbox"
            aria-checked={props.isSelected}
            tabIndex={-1}
            selected={props.isSelected}
        >
            <TableCell padding="checkbox">
                <Checkbox checked={props.isSelected} onClick={props.handleClick}/>
            </TableCell>
            <TableCell
                component="th"
                scope="row"
                padding="none">
                {props.data.name}
            </TableCell>
            <TableCell align="right">{props.data.status}</TableCell>
            <TableCell align="right">{props.data.createdAt}</TableCell>
            <TableCell align="right">{props.data.updatedAt}</TableCell>
            <TableCell align="right">
                <Tooltip title="Edit">
                    <IconButton type="button" aria-label="Edit" onClick={props.editHandler}>
                        <EditIcon />
                    </IconButton>
                </Tooltip>
            </TableCell>
        </TableRow>);
    }
    return (<TableRow></TableRow>);
};

export default TableRowData;
