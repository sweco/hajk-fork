import React from "react";
import { CardMedia } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles({
  media: {
    objectFit: "none",
    width: "auto",
  },
});
const LegendLayer = ({ imageSrc }) => {
  console.log(imageSrc, "Render LegendLayer");
  const classes = useStyles();

  return (
    <CardMedia
      classes={{ media: classes.media }}
      component="img"
      src={imageSrc}
    ></CardMedia>
  );
};

export default React.memo(LegendLayer);
