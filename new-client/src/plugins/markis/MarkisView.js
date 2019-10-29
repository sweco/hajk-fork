import React from "react";
import { withStyles } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";
import { withSnackbar } from "notistack";

const styles = theme => ({});

class MarkisView extends React.PureComponent {
  state = { isConnected: false, test: false };

  constructor(props) {
    super(props);
    this.model = this.props.model;
    this.searchModel = this.model.SearchModel;

    this.localObserver = this.props.localObserver;
    this.globalObserver = this.props.app.globalObserver;

    this.localObserver.subscribe("markisErrorEvent", message => {
      this.showAdvancedSnackbar(message);
    });
    this.localObserver.subscribe("markisSearchComplete", message => {
      this.props.enqueueSnackbar(message);
    });
  }

  showAdvancedSnackbar = message => {
    const action = key => (
      <>
        <Button
          onClick={() => {
            this.props.closeSnackbar(key);
          }}
        >
          {"Stäng"}
        </Button>
      </>
    );

    this.props.enqueueSnackbar(message, {
      variant: "error",
      persist: true,
      action
    });
  };

  buttonClick = () => {
    // We have access to plugin's model:
    //if (!this.model.isConnected) this.model.connectToHub();
    //else this.model.disconnectHub();

    this.model.doSearch("pilgatan");
  };

  render() {
    return (
      <>
        <Button onClick={this.buttonClick}>
          {this.state.test || "Click to connect"}
        </Button>
      </>
    );
  }
}

MarkisView.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(withSnackbar(MarkisView));
