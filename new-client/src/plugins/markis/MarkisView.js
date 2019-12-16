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
  text: {
    marginLeft: theme.spacing(1),
    display: "flex",
    flexWrap: "wrap"
  },
  listCreateChoices: {
    margin: theme.spacing(1),
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
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
    mode: "visningsläge",
    inCreation: false,
    formValues: {},
    createMethod: "abort",
    geometryExists: false,
    editFeatureId: undefined
  };

  constructor(props) {
    super(props);
    this.model = this.props.model;
    this.localObserver = this.props.localObserver;
    this.globalObserver = this.props.app.globalObserver;

    this.localObserver.subscribe("markisErrorEvent", message => {
      this.showAdvancedSnackbar(message.message, message.variant);
      if (message.reset) {
        this.reset();
      }
    });
    this.localObserver.subscribe("markisSearchComplete", message => {
      this.props.enqueueSnackbar(message);
    });
    this.localObserver.subscribe("featureUpdate", vectorSource => {
      this.setState({
        geometryExists: vectorSource.getFeatures().length > 0 || false,
        editFeatureId: this.model.editFeatureId || undefined,
        formValues: this.initiateFormValues() || {}
      });
    });
    this.localObserver.subscribe("updateMarkisView", message => {
      this.setState({
        mode: this.model.markisParameters.mode,
        contractId: this.model.markisParameters.objectId,
        serialNumber: this.model.markisParameters.objectSerial,
        contractStatus: this.model.markisParameters.objectStatus,
        createdBy: this.model.markisParameters.createdBy,
        inCreation: false
      });
      if (this.state.mode === "editeringsläge") {
        this.openCreateDialog();
      }
    });
  }

  initiateFormValues() {
    var formValues = {};
    var editableFields = this.model.editSource.editableFields;
    if (this.model.editFeatureId) {
      var editFeature = this.model.vectorSource.getFeatureById(
        this.model.editFeatureId
      );
      for (var i = 0; i < editableFields.length; i++) {
        formValues[editableFields[i].name] =
          editFeature.get(editableFields[i].name) || "";
      }
    }

    return formValues;
  }

  checkText(name, value) {
    var formValues = this.state.formValues;
    formValues[name] = value;
    this.setState({
      formValues: formValues
    });
    this.forceUpdate();
    this.updateFeature(
      this.model.vectorSource.getFeatureById(this.model.editFeatureId)
    );
  }

  updateFeature(feature) {
    var props = feature.getProperties();
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
    feature.setProperties(props);
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
              disabled={!this.state.editFeatureId}
              value={this.state.formValues[field.name]}
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
                value={this.state.formValues[field.name]}
                disabled={!this.state.editFeatureId}
                input={<Input name={field.name} id={field.name} />}
                onChange={e => {
                  this.checkText(field.name, e.target.value);
                }}
              >
                <option value="">-Välj värde-</option>
                {options}
              </NativeSelect>
            </FormControl>
          </div>
        );

      case null:
        return <span>{this.state.formValues[field.name]}</span>;
      default:
        return <span>{this.state.formValues[field.name]}</span>;
    }
  }

  createForm() {
    const { classes } = this.props;
    if (this.model.editFeatureId >= 0) {
      var markup = this.model.editSource.editableFields.map((field, i) => {
        var valueMarkup = this.getValueMarkup(field);
        return (
          <div key={i} ref={field.name}>
            {valueMarkup}
          </div>
        );
      });
      return <div>{markup}</div>;
    } else if (this.state.createMethod === "editAttributes") {
      return (
        <div className={classes.text}>
          <Typography>
            Markera en avtalsyta för att redigera attribut.
          </Typography>
        </div>
      );
    }
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
      persist: true,
      action
    });
  };

  openCreateDialog = () => {
    this.model.setEditLayer(this.props.model.sourceName);
    this.model.toggleLayer(this.props.model.sourceName, true);
    this.model.toggleLayer(this.props.model.estateLayerName, true);
    this.setState({
      inCreation: true
    });
  };

  abortCreation = () => {
    this.reset();
    this.model.toggleLayer(this.props.model.estateLayerName, false);
    this.model.toggleLayer(this.props.model.sourceName, false);
  };

  saveCreated = () => {
    this.model.save(r => {
      if (r && r.TransactionResponse.TransactionSummary) {
        if (
          Number(
            r.TransactionResponse.TransactionSummary.totalInserted.toString()
          ) > 0
        ) {
          this.showAdvancedSnackbar(
            "Avtalsgeometrin skapades utan problem!",
            "success"
          );
          this.model.refreshLayer(this.props.model.sourceName);
          this.reset();
        } else if (
          Number(
            r.TransactionResponse.TransactionSummary.totalUpdated.toString()
          ) > 0
        ) {
          this.showAdvancedSnackbar(
            "Avtalsgeometrin uppdaterades utan problem!",
            "success"
          );
          this.model.refreshLayer(this.props.model.sourceName);
          this.reset();
        } else if (
          Number(
            r.TransactionResponse.TransactionSummary.totalDeleted.toString()
          ) > 0
        ) {
          this.showAdvancedSnackbar(
            "Avtalsgeometrin togs bort utan problem.",
            "success"
          );
          this.model.refreshLayer(this.props.model.sourceName);
          this.reset();
        } else {
          this.showAdvancedSnackbar(
            "Avtalsgeometrin gick inte att spara. Fösök igen senare."
          );
          this.reset();
        }
      } else {
        this.showAdvancedSnackbar(
          "Avtalsgeometrin gick inte att spara. Fösök igen senare."
        );
        this.reset();
      }
    });
  };

  reset() {
    this.model.removeInteraction();
    this.model.vectorSource.clear();
    this.setState({
      inCreation: false,
      geometryExists: false,
      createMethod: "abort",
      formValues: {},
      mode: "visningsläge",
      contractId: undefined,
      serialNumber: undefined,
      createdBy: undefined
    });
  }

  renderInfoText() {
    if (this.state.mode === "editeringsläge") {
      return (
        <Typography>
          Du kan nu uppdatera avtalsytan för avtalsnummer:
          <br />
          <b>{this.state.contractId}</b>
          <br />
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

  handleChange = name => event => {
    this.setState({ [name]: event.target.value });
    this.props.model.setCreateMethod(event.target.value);
  };

  renderBtns() {
    const { classes } = this.props;

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
        disabled={!this.state.contractId}
      >
        Rensa
      </Button>
    );

    const listCreateChoices = (
      <FormControl className={classes.listCreateChoices}>
        <FormLabel component="legend">Välj verktyg</FormLabel>
        <NativeSelect
          value={this.state.createMethod}
          onChange={this.handleChange("createMethod")}
          input={<Input name="createMethod" id="createMethod-native-helper" />}
        >
          <option value="abort">Inget aktivt verktyg</option>
          <option value="add">Lägg till yta</option>
          <option value="addLine">Lägg till linje</option>
          <option value="addEstate">Välj fastighet</option>
          <option value="remove">Ta bort objekt</option>
          <option value="edit">Editera objekt</option>
          <option value="editAttributes">Sätt attribut</option>
        </NativeSelect>
      </FormControl>
    );

    if (this.state.mode === "editeringsläge" && this.state.inCreation) {
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
    } else {
      return <div>{btnRemoveResult}</div>;
    }
  }

  render() {
    const { classes } = this.props;
    return (
      <>
        <div className={classes.text}>{this.renderInfoText()}</div>
        {this.renderBtns()}
      </>
    );
  }
}

MarkisView.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(withSnackbar(MarkisView));
