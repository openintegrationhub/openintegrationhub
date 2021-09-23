import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import InfoIcon from '@material-ui/icons/Info';
import CloseIcon from '@material-ui/icons/Close';
import green from '@material-ui/core/colors/green';
import amber from '@material-ui/core/colors/amber';
import IconButton from '@material-ui/core/IconButton';
import Snackbar from '@material-ui/core/Snackbar';
import SnackbarContent from '@material-ui/core/SnackbarContent';
import WarningIcon from '@material-ui/icons/Warning';
import { makeStyles } from '@material-ui/core/styles';

const variantIcon = {
    success: CheckCircleIcon,
    warning: WarningIcon,
    error: ErrorIcon,
    info: InfoIcon,
};

const useStyles1 = makeStyles((theme) => ({
    success: {
        backgroundColor: green[600],
    },
    error: {
        backgroundColor: theme.palette.error.dark,
    },
    info: {
        backgroundColor: theme.palette.primary.dark,
    },
    warning: {
        backgroundColor: amber[700],
    },
    icon: {
        fontSize: 20,
    },
    iconVariant: {
        opacity: 0.9,
        marginRight: theme.spacing(1),
    },
    message: {
        display: 'flex',
        alignItems: 'center',
    },
}));

function ContentWrapper(props) {
    const classes = useStyles1();
    const {
        className, message, onClose, variant, ...other
    } = props;
    const Icon = variantIcon[variant];

    return (
        <SnackbarContent
            className={clsx(classes[variant], className)}
            aria-describedby="client-snackbar"
            message={
                <span id="client-snackbar" className={classes.message}>
                    <Icon className={clsx(classes.icon, classes.iconVariant)} />
                    {message}
                </span>
            }
            action={[
                <IconButton key="close" aria-label="Close" color="inherit" onClick={onClose}>
                    <CloseIcon className={classes.icon} />
                </IconButton>,
            ]}
            {...other}
        />
    );
}

function SnackBar(props) {
    const [open, setOpen] = React.useState(true);
    const {
        vertical, horizontal, autoHideDuration, variant, children, onClose,
    } = props;

    function handleClose(event, reason) {
        if (reason === 'clickaway') {
            return;
        }

        setOpen(false);
        if (onClose) {
            onClose();
        }
    }

    return (
        <div>
            <Snackbar
                anchorOrigin={{
                    vertical,
                    horizontal,
                }}
                open={open}
                autoHideDuration={autoHideDuration}
                onClose={handleClose}
            >
                <ContentWrapper
                    onClose={handleClose}
                    variant={variant}
                    message={children}
                />
            </Snackbar>
        </div>
    );
}

SnackBar.propTypes = {
    vertical: PropTypes.string,
    horizontal: PropTypes.string,
    onClose: PropTypes.func,
    autoHideDuration: PropTypes.number,
    variant: PropTypes.oneOf(['success', 'warning', 'error', 'info']),
};

SnackBar.defaultProps = {
    vertical: 'top',
    horizontal: 'center',
    variant: 'warning',
    autoHideDuration: 3000,
};

export default SnackBar;
