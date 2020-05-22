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

class SignPackageTools extends React.PureComponent {
  state = {
    activeTool: "",
    drawActivated: false,
    setGeomAttributes: false,
    searchTerm: "",
    featureExists: false,
    signPackagesSaved: false,
    moveFeatureExists: false
  };

  constructor(props) {
    super(props);
    this.model = this.props.model;
    this.localObserver = this.props.localObserver;
    this.globalObserver = this.props.app.globalObserver;
  }

  componentDidMount() {
    this.localObserver.subscribe("sign-packages-added", message => {
      this.setState({
        setGeomAttributes: true
      });
    });

    this.localObserver.subscribe("sign-packages-saved", message => {
      this.setState({
        signPackagesSaved: true,
        setGeomAttributes: false
      });
    });

    this.localObserver.subscribe("sign-package-labels-saved", message => {
      this.reset();
    });

    this.localObserver.subscribe("move-feature-added", message => {
      this.setState({
        moveFeatureExists: true
      });
    });
  }

  componentWillUnmount() {
    this.localObserver.unsubscribe("sign-packages-added");
    this.localObserver.unsubscribe("sign-packages-saved");
    this.localObserver.unsubscribe("sign-package-labels-saved");
    this.localObserver.unsubscribe("move-feature-added");
    this.reset();
  }

  renderCreateNewSignPackage() {
    const { classes } = this.props;
    if (this.state.setGeomAttributes) {
      return <div className={classes.root}>{this.renderAttributeForm()}</div>;
    }
    if (this.state.signPackagesSaved) {
      return (
        <div className={classes.root}>
          <Paper elevation={3} className={classes.toolPaper}>
            <Typography className={classes.text}>
              Vill du koppla etiketter till skyltpaketen?
            </Typography>
            <div className={classes.root}>
              <Button
                className={classes.text}
                variant="contained"
                onClick={() => this.model.createSignPackageLabel()}
              >
                JA
              </Button>
              <Button
                className={classes.text}
                variant="contained"
                onClick={() => this.reset()}
              >
                NEJ
              </Button>
            </div>
          </Paper>
        </div>
      );
    }
    if (!this.state.drawActivated) {
      return (
        <div className={classes.root}>
          <Paper elevation={3} className={classes.toolPaper}>
            <Typography className={classes.text}>
              Tryck på knappen nedan för att skapa ett nytt skyltpaket
            </Typography>
            <Button
              className={classes.buttonWithSetWidth}
              variant="contained"
              onClick={() => this.activateSignPackageCreation()}
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
              Du kan nu placera ut skyltpaket i kartan. Tryck på OK när du är
              klar.
            </Typography>
            <div className={classes.root}>
              <Button
                className={classes.text}
                variant="contained"
                onClick={() => this.acceptSignPackages()}
              >
                OK
              </Button>
              <Button
                className={classes.text}
                variant="contained"
                onClick={() => this.reset()}
              >
                Avbryt
              </Button>
            </div>
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
          <Typography className={classes.text}>
            Ange område som skyltpaketen ska kopplas till:
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
              onClick={() => this.model.saveCreatedSignPackages()}
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

  renderShowLines() {
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

  renderMoveSignPackage() {
    const { classes } = this.props;
    this.model.activateMoveSignPackage();
    if (!this.state.moveFeatureExists) {
      return (
        <div className={classes.root}>
          <Paper elevation={3} className={classes.toolPaper}>
            <Typography className={classes.text}>
              Tryck på det skyltpaket som du vill flytta.
            </Typography>
          </Paper>
        </div>
      );
    } else {
      return (
        <div className={classes.root}>
          <Paper elevation={3} className={classes.toolPaper}>
            <Typography className={classes.text}>
              Dra skyltpaketet dit du vill ha det och klicka sedan på spara.
            </Typography>
            <div className={classes.textField}>
              <Button
                className={classes.text}
                onClick={() =>
                  this.model.saveEditedFeatures(
                    this.model.layerNames["skyltpaket"]
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

  renderMoveSignPackageLabels() {
    const { classes } = this.props;
    this.model.activateMoveSignPackageLabels();
    if (!this.state.moveFeatureExists) {
      return (
        <div className={classes.root}>
          <Paper elevation={3} className={classes.toolPaper}>
            <Typography className={classes.text}>
              Tryck på det skyltpaket som du vill flytta.
            </Typography>
          </Paper>
        </div>
      );
    } else {
      return (
        <div className={classes.root}>
          <Paper elevation={3} className={classes.toolPaper}>
            <Typography className={classes.text}>
              Dra skyltpaketet dit du vill ha det och klicka sedan på spara.
            </Typography>
            <div className={classes.textField}>
              <Button
                className={classes.text}
                onClick={() =>
                  this.model.saveEditedFeatures(
                    this.model.layerNames["skyltpaket_etiketter"]
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

  reset() {
    this.setState({
      drawActivated: false,
      setGeomAttributes: false,
      searchTerm: "",
      featureExists: false,
      signPackagesSaved: false,
      moveFeatureExists: false
    });
    this.model.reset();
  }

  activateSignPackageCreation() {
    this.setState({
      drawActivated: true
    });
    this.model.activateSignPackageCreation();
  }

  acceptSignPackages() {
    this.setState({
      drawActivated: false
    });
    this.model.acceptSignPackages();
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
      this.localObserver.publish(
        "activateLayer",
        this.model.layerNames["skyltpaket"]
      );
      this.localObserver.publish(
        "activateLayer",
        this.model.layerNames["skyltpaket_etiketter"]
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
          Skapa nytt skyltpaket
        </Button>
        {this.state.activeTool === "createNewParkingArea" &&
          this.renderCreateNewSignPackage()}
        <Button
          className={classes.buttonWithBottomMargin}
          variant="contained"
          fullWidth={true}
          value="removeParkingArea"
          onClick={() => this.changeActiveTool("removeParkingArea")}
        >
          Visa linjer
        </Button>
        {this.state.activeTool === "removeParkingArea" &&
          this.renderShowLines()}
        <Button
          className={classes.buttonWithBottomMargin}
          variant="contained"
          fullWidth={true}
          value="editParkingArea"
          onClick={() => this.changeActiveTool("editParkingArea")}
        >
          Flytta skyltpaket
        </Button>
        {this.state.activeTool === "editParkingArea" &&
          this.renderMoveSignPackage()}
        <Button
          className={classes.buttonWithBottomMargin}
          variant="contained"
          fullWidth={true}
          value="editParkingAreaAttributes"
          onClick={() => this.changeActiveTool("editParkingAreaAttributes")}
        >
          Flytta etiketter
        </Button>
        {this.state.activeTool === "editParkingAreaAttributes" &&
          this.renderMoveSignPackageLabels()}
      </>
    );
  }
}

export default withStyles(styles)(withSnackbar(SignPackageTools));
