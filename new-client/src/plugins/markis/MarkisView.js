import React from "react";
import { withStyles } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";
import { withSnackbar } from "notistack";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";
import FormControl from "@material-ui/core/FormControl";
import NativeSelect from "@material-ui/core/NativeSelect";
import FormLabel from "@material-ui/core/FormLabel";
import InputLabel from "@material-ui/core/InputLabel";
import Input from "@material-ui/core/Input";

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
    margin: theme.spacing(1),
    width: 90
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
    formValues: {},
    createMethod: "abort",
    geometryExists: false
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
    this.localObserver.subscribe("featureUpdate", vectorSource => {
      this.setState({
        geometryExists: vectorSource.getFeatures().length > 0 || false
      });

      console.log("geometryexists: ", this.state.geometryExists);
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
      this.model.setFeatureProperties();
      if (this.state.editFeature.getProperties().fastighet) {
        this.checkText(
          "akt_id",
          this.state.editFeature.getProperties().fastighet
        );
      }
    });
  }

  checkText(name, value) {
    var formValues = Object.assign({}, this.state.formValues);
    formValues[name] = value;
    this.setState({
      formValues: formValues
    });
  }

  checkSelect(name, value) {
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

    switch (field.textType) {
      case "fritext":
        return (
          <>
            <TextField
              id={field.id}
              label={field.name}
              className={classes.textField}
              margin="normal"
              variant="outlined"
              disabled={!this.state.geometryExists}
              value={value}
              onChange={e => {
                this.checkText(field.name, e.target.value);
              }}
            />
          </>
        );
      case "lista":
        let options = null;
        if (Array.isArray(field.values)) {
          options = field.values.map((val, i) => (
            <option key={i} value={val}>
              {val}
            </option>
          ));
        }
        return (
          <div className={classes.root}>
            <FormControl component="fieldset" className={classes.formControl}>
              <FormLabel component="legend">{field.name}</FormLabel>
              <NativeSelect
                value={value}
                disabled={!this.state.geometryExists}
                input={<Input name={field.name} id={field.name} />}
                onChange={e => {
                  this.checkSelect(field.name, e.target.value);
                }}
              >
                <option value="">-Välj värde-</option>
                {options}
              </NativeSelect>
            </FormControl>
          </div>
        );

      case null:
        return <span>{value}</span>;
      default:
        return <span>{value}</span>;
    }
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
    this.model.toggleLayer(this.props.model.sourceName, true);
  };

  abortCreation = () => {
    this.setState({
      inCreation: false,
      createMethod: "abort",
      formValues: {}
    });
    this.model.removeInteraction();
    this.model.vectorSource.clear();
    this.model.toggleLayer(this.props.model.estateLayerName, false);
    this.model.toggleLayer(this.props.model.sourceName, false);
  };

  saveCreated = () => {
    this.model.createEditFeature();
    this.updateFeature();
    this.model.save(r => {
      console.log("done", r);
      if (
        r &&
        r.TransactionResponse &&
        r.TransactionResponse.TransactionSummary &&
        r.TransactionResponse.TransactionSummary.totalInserted &&
        Number(
          r.TransactionResponse.TransactionSummary.totalInserted.toString()
        ) > 0
      ) {
        this.props.enqueueSnackbar("Avtalsgeometrin skapades utan problem!");
        this.model.toggleLayer(this.props.model.estateLayerName, false);
        this.model.refreshLayer(this.props.model.sourceName);
        this.reset();
      } else {
        this.showAdvancedSnackbar(
          "Avtalsgeometrin gick inte att spara. Fösök igen senare."
        );
        this.model.toggleLayer(this.props.model.estateLayerName, false);
        this.model.refreshLayer(this.props.model.sourceName);
        this.reset();
      }
    });
  };

  reset() {
    this.model.removeInteraction();
    this.model.vectorSource.clear();
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
    if (this.state.mode === "editeringsläge" && !this.state.inCreation) {
      return (
        <Typography>
          Du kan nu skapa en ny geometri kopplad till avtalsnummer:
          <br />
          <b>{this.state.contractId}</b>
          <br />
          <br />
          Du kan antingen skapa en geometri på frihand, eller utifrån en
          fastighet.
        </Typography>
      );
    } else if (this.state.mode === "editeringsläge" && this.state.inCreation) {
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
            Du visar nu ytor kopplade till avtalsnummer:
            <br />
            <b>{this.state.contractId}</b>
          </Typography>
        );
      } else {
        return <Typography>Du visar ingen avtalsyta just nu.</Typography>;
      }
    }
  }

  clearSearchResult = () => {
    this.model.clearSearchResult();
    this.setState({
      contractId: undefined
    });
  };

  createFromEstate = () => {
    this.setState({
      inCreation: true
    });
    this.model.setEditLayer(this.props.model.sourceName);
    this.model.toggleLayer(this.model.estateLayerName, true);
    //this.model.activateEstateSelection();
  };

  handleChange = name => event => {
    this.setState({ [name]: event.target.value });
    this.props.model.setCreateMethod(event.target.value);
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
        Rita geometri
      </Button>
    );

    const createFromEstateBtn = (
      <Button
        variant="contained"
        className={classes.createButtons}
        disabled={!this.state.enableCreate}
        onClick={this.createFromEstate}
      >
        Välj fastighet
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
        disabled={!this.state.geometryExists}
      >
        Skapa
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

    const listCreateChoices = (
      <FormControl className={classes.formControl}>
        <InputLabel htmlFor="createMethod-native-helper">Aktivitet</InputLabel>
        <NativeSelect
          value={this.state.createMethod}
          onChange={this.handleChange("createMethod")}
          input={<Input name="createMethod" id="createMethod-native-helper" />}
        >
          <option value="abort">Ingen</option>
          <option value="add">Lägg till objekt</option>
          <option value="addEstate">Välj fastighet</option>
          <option value="remove">Ta bort objekt</option>
          <option value="edit">Editera objekt</option>
        </NativeSelect>
      </FormControl>
    );

    if (this.state.mode === "editeringsläge") {
      if (!this.state.inCreation) {
        return (
          <div>
            {enableCreateBtn}
            {createFromEstateBtn}
          </div>
        );
      } else {
        return (
          <div>
            <div>{listCreateChoices}</div>
            <div>{this.createForm()}</div>
            <div>
              {btnAbort}
              {btnSave}
            </div>
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
