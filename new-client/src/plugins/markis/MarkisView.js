import React from "react";
import { withStyles } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";
import { withSnackbar } from "notistack";
import Typography from "@material-ui/core/Typography";

const styles = theme => ({
  root: {
    display: "flex",
    flexWrap: "wrap"
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120
  },
  selectEmpty: {
    marginTop: theme.spacing(2)
  },
  row: {
    marginBottom: theme.spacing(1)
  }
});

class MarkisView extends React.PureComponent {
  state = {
    isConnected: false,
    test: false,
    mode: "visningsläge",
    contractId: "",
    contractType: "",
    enableCreate: false
  };

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
    this.localObserver.subscribe("toggleView", mode => {
      this.setState({
        mode: mode
      });
    });
    this.localObserver.subscribe("updateContractInformation", information => {
      this.setState({
        contractId: information.objectId,
        contractType: information.objectType
      });
    });
    this.localObserver.subscribe("contractAlreadyExistsError", message => {
      this.showAdvancedSnackbar(message);
    });
    this.localObserver.subscribe("toggleCreateButton", message => {
      this.setState({
        enableCreate: message.enabled
      });
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

  btnCreateGeom = () => {
    console.log("Skapa geometri");
    // We have access to plugin's model:
    //if (!this.model.isConnected) this.model.connectToHub();
    //else this.model.disconnectHub();
  };

  renderInfoText() {
    if (this.state.mode === "editeringsläge") {
      return (
        <Typography>
          Du kan nu skapa en ny geometri kopplad till avtalsnummer:
          <br />
          <b>{this.state.contractId}</b>
        </Typography>
      );
    } else {
      if (this.state.contractId) {
        return (
          <Typography>
            Du visar nu geometrin kopplad till avtalsnummer:
            <br />
            <b>{this.state.contractId}</b>
          </Typography>
        );
      } else {
        return <Typography>Du visar ingen avtalsgeometri just nu.</Typography>;
      }
    }
  }

  render() {
    const { classes } = this.props;
    return (
      <>
        <div className={classes.row}>
          <h3>Du är i {this.state.mode}</h3>
          {this.renderInfoText()}
        </div>
        <Button
          variant="contained"
          disabled={!this.state.enableCreate}
          onClick={this.btnCreateGeom}
        >
          Skapa geometri
        </Button>
      </>
    );
  }
}

MarkisView.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(withSnackbar(MarkisView));
