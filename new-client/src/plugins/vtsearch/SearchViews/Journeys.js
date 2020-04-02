import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import { Typography, Divider } from "@material-ui/core";
import Grid from "@material-ui/core/Grid";
import DateFnsUtils from "@date-io/date-fns";
import AccessTimeIcon from "@material-ui/icons/AccessTime";
import EventIcon from "@material-ui/icons/Event";
import InactivePolygon from "../img/polygonmarkering.png";
import InactiveRectangle from "../img/rektangelmarkering.png";
import ActivePolygon from "../img/polygonmarkering-blue.png";
import ActiveRectangle from "../img/rektangelmarkering-blue.png";
import DisabledPolygon from "../img/polygonmarkering-lightgrey.png";
import DisabledRectangle from "../img/rektangelmarkering-ligthgrey.png";
import CardMedia from "@material-ui/core/CardMedia";

import {
  MuiPickersUtilsProvider,
  KeyboardTimePicker,
  KeyboardDatePicker
} from "@material-ui/pickers";

// Define JSS styles that will be used in this component.
// Examle below utilizes the very powerful "theme" object
// that gives access to some constants, see: https://material-ui.com/customization/default-theme/
const styles = theme => ({
  journeysForm: { marginTop: 10 },
  dateForm: {
    marginTop: 0,
    marginBottom: -4,
    color: theme.palette.primary.main
  },
  spaceToFromDate: { marginBottom: 40 },
  divider: { marginTop: theme.spacing(3), marginBottom: theme.spacing(3) },
  errorMessage: { color: theme.palette.error.main },
  polygonAndRectangleImage: {
    width: "80%"
  }
});

class Journeys extends React.PureComponent {
  // Initialize state - this is the correct way of doing it nowadays.
  state = {
    spatialToolsEnabled: true,
    isPolygonActive: false,
    isRectangleActive: false,
    selectedFromDate: new Date(),
    selectedFromTime: new Date(
      new Date().setHours(new Date().getHours(), new Date().getMinutes(), 0, 0)
    ),
    selectedEndDate: new Date(),
    selectedEndTime: new Date(
      new Date().setHours(
        new Date().getHours() + 1,
        new Date().getMinutes(),
        0,
        0
      )
    ),
    selectedFormType: ""
  };

  // propTypes and defaultProps are static properties, declared
  // as high as possible within the component code. They should
  // be immediately visible to other devs reading the file,
  // since they serve as documentation.
  static propTypes = {
    model: PropTypes.object.isRequired,
    app: PropTypes.object.isRequired,
    localObserver: PropTypes.object.isRequired,
    classes: PropTypes.object.isRequired
  };

  static defaultProps = {};

  constructor(props) {
    // If you're not using some of properties defined below, remove them from your code.
    // They are shown here for demonstration purposes only.
    super(props);
    this.model = this.props.model;
    this.localObserver = this.props.localObserver;
    this.globalObserver = this.props.app.globalObserver;
  }

  handleFromTimeChange = time => {
    this.updateStateForTimeOrDateChange(time);
    this.setState(
      {
        selectedFromTime: time
      },
      () => {
        this.reactiveSelectSpatialTool();
      }
    );
    this.addOneHourTime(time);
  };

  handleFromDateChange = date => {
    this.updateStateForTimeOrDateChange(date);
    this.setState(
      {
        selectedFromDate: date
      },
      () => {
        this.reactiveSelectSpatialTool();
      }
    );
  };

  handleEndTimeChange = time => {
    this.updateStateForTimeOrDateChange(time);
    this.setState(
      {
        selectedEndTime: time
      },
      () => {
        this.reactiveSelectSpatialTool();
      }
    );
  };

  handleEndDateChange = date => {
    this.updateStateForTimeOrDateChange(date);
    this.setState(
      {
        selectedEndDate: date
      },
      () => {
        this.reactiveSelectSpatialTool();
      }
    );
  };

  reactiveSelectSpatialTool = () => {
    if (this.state.spatialToolsEnabled && this.state.isPolygonActive)
      this.activateSearch("Polygon");
    if (this.state.spatialToolsEnabled && this.state.isRectangleActive)
      this.activateSearch("Box");
  };

  updateStateForTimeOrDateChange(timeOrDate) {
    if (!this.isTimeOrDateValid(timeOrDate)) {
      this.setState({ spatialToolsEnabled: false }, this.deactivateSearch);
      return;
    }
    if (!this.state.spatialToolsEnabled)
      this.setState({ spatialToolsEnabled: true });
  }

