import React from "react";
import Typography from "@material-ui/core/Typography";
import Chip from "@material-ui/core/Chip";

class Informationbar extends React.Component {
  renderInformation() {
    const { model } = this.props;

    if (
      model.markisParameters.userMode === "Create" &&
      model.markisParameters.type === "Contract"
    ) {
      return (
        <Chip
          label={`Uppdaterar ${model.markisParameters.objectId}`}
          color="primary"
          variant="outlined"
        />
      );
    } else if (
      model.markisParameters.userMode === "Create" &&
      (model.markisParameters.type === "Purchase" ||
        model.markisParameters.type === "Sale")
    ) {
      return (
        <Chip
          label={`Skapar ${model.displayConnections[
            model.markisParameters.type
          ].toLowerCase()}`}
          color="primary"
          variant="outlined"
        />
      );
    } else if (
      model.markisParameters.userMode === "Show" &&
      model.markisParameters.objectId
    ) {
      return (
        <Typography>
          Du visar nu{" "}
          {model.displayConnections[model.markisParameters.type].toLowerCase()}{" "}
          kopplade till:
          <br />
          <b>{model.markisParameters.objectId}</b>
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
