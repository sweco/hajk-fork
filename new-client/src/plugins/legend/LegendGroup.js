import React from "react";
import { CardMedia, Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import LegendLayer from "./LegendLayer";

const useStyles = makeStyles({
  media: {
    objectFit: "none",
  },
});
const LegendGroup = ({ caption, info }) => {
  const classes = useStyles();
  console.log(info, "info");
  return (
    <Grid direction="column" container>
      <Grid item>
        <Typography>{caption}</Typography>
      </Grid>
      <Grid item>
        {Object.values(info.legendInfo).map((x) => {
          return <LegendLayer key={caption} imageSrc={x}></LegendLayer>;
        })}
      </Grid>
    </Grid>
  );
};

export default React.memo(LegendGroup);