  isTimeOrDateValid = timeOrDate => {
    return timeOrDate.toString() !== "Invalid Date";
  };

  addOneHourTime = time => {
    if (time && !isNaN(time)) {
      let endTime = new Date(time);
      endTime.setHours(time.getHours() + 1);
      this.setState({
        selectedEndTime: endTime,
        selectedEndDate: endTime
      });
    }
  };

  getFormattedDate = () => {
    const {
      selectedFromDate,
      selectedEndDate,
      selectedEndTime,
      selectedFromTime
    } = this.state;
    let fromTime = new Date(selectedFromTime);
    let endTime = new Date(selectedEndTime);

    let formatFromDate = new Date(
      selectedFromDate.getFullYear(),
      selectedFromDate.getMonth(),
      selectedFromDate.getDate(),
      fromTime.getHours(),
      fromTime.getMinutes() - fromTime.getTimezoneOffset(),
      fromTime.getSeconds()
    ).toISOString();

    let formatEndDate = new Date(
      selectedEndDate.getFullYear(),
      selectedEndDate.getMonth(),
      selectedEndDate.getDate(),
      endTime.getHours(),
      endTime.getMinutes() - endTime.getTimezoneOffset(),
      endTime.getSeconds()
    ).toISOString();

    var result = {
      formatFromDate: formatFromDate,
      formatEndDate: formatEndDate
    };

    return result;
  };

  inactivateSpatialSearchButtons = () => {
    this.setState({ isPolygonActive: false, isRectangleActive: false });
  };

  handlePolygonClick = () => {
    this.deactivateSearch();
    this.setState(
      {
        isPolygonActive: !this.state.isPolygonActive,
        isRectangleActive: false
      },
      () => {
        if (this.state.isPolygonActive) this.activateSearch("Polygon");
      }
    );
  };

  handleRectangleClick = () => {
    this.deactivateSearch();
    this.setState(
      {
        isRectangleActive: !this.state.isRectangleActive,
        isPolygonActive: false
      },
      () => {
        if (this.state.isRectangleActive && this.state.spatialToolsEnabled)
          this.activateSearch("Box");
      }
    );
  };

  deactivateSearch = () => {
    this.localObserver.publish("deactivate-search");
  };

  activateSearch = spatialType => {
    const { formatFromDate, formatEndDate } = this.getFormattedDate();

    this.localObserver.publish("journeys-search", {
      selectedFromDate: formatFromDate,
      selectedEndDate: formatEndDate,
      selectedFormType: spatialType,
      searchCallback: this.inactivateSpatialSearchButtons
    });
  };

  renderFromDateSection = () => {
    const { classes } = this.props;
    return (
      <>
        <Grid item xs={12}>
          <Typography variant="caption">FRÅN OCH MED</Typography>
          <KeyboardTimePicker
            margin="normal"
            id="time-picker"
            ampm={false}
            className={classes.dateForm}
            invalidDateMessage="FEL VÄRDE PÅ TID"
            keyboardIcon={<AccessTimeIcon></AccessTimeIcon>}
            value={this.state.selectedFromTime}
            onChange={this.handleFromTimeChange}
            KeyboardButtonProps={{
              "aria-label": "change time"
            }}
          />
        </Grid>
        <KeyboardDatePicker
          className={classes.spaceToFromDate}
          format="yyyy-MM-dd"
          margin="normal"
          keyboardIcon={<EventIcon></EventIcon>}
          invalidDateMessage="FEL VÄRDE PÅ DATUM"
          value={this.state.selectedFromDate}
          onChange={this.handleFromDateChange}
          KeyboardButtonProps={{
            "aria-label": "change date"
          }}
        />
      </>
    );
  };

  renderEndDateSection = () => {
    const { classes } = this.props;
    return (
      <Grid container justify="center" spacing={2}>
        <Grid item xs={12}>
          <Typography variant="caption">TILL OCH MED</Typography>
          <KeyboardTimePicker
            margin="normal"
            ampm={false}
            className={classes.dateForm}
            invalidDateMessage="FEL VÄRDE PÅ TID"
            keyboardIcon={<AccessTimeIcon></AccessTimeIcon>}
            value={this.state.selectedEndTime}
            onChange={this.handleEndTimeChange}
            KeyboardButtonProps={{
              "aria-label": "change time"
            }}
          />
        </Grid>
        <KeyboardDatePicker
          format="yyyy-MM-dd"
          margin="normal"
          invalidDateMessage="FEL VÄRDE PÅ DATUM"
          value={this.state.selectedEndDate}
          className={classes.spaceToFromDate}
          onChange={this.handleEndDateChange}
          KeyboardButtonProps={{
            "aria-label": "change date"
          }}
        />
        {this.showErrorMessage()}
      </Grid>
    );
  };

