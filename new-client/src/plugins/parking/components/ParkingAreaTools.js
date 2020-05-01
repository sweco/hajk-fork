import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { withSnackbar } from "notistack";
import Button from "@material-ui/core/Button";
import { Typography, Paper, TextField } from "@material-ui/core";
import AttributeEditor from "./AttributeEditor";

const styles = theme => ({
  buttonWithBottomMargin: {
    marginBottom: theme.spacing(2)
  },
  root: {
    width: "100%",
    display: "inline-block"
  },
  toolPaper: {
    display: "inline-block",
    width: "100%",
    textAlign: "center",
    marginBottom: theme.spacing(2)
  },
  buttonWithSetWidth: {
    marginBottom: theme.spacing(2),
    width: 180
  },
  text: {
    margin: theme.spacing(1)
  },
  textField: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center"
  }
});

class ParkingAreaTools extends React.PureComponent {
  state = {
    activeTool: "",
    drawActivated: false,
    setGeomAttributes: false,
    searchTerm: "",
    featureExists: false
  };

  constructor(props) {
    super(props);
    this.model = this.props.model;
    this.localObserver = this.props.localObserver;
    this.globalObserver = this.props.app.globalObserver;

    this.localObserver.subscribe("feature-added", message => {
      this.setState({
        setGeomAttributes: true
      });
    });

    this.localObserver.subscribe("featureExists", message => {
      this.setState({
        featureExists: true
      });
      if (this.state.activeTool === "editParkingArea") {
        this.model.activateParkingAreaEditing();
      }
    });

    this.localObserver.subscribe("featuresRemoved", message => {
      this.setState({
        featureExists: false
      });
    });

    this.localObserver.subscribe("featuresAdded", message => {
      this.reset();
    });

    this.localObserver.subscribe("areaAlreadyExistsError", message => {
      this.localObserver.publish("messageEvent", {
        message: "Det finns redan ett parkeringsområde med detta ID",
        variant: "error",
        reset: true
      });
      this.reset();
    });
  }

  renderCreateNewParkingArea() {
    const { classes } = this.props;
    if (this.state.setGeomAttributes) {
      return <div className={classes.root}>{this.renderAttributeForm()}</div>;
    }
    if (!this.state.drawActivated) {
      return (
        <div className={classes.root}>
          <Paper elevation={3} className={classes.toolPaper}>
            <Typography className={classes.text}>
              Tryck på knappen nedan för att rita ett område.
            </Typography>
            <Button
              className={classes.buttonWithSetWidth}
              variant="contained"
              onClick={() => this.activateParkingAreaCreation()}
              fullWidth={true}
            >
              Rita i kartan
            </Button>
          </Paper>
        </div>
      );
    } else {
      return (
        <div className={classes.root}>
          <Paper elevation={3} className={classes.toolPaper}>
            <Typography className={classes.text}>
              Du kan nu rita i kartan. Dubbelklicka när du är klar.
            </Typography>
            <Button
              className={classes.buttonWithSetWidth}
              variant="contained"
              onClick={() => this.deActivateParkingAreaCreation()}
              fullWidth={true}
            >
              Avbryt
            </Button>
          </Paper>
        </div>
      );
    }
  }

