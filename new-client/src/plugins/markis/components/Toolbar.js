import React from "react";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import Grid from "@material-ui/core/Grid";
import EditIcon from "@material-ui/icons/Edit";
import FormatShapesIcon from "@material-ui/icons/FormatShapes";
import TuneIcon from "@material-ui/icons/Tune";
import DeleteIcon from "@material-ui/icons/Delete";
import TimelineIcon from "@material-ui/icons/Timeline";
import TouchAppIcon from "@material-ui/icons/TouchApp";
import Tooltip from "@material-ui/core/Tooltip";
import Button from "@material-ui/core/Button";
import { withStyles } from "@material-ui/core/styles";

const styles = theme => ({
  container: {
    display: "flex",
    flexWrap: "wrap"
  },
  text: {
    marginLeft: theme.spacing(1),
    display: "flex",
    flexWrap: "wrap"
  },
  createButtons: {
    margin: theme.spacing(1),
    width: 90
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
  }
});

class Toolbar extends React.Component {
  state = {
    createMethod: "abort",
    geometryExists: false,
    editFeatureId: undefined,
    allowLine: true,
    allowPolygon: true,
    promptForAttributes: false,
    featureModified: false,
    editingExisting: false
  };

  constructor(props) {
    super(props);

    props.observer.subscribe("updateMarkisView", message => {
      if (props.model.markisParameters) {
        this.setState({
          userMode: props.model.markisParameters.userMode,
          type: props.model.markisParameters.type
        });
      }
    });

    props.observer.subscribe("featureUpdate", vectorSource => {
      this.setState({
        geometryExists: props.model.geometriesExist,
        editFeatureId: props.model.editFeatureId,
        featureModified: props.model.featureModified,
        editingExisting: props.model.editingExisting,
        allowLine:
          props.model.editSource.allowedGeometries.indexOf("Line") > -1,
        allowPolygon:
          props.model.editSource.allowedGeometries.indexOf("Polygon") > -1,
        promptForAttributes: props.model.promptForAttributes
      });
    });
  }

  abortCreation = () => {
    this.props.panel.reset();
  };

  saveCreated = () => {
    const { model } = this.props;
    if (model.markisParameters.type !== "Contract") {
      if (!model.validateTradeGeometries()) {
        this.props.messageHandler(
          "Du måste ange diarienummer och fastighetsnummer innan du sparar!",
          "error"
        );
        return;
      }
    }
    model.invokeCompleteMessage();
    model.save(r => {
      if (r && r.TransactionResponse.TransactionSummary) {
        if (
          Number(
            r.TransactionResponse.TransactionSummary.totalInserted.toString()
          ) > 0
        ) {
          this.props.messageHandler(
            "Geometrin skapades utan problem!",
            "success"
          );
          model.refreshLayer(model.sourceName);
          this.props.panel.reset();
        } else if (
          Number(
            r.TransactionResponse.TransactionSummary.totalUpdated.toString()
          ) > 0
        ) {
          this.props.messageHandler(
            "Geometrin uppdaterades utan problem!",
            "success"
          );
          model.refreshLayer(model.sourceName);
          this.props.panel.reset();
        } else if (
          Number(
            r.TransactionResponse.TransactionSummary.totalDeleted.toString()
          ) > 0
        ) {
          this.props.messageHandler(
            "Geometrin togs bort utan problem.",
            "success"
          );
          model.refreshLayer(model.sourceName);
          this.props.panel.reset();
        } else {
          this.props.messageHandler(
            "Geometrin gick inte att spara. Försök igen senare."
          );
          this.props.panel.reset();
        }
      } else {
        this.props.messageHandler(
          "Geometrin gick inte att spara. Fösök igen senare."
        );
        this.props.panel.reset();
      }
    });
  };

  clearSearchResult = () => {
    this.props.model.clearSearchResult();
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

  renderButtons() {
    const { classes, model } = this.props;
    const editTools = (
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
              disabled={!this.state.geometryExists}
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
              disabled={!this.state.geometryExists}
              value="remove"
              title="Ta bort ett objekt genom att markera det i kartan."
            >
              <DeleteIcon className={classes.toolIcons} />
              RADERA
            </ToggleButton>
            <ToggleButton
              className={classes.styledToggleButton}
              disabled={
                !model.promptForAttributes || !this.state.geometryExists
              }
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

    const btnSave = (
      <Tooltip title="Spara och stäng.">
        <span>
          <Button
            variant="contained"
            color="primary"
            className={classes.createButtons}
            onClick={this.saveCreated}
            disabled={
              !(this.state.geometryExists && !this.state.editingExisting) &&
              !(this.state.featureModified && this.state.editingExisting)
            }
          >
            Spara
          </Button>
        </span>
      </Tooltip>
    );

    const btnAbort = (
      <Tooltip title="Avbryt pågående arbete.">
        <span>
          <Button
            variant="contained"
            className={classes.createButtons}
            onClick={this.abortCreation}
          >
            Avbryt
          </Button>
        </span>
      </Tooltip>
    );

    const btnRemoveSearchResult = (
      <Tooltip title="Rensa bort sökresultat från kartan.">
        <span>
          <Button
            variant="contained"
            className={classes.createButtons}
            onClick={this.clearSearchResult}
            disabled={!model.markisParameters.objectId}
          >
            Rensa
          </Button>
        </span>
      </Tooltip>
    );

    if (this.props.enabled) {
      if (model.markisParameters.userMode === "Create") {
        return (
          <div>
            <div>{editTools}</div>
            <div className={classes.centerElements}>
              {btnAbort}
              {btnSave}
            </div>
          </div>
        );
      } else {
        return <div>{btnRemoveSearchResult}</div>;
      }
    } else {
      return null;
    }
  }

  render() {
    return this.renderButtons();
  }
}

export default withStyles(styles)(Toolbar);