  showErrorMessage = () => {
    const { classes } = this.props;
    const {
      selectedFromDate,
      selectedEndDate,
      selectedEndTime,
      selectedFromTime
    } = this.state;

    if (!selectedFromDate || !selectedEndDate)
      return (
        <Grid item xs={12}>
          <Typography variant="body2" className={classes.errorMessage}>
            DATUM MÅSTE ANGES
          </Typography>
        </Grid>
      );

    //Had to format date because of time will mess up the date if the date was the same and u only changed one input
    let endDate = new Date(
      selectedEndDate.getFullYear(),
      selectedEndDate.getMonth(),
      selectedEndDate.getDate()
    );
    let fromDate = new Date(
      selectedFromDate.getFullYear(),
      selectedFromDate.getMonth(),
      selectedFromDate.getDate()
    );

    if (!selectedFromTime || !selectedEndTime) {
      return (
        <Grid item xs={12}>
          <Typography variant="body2" className={classes.errorMessage}>
            KLOCKSLAG MÅSTE ANGES
          </Typography>
        </Grid>
      );
    }

    if (
      fromDate > endDate ||
      (fromDate === endDate && selectedFromTime > selectedEndTime)
    ) {
      return (
        <Grid item xs={12}>
          <Typography variant="body2" className={classes.errorMessage}>
            TILL OCH MED FÅR INTE VARA MINDRE ÄN FRÅN OCH MED
          </Typography>
        </Grid>
      );
    }

    return <Typography></Typography>;
  };

  renderSpatialSearchSection = () => {
    const { classes } = this.props;
    return (
      <>
        <Grid item xs={12}>
          <Divider className={classes.divider} />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="body2">AVGRÄNSA SÖKOMRÅDE I KARTAN</Typography>
        </Grid>
        <Grid justify="center" container>
          <Grid item xs={4}>
            {this.getImageSourceForPolygon()}
            <Grid item xs={4}>
              <Typography variant="body2">POLYGON</Typography>
            </Grid>
          </Grid>
          <Grid item xs={4}>
            {this.getImageSourceForRectangle()}
            <Grid item xs={4}>
              <Typography variant="body2">REKTANGEL</Typography>
            </Grid>
          </Grid>
        </Grid>
      </>
    );
  };

  getImageSourceForPolygon = () => {
    const { classes } = this.props;

    let imageSrc = ActivePolygon;
    if (!this.state.isPolygonActive) imageSrc = InactivePolygon;
    if (!this.state.spatialToolsEnabled) imageSrc = DisabledPolygon;

    return (
      <CardMedia
        image={imageSrc}
        className={classes.polygonAndRectangleImage}
        component="img"
        onClick={this.handlePolygonClick}
        value={this.state.selectedFormType}
        alt="#"
      ></CardMedia>
    );
  };

  getImageSourceForRectangle = () => {
    const { classes } = this.props;

    let imageSrc = ActiveRectangle;
    if (!this.state.isRectangleActive) imageSrc = InactiveRectangle;
    if (!this.state.spatialToolsEnabled) imageSrc = DisabledRectangle;

    return (
      <CardMedia
        image={imageSrc}
        className={classes.polygonAndRectangleImage}
        component="img"
        onClick={this.handleRectangleClick}
        value={this.state.selectedFormType}
        alt="#"
      ></CardMedia>
    );
  };

  render() {
    const { classes } = this.props;

    return (
      <div>
        <MuiPickersUtilsProvider
          className={classes.journeysForm}
          utils={DateFnsUtils}
        >
          {this.renderFromDateSection()}
          {this.renderEndDateSection()}
        </MuiPickersUtilsProvider>
        {this.renderSpatialSearchSection()}
      </div>
    );
  }
}

// Exporting like this adds some props to DummyView.
// withStyles will add a 'classes' prop, while withSnackbar
// adds to functions (enqueueSnackbar() and closeSnackbar())
// that can be used throughout the Component.
export default withStyles(styles)(Journeys);