  renderAttributeForm() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <Paper elevation={3} className={classes.toolPaper}>
          <Typography className={classes.text}>Ange ytans attribut</Typography>
          <div className={classes.textField}>
            <AttributeEditor
              model={this.props.model}
              localObserver={this.props.localObserver}
            />
          </div>
          <div className={classes.root}>
            <Button
              className={classes.text}
              onClick={() => this.model.saveCreatedParkingArea()}
              variant="contained"
            >
              Spara
            </Button>
            <Button
              className={classes.text}
              onClick={() => this.reset()}
              variant="contained"
            >
              Avbryt
            </Button>
          </div>
        </Paper>
      </div>
    );
  }

  renderRemoveParkingArea() {
    const { classes } = this.props;
    if (!this.state.featureExists) {
      return (
        <div className={classes.root}>
          <Paper elevation={3} className={classes.toolPaper}>
            <Typography className={classes.text}>
              Ange ett områdes-id:
            </Typography>
            <div className={classes.textField}>
              <TextField
                className={classes.text}
                size="small"
                id="area-id-input-remove"
                label="Områdes-id"
                variant="outlined"
                onChange={e => {
                  this.setState({ searchTerm: e.target.value });
                }}
              />
              <Button
                className={classes.text}
                onClick={() =>
                  this.model.checkIfGeometryExists(
                    this.state.searchTerm,
                    "overvakningsomraden"
                  )
                }
                variant="contained"
              >
                Sök
              </Button>
            </div>
          </Paper>
        </div>
      );
    } else {
      return (
        <div className={classes.root}>
          <Paper elevation={3} className={classes.toolPaper}>
            <Typography className={classes.text}>
              Vill du radera det markerade området? Alla objekt kopplade till
              området kommer också raderas.
            </Typography>
            <div className={classes.textField}>
              <Button
                className={classes.text}
                onClick={() =>
                  this.model.deleteAllMarkedFeaturesInLayer(
                    this.model.layerNames["overvakningsomraden"]
                  )
                }
                variant="contained"
              >
                Fortsätt
              </Button>
              <Button
                className={classes.text}
                onClick={() => this.reset()}
                variant="contained"
              >
                Avbryt
              </Button>
            </div>
          </Paper>
        </div>
      );
    }
  }

  renderEditParkingArea() {
    const { classes } = this.props;
    if (!this.state.featureExists) {
      return (
        <div className={classes.root}>
          <Paper elevation={3} className={classes.toolPaper}>
            <Typography className={classes.text}>
              Ange ett områdes-id:
            </Typography>
            <div className={classes.textField}>
              <TextField
                className={classes.text}
                size="small"
                id="area-id-input-edit"
                label="Områdes-id"
                variant="outlined"
                onChange={e => {
                  this.setState({ searchTerm: e.target.value });
                }}
              />
              <Button
                className={classes.text}
                onClick={() =>
                  this.model.checkIfGeometryExists(
                    this.state.searchTerm,
                    "overvakningsomraden"
                  )
                }
                variant="contained"
              >
                Sök
              </Button>
            </div>
          </Paper>
        </div>
      );
    } else {
      return (
        <div className={classes.root}>
          <Paper elevation={3} className={classes.toolPaper}>
            <Typography className={classes.text}>
              Redigera området genom att ändra noderna i kartan.
            </Typography>
            <div className={classes.textField}>
              <Button
                className={classes.text}
                onClick={() =>
                  this.model.saveEditedFeatures(
                    this.model.layerNames["overvakningsomraden"]
                  )
                }
                variant="contained"
              >
                Spara
              </Button>
              <Button
                className={classes.text}
                onClick={() => this.reset()}
                variant="contained"
              >
                Avbryt
              </Button>
            </div>
          </Paper>
        </div>
      );
    }
  }

  renderEditParkingAreaAttributes() {
    const { classes } = this.props;
    this.model.activateAttributeEditor(
      this.model.layerNames["overvakningsomraden"]
    );
    if (!this.state.setGeomAttributes) {
      return (
        <div className={classes.root}>
          <Paper elevation={3} className={classes.toolPaper}>
            <Typography className={classes.text}>
              Klicka på ett område för att ändra dess attribut
            </Typography>
          </Paper>
        </div>
      );
    } else {
      return (
        <div className={classes.root}>
          <Paper elevation={3} className={classes.toolPaper}>
            <Typography className={classes.text}>
              Ange ytans attribut
            </Typography>
            <div className={classes.textField}>
              <AttributeEditor
                model={this.props.model}
                localObserver={this.props.localObserver}
              />
            </div>
            <div className={classes.root}>
              <Button
                className={classes.text}
                onClick={() => this.model.saveEditedFeatures()}
                variant="contained"
              >
                Spara
              </Button>
              <Button
                className={classes.text}
                onClick={() => this.reset()}
                variant="contained"
              >
                Avbryt
              </Button>
            </div>
          </Paper>
        </div>
      );
    }
  }

  reset() {
    this.setState({
      drawActivated: false,
      setGeomAttributes: false,
      searchTerm: "",
      featureExists: false
    });
    this.model.reset();
  }

  activateParkingAreaCreation() {
    this.setState({
      drawActivated: true
    });
    this.model.activateParkingAreaCreation();
  }

  deActivateParkingAreaCreation() {
    this.setState({
      drawActivated: false
    });
    this.model.deActivateParkingAreaCreation();
  }

  changeActiveTool(value) {
    this.reset();
    if (this.state.activeTool === value) {
      this.setState({
        activeTool: ""
      });
    } else {
      this.localObserver.publish(
        "activateLayer",
        this.model.layerNames["overvakningsomraden"]
      );
      this.setState({
        activeTool: value
      });
    }
  }

  render() {
    const { classes } = this.props;
    return (
      <>
        <Button
          className={classes.buttonWithBottomMargin}
          variant="contained"
          fullWidth={true}
          value="createNewParkingArea"
          onClick={() => this.changeActiveTool("createNewParkingArea")}
        >
          Skapa nytt område
        </Button>
        {this.state.activeTool === "createNewParkingArea" &&
          this.renderCreateNewParkingArea()}
        <Button
          className={classes.buttonWithBottomMargin}
          variant="contained"
          fullWidth={true}
          value="removeParkingArea"
          onClick={() => this.changeActiveTool("removeParkingArea")}
        >
          Radera område
        </Button>
        {this.state.activeTool === "removeParkingArea" &&
          this.renderRemoveParkingArea()}
        <Button
          className={classes.buttonWithBottomMargin}
          variant="contained"
          fullWidth={true}
          value="editParkingArea"
          onClick={() => this.changeActiveTool("editParkingArea")}
        >
          Redigera geometri
        </Button>
        {this.state.activeTool === "editParkingArea" &&
          this.renderEditParkingArea()}
        <Button
          className={classes.buttonWithBottomMargin}
          variant="contained"
          fullWidth={true}
          value="editParkingAreaAttributes"
          onClick={() => this.changeActiveTool("editParkingAreaAttributes")}
        >
          Ändra attribut
        </Button>
        {this.state.activeTool === "editParkingAreaAttributes" &&
          this.renderEditParkingAreaAttributes()}
      </>
    );
  }
}

export default withStyles(styles)(withSnackbar(ParkingAreaTools));
