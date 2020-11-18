import React from "react";
import Button from "@material-ui/core/Button";

const buttonClick = () => {
  console.log("HEJ");
};

const LegendView = () => {
  return (
    <Button variant="contained" fullWidth={true} onClick={buttonClick}>
      Detta är en knapp
    </Button>
  );
};

export default LegendView;
