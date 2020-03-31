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

class MarkisView extends React.PureComponent {
  state = {
    userMode: undefined,
    type: undefined,
    objectId: undefined
  };

  constructor(props) {
    super(props);
    this.localObserver = this.props.localObserver;
    this.globalObserver = this.props.app.globalObserver;

    this.localObserver.subscribe("markisMessageEvent", message => {
      this.showAdvancedSnackbar(message.message, message.variant);
      if (message.reset) {
        this.reset();
      }
    });
    // this.localObserver.subscribe("featureUpdate", vectorSource => {
    //   this.setState({
    //     geometryExists: this.props.model.geometriesExist,
    //     editFeatureId: this.props.model.editFeatureId || undefined,
    //     featureModified: this.props.model.featureModified,
    //     editingExisting: this.props.model.editingExisting,
    //     objectId: this.props.model.markisParameters.objectId
    //   });
    // });
    this.localObserver.subscribe("updateMarkisView", message => {
      // this.setState({
      //   userMode: this.props.model.markisParameters.userMode,
      //   type: this.props.model.markisParameters.type,
      //   objectId: this.props.model.markisParameters.objectId
      // });
      if (this.props.model.markisParameters.userMode === "Create") {
        console.log("Here");
        this.openCreateDialog();
      }
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

  openCreateDialog = () => {
    this.props.model.setEditLayer(this.props.model.sourceName);
    if (this.props.model.markisParameters.type === "Contract") {
      this.props.model.toggleLayerVisibility(
        [this.props.model.estateLayerName],
        true
      );
    }
    this.props.model.toggleLayerVisibility([this.props.model.sourceName], true);
    // this.setState({
    //   inCreation: true,
    //   allowLine: this.model.editSource.allowedGeometries.indexOf("Line") > -1,
    //   allowPolygon:
    //     this.model.editSource.allowedGeometries.indexOf("Polygon") > -1,
    //   geometryExists: this.model.geometriesExist,
    //   featureModified: this.model.featureModified,
    //   editingExisting: this.model.editingExisting
    // });
  };

  reset() {
    this.props.model.reset();
    // this.setState({
    //   inCreation: false,
    //   geometryExists: false,
    //   createMethod: "abort",
    //   formValues: {},
    //   objectId: undefined,
    //   serialNumber: undefined,
    //   createdBy: undefined,
    //   allowLine: true,
    //   allowPolygon: true
    // });
  }

  render() {
    console.log("Hello: ", this.props.model);
    const { classes } = this.props;
    return (
      <>
        <div className={classes.root}>
          <Informationbar
            model={this.props.model}
            observer={this.props.localObserver}
          />
        </div>
        <div>
          <Toolbar
            model={this.props.model}
            observer={this.props.localObserver}
            messageHandler={this.showAdvancedSnackbar}
            panel={this}
            enabled={
              !(
                this.props.model.editFeatureId &&
                this.props.model.promptForAttributes
              )
            }
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
