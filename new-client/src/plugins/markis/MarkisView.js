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
import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import Grid from "@material-ui/core/Grid";
import EditIcon from "@material-ui/icons/Edit";
import FormatShapesIcon from "@material-ui/icons/FormatShapes";
import TuneIcon from "@material-ui/icons/Tune";
import DeleteIcon from "@material-ui/icons/Delete";
import TimelineIcon from "@material-ui/icons/Timeline";
import TouchAppIcon from "@material-ui/icons/TouchApp";
import Chip from "@material-ui/core/Chip";
import Tooltip from "@material-ui/core/Tooltip";

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
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
    width: "100%"
  },
  createButtons: {
    margin: theme.spacing(1),
    width: 90
  },
  textField: {
    marginLeft: 0,
    marginRight: 0,
    width: "100%"
  },
  styledButtonGroup: {
    margin: theme.spacing(0),
    display: "flex",
    width: "100%"
  },
  styledToggleButton: {
    margin: theme.spacing(0),
    border: "1px solid #575757",
    color: "#575757",
    width: 125
  },
  centerElements: {
    textAlign: "center"
  },
  toolIcons: {
    margin: theme.spacing(0.5)
  },
  chip: {
    marginBottom: theme.spacing(1),
    textAlign: "center"
  }
});

class MarkisView extends React.PureComponent {
  state = {
    isConnected: false,
    inCreation: false,
    formValues: {},
    createMethod: "abort",
    geometryExists: false,
    editFeatureId: undefined,
    allowLine: true,
    allowPolygon: true
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
        userMode: this.model.markisParameters.userMode,
        type: this.model.markisParameters.type,
        objectId: this.model.markisParameters.objectId,
        serialNumber: this.model.markisParameters.objectSerial,
        contractStatus: this.model.markisParameters.objectStatus,
        createdBy: this.model.markisParameters.createdBy,
        inCreation: false
      });
      if (this.state.userMode === "Create") {
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
              label={field.displayName}
              className={classes.textField}
              margin="normal"
              variant="outlined"
              disabled={!this.state.editFeatureId}
              inputProps={{ maxLength: field.maxLength || undefined }}
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
              <FormLabel component="legend">{field.displayName}</FormLabel>
              <NativeSelect
                value={this.state.formValues[field.name]}
                disabled={!this.state.editFeatureId}
                input={<Input name={field.displayName} id={field.name} />}
                onChange={e => {
                  this.checkText(field.name, e.target.value);
                }}
              >
                <option value="">
                  {field.nullDisplayName || "-Välj värde-"}
                </option>
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
            Markera en yta för att redigera dess attribut.
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
      autoHideDuration: 7000,
      persist: false,
      action
    });
  };

  openCreateDialog = () => {
    this.model.setEditLayer(this.props.model.sourceName);
    if (this.state.type === "Contract") {
      this.model.toggleLayerVisibility(
        [this.props.model.estateLayerName],
        true
      );
    }
    this.model.toggleLayerVisibility([this.props.model.sourceName], true);
    this.setState({
      inCreation: true,
      allowLine: this.model.editSource.allowedGeometries.indexOf("Line") > -1,
      allowPolygon:
        this.model.editSource.allowedGeometries.indexOf("Polygon") > -1
    });
  };

  abortCreation = () => {
    this.reset();
    this.model.toggleLayerVisibility([this.props.model.estateLayerName], false);
    this.model.toggleLayerVisibility([this.props.model.sourceName], false);
  };

  saveCreated = () => {
    if (this.state.type !== "Contract") {
      if (!this.model.validateTradeGeometries()) {
        this.showAdvancedSnackbar(
          "Du måste ange diarienummer och fastighetsnummer innan du sparar!",
          "error"
        );
        return;
      }
    }
    this.model.invokeCompleteMessage();
    this.model.save(r => {
      if (r && r.TransactionResponse.TransactionSummary) {
        if (
          Number(
            r.TransactionResponse.TransactionSummary.totalInserted.toString()
          ) > 0
        ) {
          this.showAdvancedSnackbar(
            "Geometrin skapades utan problem!",
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
            "Geometrin uppdaterades utan problem!",
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
            "Geometrin togs bort utan problem.",
            "success"
          );
          this.model.refreshLayer(this.props.model.sourceName);
          this.reset();
        } else {
          this.showAdvancedSnackbar(
            "Geometrin gick inte att spara. Försök igen senare."
          );
          this.reset();
        }
      } else {
        this.showAdvancedSnackbar(
          "Geometrin gick inte att spara. Fösök igen senare."
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
      objectId: undefined,
      serialNumber: undefined,
      createdBy: undefined,
      allowLine: true,
      allowPolygon: true
    });
  }

  renderInfoChip() {
    if (
      this.state.userMode === "Create" &&
      this.state.type === "Contract" &&
      this.state.inCreation
    ) {
      return (
        <Chip
          label={`Uppdaterar ${this.state.objectId}`}
          color="primary"
          variant="outlined"
        />
      );
    } else if (
      this.state.userMode === "Create" &&
      (this.state.type === "Purchase" || this.state.type === "Sale") &&
      this.state.inCreation
    ) {
      return (
        <Chip
          label={`Skapar ${this.model.displayConnections[
            this.state.type
          ].toLowerCase()}`}
          color="primary"
          variant="outlined"
        />
      );
    } else if (this.state.userMode === "Show" && this.state.objectId) {
      return (
        <Typography>
          Du visar nu{" "}
          {this.model.displayConnections[this.state.type].toLowerCase()}{" "}
          kopplade till:
          <br />
          <b>{this.state.objectId}</b>
        </Typography>
      );
    } else {
      return <Typography>Du visar ingen yta just nu.</Typography>;
    }
  }

  clearSearchResult = () => {
    this.model.clearSearchResult();
    this.setState({
      objectId: undefined
    });
  };

  handleChange = name => event => {
    if (this.state[name] === event.currentTarget.value) {
      this.setState({ [name]: undefined });
      this.props.model.setCreateMethod("abort");
    } else {
      this.setState({ [name]: event.currentTarget.value });
      this.props.model.setCreateMethod(event.currentTarget.value);
    }
  };

  acceptAttributes = () => {
    this.setState({
      editFeatureId: undefined
    });
    this.model.resetEditFeatureId();
  };

  renderBtns() {
    const { classes } = this.props;

    const btnAbort = (
      <Tooltip title="Avbryt pågående arbete.">
        <span>
          <Button
            variant="contained"
            className={classes.createButtons}
            onClick={this.abortCreation}
          >
            Återgå
          </Button>
        </span>
      </Tooltip>
    );

    const btnSave = (
      <Tooltip title="Spara och stäng.">
        <span>
          <Button
            variant="contained"
            color="primary"
            className={classes.createButtons}
            onClick={this.saveCreated}
            disabled={!this.state.geometryExists}
          >
            Spara
          </Button>
        </span>
      </Tooltip>
    );

    const btnRemoveResult = (
      <Tooltip title="Rensa bort sökresultat från kartan.">
        <span>
          <Button
            variant="contained"
            className={classes.createButtons}
            onClick={this.clearSearchResult}
            disabled={!this.state.objectId}
          >
            Rensa
          </Button>
        </span>
      </Tooltip>
    );

    const btnAcceptAttributes = (
      <Button
        variant="contained"
        className={classes.createButtons}
        onClick={this.acceptAttributes}
      >
        Ok
      </Button>
    );

    const buttonGroup = (
      <Grid container spacing={1} direction="column" alignItems="center">
        <Grid item>
          <ToggleButtonGroup
            variant="contained"
            className={classes.styledButtonGroup}
            size="medium"
            exclusive
            onChange={this.handleChange("createMethod")}
            value={this.state.createMethod}
          >
            <ToggleButton
              className={classes.styledToggleButton}
              key={1}
              value="add"
              disabled={!this.state.allowPolygon}
              title="Skapa en ny yta."
            >
              <FormatShapesIcon className={classes.toolIcons} />
              SKAPA YTA
            </ToggleButton>
            <ToggleButton
              className={classes.styledToggleButton}
              disabled={!this.state.allowLine}
              key={2}
              value="addLine"
              title="Skapa en ny linje."
            >
              <TimelineIcon fontSize="large" className={classes.toolIcons} />
              SKAPA LINJE
            </ToggleButton>
          </ToggleButtonGroup>
        </Grid>
        <Grid item>
          <ToggleButtonGroup
            variant="contained"
            className={classes.styledButtonGroup}
            exclusive
            onChange={this.handleChange("createMethod")}
            size="medium"
            value={this.state.createMethod}
          >
            <ToggleButton
              className={classes.styledToggleButton}
              key={3}
              value="addEstate"
              title="Välj en yta i kartan att utgå från."
              disabled={!this.state.allowPolygon}
            >
              <TouchAppIcon className={classes.toolIcons} />
              VÄLJ YTA
            </ToggleButton>
            <ToggleButton
              className={classes.styledToggleButton}
              key={4}
              value="edit"
              title="Redigera en yta genom att dra i kartan."
            >
              <EditIcon className={classes.toolIcons} />
              REDIGERA
            </ToggleButton>
          </ToggleButtonGroup>
        </Grid>
        <Grid item>
          <ToggleButtonGroup
            variant="contained"
            className={classes.styledButtonGroup}
            exclusive
            onChange={this.handleChange("createMethod")}
            size="medium"
            value={this.state.createMethod}
          >
            <ToggleButton
              className={classes.styledToggleButton}
              key={5}
              value="remove"
              title="Ta bort ett objekt genom att markera det i kartan."
            >
              <DeleteIcon className={classes.toolIcons} />
              RADERA
            </ToggleButton>
            <ToggleButton
              className={classes.styledToggleButton}
              key={6}
              value="editAttributes"
              title="Ändra ytans attribut genom att markera den i kartan."
            >
              <TuneIcon className={classes.toolIcons} />
              ÄNDRA ATTRIBUT
            </ToggleButton>
          </ToggleButtonGroup>
        </Grid>
      </Grid>
    );

    if (
      this.state.userMode === "Create" &&
      this.state.inCreation &&
      !this.state.editFeatureId
    ) {
      return (
        <div>
          <div>{buttonGroup}</div>
          <div className={classes.centerElements}>
            {btnAbort}
            {btnSave}
          </div>
        </div>
      );
    } else if (
      this.state.userMode === "Create" &&
      this.state.inCreation &&
      this.state.editFeatureId
    ) {
      return (
        <div>
          <div className={classes.text}>
            <Typography>
              <b>Ange ytans attribut nedan: </b>{" "}
            </Typography>
          </div>
          <div>{this.createForm()}</div>
          <div>{btnAcceptAttributes}</div>
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
        <div className={classes.chip}>{this.renderInfoChip()}</div>
        {this.renderBtns()}
      </>
    );
  }
}

MarkisView.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(withSnackbar(MarkisView));
