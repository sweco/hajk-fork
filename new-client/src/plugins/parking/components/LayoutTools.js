import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { withSnackbar } from "notistack";
import Button from "@material-ui/core/Button";
import { Typography, Paper, TextField } from "@material-ui/core";

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

class LayoutTools extends React.PureComponent {
  state = {
    activeTool: "",
    searchTerm: "",
    areaFound: false
  };

  constructor(props) {
    super(props);
    this.model = this.props.model;
    this.localObserver = this.props.localObserver;
    this.globalObserver = this.props.app.globalObserver;
  }

  componentDidMount() {
    this.localObserver.subscribe("searched-area-highlighted", message => {
      this.setState({
        areaFound: true
      });
    });
  }

  componentWillUnmount() {
    this.localObserver.unsubscribe("searched-area-highlighted");
    this.reset();
  }

  reset() {
    this.setState({
      activeTool: "",
      searchTerm: "",
      areaFound: false
    });
    this.model.reset();
  }

  renderCreateLayout() {
    const { classes } = this.props;
    if (!this.state.areaFound) {
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
              Vill du skapa en layout för det markerade området?
            </Typography>
            <div className={classes.textField}>
              <Button
                className={classes.text}
                onClick={() => this.model.createLayout(this.state.searchTerm)}
                variant="contained"
              >
                Ja
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
          Skapa layout
        </Button>
        {this.state.activeTool === "createNewParkingArea" &&
          this.renderCreateLayout()}
      </>
    );
  }
}

export default withStyles(styles)(withSnackbar(LayoutTools));
