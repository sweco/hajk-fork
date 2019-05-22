import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Chip from "@material-ui/core/Chip";
import TripOrigin from "@material-ui/icons/TripOrigin";

const styles = theme => ({
  chip: {
    margin: theme.spacing.unit,
    minWidth: 200
  }
});

function handleDelete() {
  alert("You clicked the delete icon."); // eslint-disable-line no-alert
}

function handleClick() {
  alert("You clicked the Chip."); // eslint-disable-line no-alert
}

class SearchWithinBar extends React.PureComponent {
  componentDidMount() {
    const { model, onSearchWithin } = this.props;
    model.withinSearch(layerIds => {
      if (layerIds.length > 0) {
        this.onSearchWithin(layerIds);
      }
    });
  }
  render() {
    const { classes } = this.props;
    return (
      <Chip
        icon={<TripOrigin />}
        label="Rita polygon"
        onClick={handleClick}
        className={classes.chip}
      />
    );
  }
}

SearchWithinBar.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(SearchWithinBar);
