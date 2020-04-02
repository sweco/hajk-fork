import React from "react";
import { withStyles } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";
import Informationbar from "./components/Informationbar";
import Toolbar from "./components/Toolbar";
import AttributeEditor from "./components/AttributeEditor";
import { withSnackbar } from "notistack";

const styles = theme => ({
  root: {
    marginBottom: theme.spacing(1),
    textAlign: "center"
  }
});

class MarkisView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      userMode: undefined,
      type: undefined,
      objectId: undefined,
      editFeatureId: undefined,
      featuresExist: undefined
    };

    this.localObserver = this.props.localObserver;
    this.globalObserver = this.props.app.globalObserver;

    this.localObserver.subscribe("markisMessageEvent", message => {
      this.showAdvancedSnackbar(message.message, message.variant);
      if (message.reset) {
        this.reset();
      }
    });

    this.localObserver.subscribe("show-existing-contract", message => {
      this.updateState();
    });

    this.localObserver.subscribe("create-contract", message => {
      this.updateState();
    });

    this.localObserver.subscribe("search-results-cleared", message => {
      this.updateState();
    });
  }

  updateState() {
    this.setState({
      userMode: this.props.model.markisParameters.userMode,
      type: this.props.model.markisParameters.type,
      objectId: this.props.model.markisParameters.objectId
    });
  }

  showAdvancedSnackbar = (message, variant) => {
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
      variant: variant || "error",
      autoHideDuration: 7000,
      persist: false,
      action
    });
  };

  reset() {
    this.props.model.reset();
    this.setState({
      userMode: this.props.model.markisParameters.userMode,
      type: this.props.model.markisParameters.type,
      objectId: undefined,
      editFeatureId: undefined,
      featuresExist: undefined
    });
  }

  render() {
    const { classes } = this.props;
    return (
      <>
        <div className={classes.root}>
          <Informationbar
            model={this.props.model}
            observer={this.props.localObserver}
            userMode={this.state.userMode}
            type={this.state.type}
            objectId={this.state.objectId}
          />
        </div>
        <div>
          <Toolbar
            model={this.props.model}
            observer={this.props.localObserver}
            messageHandler={this.showAdvancedSnackbar}
            panel={this}
            userMode={this.state.userMode}
            type={this.state.type}
          />
        </div>
        <div>
          <AttributeEditor
            model={this.props.model}
            observer={this.props.localObserver}
            messageHandler={this.showAdvancedSnackbar}
          />
        </div>
      </>
    );
  }
}

MarkisView.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(withSnackbar(MarkisView));
