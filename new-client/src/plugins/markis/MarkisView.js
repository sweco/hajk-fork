import React from "react";
import { withStyles } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";
import { withSnackbar } from "notistack";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";

const styles = theme => ({
  container: {
    display: "flex",
    flexWrap: "wrap"
  },
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
  },
  createButtons: {
    margin: theme.spacing(1)
  },
  textField: {
    marginLeft: 0,
    marginRight: 0,
    width: "100%"
  }
});

class MarkisView extends React.PureComponent {
  state = {
    isConnected: false,
    test: false,
    mode: "visningsläge",
    contractId: "",
    createdBy: "",
    enableCreate: false,
    inCreation: false,
    formValues: {}
  };

  constructor(props) {
    super(props);
    this.model = this.props.model;
    this.searchModel = this.model.SearchModel;

    this.localObserver = this.props.localObserver;
    this.globalObserver = this.props.app.globalObserver;

    this.localObserver.subscribe("markisErrorEvent", message => {
      this.showAdvancedSnackbar(message);
      this.reset();
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
        createdBy: information.createdBy
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
    this.localObserver.subscribe("editFeature", attr => {
      this.setState({
        editFeature: this.props.model.editFeature,
        editSource: this.props.model.editSource
      });
    });
  }

  checkText(name, value) {
    var formValues = Object.assign({}, this.state.formValues);
    formValues[name] = value;
    this.setState({
      formValues: formValues
    });
  }

  updateFeature() {
    var props = this.props.model.editFeature.getProperties();
    Object.keys(this.state.formValues).forEach(key => {
      var value = this.state.formValues[key];
      if (value === "") value = null;
      if (Array.isArray(value)) {
        value = value
          .filter(v => v.checked)
          .map(v => v.name)
          .join(";");
      }
      props[key] = value;
    });
    this.props.model.editFeature.setProperties(props);
  }

  getValueMarkup(field) {
    const { classes } = this.props;
    if (field.dataType === "int") {
      field.textType = "heltal";
    }

    if (field.dataType === "number") {
      field.textType = "nummer";
    }

    if (field.dataType === "date") {
      field.textType = "datum";
    }

    var value = this.state.formValues[field.name];
    if (value === undefined || value === null) {
      value = "";
    }

    if (value === "" && field.initialRender) {
      if (field.defaultValue !== null) {
        value = field.defaultValue;
      }
    }
    return (
      <>
        <TextField
          id={field.id}
          label={field.name}
          className={classes.textField}
          margin="normal"
          variant="outlined"
          disabled={!this.props.model.geomCreated}
          value={value}
          onChange={e => {
            this.checkText(field.name, e.target.value);
          }}
        />
      </>
    );
  }
  createForm() {
    var markup = this.model.editSource.editableFields.map((field, i) => {
      var valueMarkup = this.getValueMarkup(field);
      return (
        <div key={i} ref={field.name}>
          {valueMarkup}
        </div>
      );
    });
    return <div>{markup}</div>;
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

  openCreateDialog = () => {
    this.setState({
      inCreation: true
    });
    this.model.setEditLayer(this.props.model.sourceName);
    this.model.activateAdd();
  };

  abortCreation = () => {
    this.setState({
      inCreation: false
    });
    this.model.deActivateAdd();
  };

  saveCreated = () => {
    this.updateFeature();
    this.model.save();
    this.props.enqueueSnackbar("Avtalsgeometrin skapades utan problem!");
    this.model.deActivateAdd();
    this.reset();
  };

  reset() {
    this.setState({
      inCreation: false,
      mode: "visningsläge",
      contractId: "",
      createdBy: "",
      enableCreate: false,
      formValues: {}
    });
  }

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

  clearSearchResult = () => {
    this.model.clearSearchResult();
    this.setState({
      contractId: undefined
    });
  };

  renderBtns() {
    const { classes } = this.props;
    const enableCreateBtn = (
      <Button
        variant="contained"
        className={classes.createButtons}
        disabled={!this.state.enableCreate}
        onClick={this.openCreateDialog}
      >
        Skapa geometri
      </Button>
    );

    const btnAbort = (
      <Button
        variant="contained"
        className={classes.createButtons}
        onClick={this.abortCreation}
      >
        Avbryt
      </Button>
    );

    const btnSave = (
      <Button
        variant="contained"
        className={classes.createButtons}
        onClick={this.saveCreated}
      >
        Spara
      </Button>
    );

    const btnRemoveResult = (
      <Button
        variant="contained"
        className={classes.createButtons}
        onClick={this.clearSearchResult}
      >
        Rensa resultat
      </Button>
    );

    if (this.state.mode === "editeringsläge") {
      if (!this.state.inCreation) {
        return <div>{enableCreateBtn}</div>;
      } else {
        return (
          <div>
            {this.createForm()}
            {btnAbort}
            {btnSave}
          </div>
        );
      }
    } else {
      return <div>{btnRemoveResult}</div>;
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
        {this.renderBtns()}
      </>
    );
  }
}

MarkisView.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(withSnackbar(MarkisView));
