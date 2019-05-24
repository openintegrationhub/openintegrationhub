import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/styles';
import Drawer from '@material-ui/core/Drawer';
import flow from 'lodash/flow';

const useStyles = {
    list: {
        width: 'auto',
    },
};

class SideSheet extends React.Component {
    state = {
        top: false,
        left: false,
        bottom: false,
        right: false,
    }

    componentDidMount() {
        this.toggleDrawer(this.props.open);
    }

    toggleDrawer = (open) => {
        if (!open) {
            this.onClose();
        }
        this.setState({ [this.props.side]: open });
    };

    toggleDrawerEventHandler = open => (event) => {
        if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
            return;
        }

        this.toggleDrawer(open);
    };

    onClose() {
        if (this.props.onClose) {
            this.props.onClose();
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.open !== prevProps.open) {
            this.toggleDrawer(this.props.open);
        }
    }

    render() {
        return (
            <Drawer anchor={this.props.side} open={this.state[this.props.side]} onClose={this.toggleDrawerEventHandler(false)}>
                <div
                    className={this.props.classes.list}
                    role="presentation"
                    onClick={this.toggleDrawerEventHandler(false)}
                    onKeyDown={this.toggleDrawerEventHandler(false)}
                >
                    {this.props.children}
                </div>
            </Drawer>
        );
    }
}

SideSheet.propTypes = {
    open: PropTypes.bool.isRequired,
    side: PropTypes.oneOf(['top', 'left', 'right', 'bottom']).isRequired,
    onClose: PropTypes.func,
};


export default flow(
    withStyles(useStyles),
)(SideSheet);
