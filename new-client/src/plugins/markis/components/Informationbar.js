import React from "react";
import Typography from "@material-ui/core/Typography";
import Chip from "@material-ui/core/Chip";

class Informationbar extends React.Component {
  renderInformation() {
    const { model } = this.props;

    if (this.props.userMode === "Create" && this.props.type === "Contract") {
      return (
        <Chip
          label={`Uppdaterar ${this.props.objectId}`}
          color="primary"
          variant="outlined"
        />
      );
    } else if (
      this.props.userMode === "Create" &&
      (this.props.type === "Purchase" || this.props.type === "Sale")
    ) {
      return (
        <Chip
          label={`Skapar ${model.displayConnections[
            this.props.type
          ].toLowerCase()}`}
          color="primary"
          variant="outlined"
        />
      );
    } else if (this.props.userMode === "Show" && this.props.objectId) {
      return (
        <Typography>
          Du visar nu {model.displayConnections[this.props.type].toLowerCase()}{" "}
          kopplade till:
          <br />
          <b>{this.props.objectId}</b>
        </Typography>
      );
    } else {
      return <Typography>Du visar ingen yta just nu.</Typography>;
    }
  }

  // renderAttributeEditorInformation() {
  //   const { model, classes } = this.props;
  //   if (model.createMethod === "editAttributes") {
  //     return (
  //       <div className={classes.text}>
  //         <Typography>
  //           Markera en yta för att redigera dess attribut.
  //         </Typography>
  //       </div>
  //     );
  //   }
  // }

  render() {
    return this.renderInformation();
  }
}

export default Informationbar;
