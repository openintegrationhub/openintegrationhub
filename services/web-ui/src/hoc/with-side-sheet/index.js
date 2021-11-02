import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/styles';
import Drawer from '@material-ui/core/Drawer';
import flow from 'lodash/flow';
import Container from '@material-ui/core/Container';

const useStyles = {
    root: {
        flexGrow: 1,
    },
    list: {
        width: 'auto',
    },
};

export default function withSideSheet(Component) {
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

        toggleDrawerEventHandler = (open) => (event) => {
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
            const { classes, ...other } = this.props;

            return (
                <Drawer anchor={this.props.side} open={this.state[this.props.side]} onClose={this.toggleDrawerEventHandler(false)}>
                    <div
                        className={this.props.classes.list}
                        role="presentation"
                        // onClick={this.toggleDrawerEventHandler(false)}
                        // onKeyDown={this.toggleDrawerEventHandler(false)}
                    >
                        <div className={this.props.classes.root}>
                            <Container maxWidth="sm">
                                <Component
                                    onClose={this.onClose}
                                    {...other}
                                />
                            </Container>
                        </div>

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

    return flow(
        withStyles(useStyles),
    )(SideSheet);
}
