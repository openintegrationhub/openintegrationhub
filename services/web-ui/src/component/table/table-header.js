import React from 'react';
import TableHead from '@material-ui/core/TableHead';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import Checkbox from '@material-ui/core/Checkbox';
import Tooltip from '@material-ui/core/Tooltip';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import PropTypes from 'prop-types';

const CONF = require('../../conf').getConfig();

class TableHeader extends React.Component {
    rows = [];

    checked = false;

    constructor(props) {
        super(props);
        if (props.type === 'user') {
            CONF.tableConfig.user.forEach((element, index) => {
                this.rows.push({
                    id: element, numeric: index !== 0, disablePadding: index === 0, label: element,
                });
            });
        } else if (props.type === 'tenant') {
            CONF.tableConfig.tenant.forEach((element, index) => {
                this.rows.push({
                    id: element, numeric: index !== 0, disablePadding: index === 0, label: element,
                });
            });
        }
    }

    createSortHandler = (property) => () => {
        this.props.onRequestSort(property);
    };

    selectAll = () => {
        this.checked = !this.checked;
        this.props.onSelectAllClick(this.checked);
    };

    render() {
        const {
            order, orderBy, numSelected, rowCount,
        } = this.props;
        return (

            <TableHead>
                <TableRow>
                    <TableCell padding="checkbox">
                        <Checkbox
                            indeterminate={numSelected > 0 && numSelected < rowCount}
                            checked={numSelected === rowCount}
                            onChange={this.selectAll}
                        />
                    </TableCell>
                    {this.rows.map(
                        (row) => (
                            <TableCell
                                key={row.id}
                                align={row.numeric ? 'right' : 'left'}
                                padding={row.disablePadding ? 'none' : 'default'}
                                sortDirection={orderBy === row.id ? order : false}
                            >
                                <Tooltip
                                    title="Sort"
                                    placement={row.numeric ? 'bottom-end' : 'bottom-start'}
                                    enterDelay={300}
                                >
                                    <TableSortLabel
                                        active={orderBy === row.id}
                                        direction={order}
                                        onClick={this.createSortHandler(row.id)}
                                    >
                                        {row.label}
                                    </TableSortLabel>
                                </Tooltip>
                            </TableCell>
                        ),
                        this,
                    )}
                    <TableCell
                        key='action'
                        align='right'
                    >
                        <Tooltip
                            title="action"
                            enterDelay={300}
                        >
                            <TableSortLabel>
                                action
                            </TableSortLabel>
                        </Tooltip>
                    </TableCell>
                </TableRow>
            </TableHead>
        );
    }
}

TableHeader.propTypes = {
    numSelected: PropTypes.number.isRequired,
    onRequestSort: PropTypes.func.isRequired,
    onSelectAllClick: PropTypes.func.isRequired,
    order: PropTypes.string.isRequired,
    orderBy: PropTypes.string.isRequired,
    rowCount: PropTypes.number.isRequired,
};

export default TableHeader;
