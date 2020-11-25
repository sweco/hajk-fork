import React from "react";
import LegendGroup from "./LegendGroup";
import Grid from "@material-ui/core/Grid";

const LegendView = ({ legendInfos }) => {
  return (
    <Grid container>
      <Grid item>
        {legendInfos.map((info) => {
          return (
            <LegendGroup
              info={info}
              key={info.caption}
              caption={info.caption}
            ></LegendGroup>
          );
        })}
      </Grid>
    </Grid>
  );
};

export default LegendView;
