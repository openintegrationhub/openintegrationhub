import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import flow from 'lodash/flow';
// import classNames from 'classnames';
import { withStyles } from '@material-ui/styles';
import FormLabel from '@material-ui/core/FormLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Button from '@material-ui/core/Button';
import Input from '@material-ui/core/Input';
import update from 'immutability-helper';
import CircularProgress from '@material-ui/core/CircularProgress';
import { login } from '../../action/user';

const useStyles = {
    loginContainer: {
        display: 'flex',
        flexWrap: 'wrap',
    },
    form: {
        width: 200,
    },
    lable: {
        marginRight: 20,
    },
    button: {
        paddingTop: '20px',
    },
};

class Auth extends React.Component {
  state = {
      userData: {
          username: process.env.REACT_APP_DEFAULT_USERNAME || '',
          password: process.env.REACT_APP_DEFAULT_PASSWORD || '',
      },
      pending: false,
  }

  componentDidUpdate(prevProps) {
      if (this.props.user !== prevProps.user && this.props.user.isLoggedIn) {
          this.props.history.push('/');
      }
      // if (prevProps.tokenInvalid !== this.props.tokenInvalid) {
      //     this.setState({
      //         isLoggedIn: false,
      //     });
      // }
  }

  setVal = (fieldName, e) => {
      this.setState({
          userData: update(this.state.userData, {
              [fieldName]: {
                  $set: e.target.value,
              },
          }),
      });
  };

  login = async (e) => {
      e.preventDefault();
      this.setState({
          pending: true,
      });
      await this.props.login(this.state.userData);
  };

  render() {
      const { classes } = this.props;
      if (this.state.pending) {
          return (
              <CircularProgress color="secondary"/>
          );
      }

      return (
          <div className={classes.loginContainer}>
              <form onSubmit={this.login.bind(this)} className={classes.form}>
                  <FormGroup >
                      <FormLabel htmlFor="username">username</FormLabel>
                      <Input id="username" name="username" onChange={this.setVal.bind(this, 'username')} value={this.state.userData.username} />
                  </FormGroup>
                  <FormGroup >
                      <FormLabel htmlFor="password">password</FormLabel>
                      <Input id="password" type="password" name="password" onChange={this.setVal.bind(this, 'password')} value={this.state.userData.password} />
                  </FormGroup>
                  <Button type='submit' className={classes.button} variant="contained" color="secondary">Login</Button>
              </form>
          </div>
      );
  }
}

Auth.propTypes = {
    classes: PropTypes.object.isRequired,
};

const mapStateToProps = state => ({
    user: state.user,
});

const mapDispatchToProps = dispatch => bindActionCreators({
    login,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
    withRouter,
)(Auth);
