import React from "react";
import Typography from "@material-ui/core/Typography";
import Chip from "@material-ui/core/Chip";
import Popover from "@material-ui/core/Popover";
import { withStyles } from "@material-ui/core/styles";

const styles = theme => ({
  chip: {
    margin: "2px"
  },
  text: {
    margin: theme.spacing(1)
  },
  popOver: {
    maxWidth: "500px"
  }
});

class Informationbar extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      anchorEl: null
    };
  }

  renderInformation() {
    const { classes, model } = this.props;

    const openPopover = event => {
      this.setState({
        anchorEl: event.currentTarget
      });
    };

    const handleClose = () => {
      this.setState({
        anchorEl: null
      });
    };

    const open = Boolean(this.state.anchorEl);
    const id = open ? "simple-popover" : undefined;
    const popOver = (
      <div>
        <Popover
          id={id}
          open={open}
          className={classes.popOver}
          anchorEl={this.state.anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "center"
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "center"
          }}
        >
          <Typography
            variant="h5"
            align="center"
            className={classes.text}
            gutterBottom
          >
            Gör så här
          </Typography>
          <Typography className={classes.text} variant="body1">
            <b>För att skapa en yta på frihand</b>, välj Skapa yta. Klicka på
            första punkten där du vill skapa en nod, och fortsätt klicka en gång
            per ny nod. Avsluta med dubbelklick.
          </Typography>
          <Typography className={classes.text} variant="body1">
            <b>För att kopiera en befintlig yta</b>, säkerställ att lagret du
            vill kopiera en yta ifrån är tänt i lagerhanteraren (syns även som
            flik längst ner i kartan) och att objektet inte täcks av objekt från
            något annat lager (gäller ej bakgrundskartor). Släck annars lagret
            (räcker ej att klicka på ögat). Så snart du har valt ett objekt
            kopplas det till det avtal du redigerar.
          </Typography>
          <Typography className={classes.text} variant="body1">
            <b>När du har slutat redigeringen</b> av geometrin behöver du ange
            attribut som t.ex. förvaltare. När du är nöjd – tryck spara för att
            registrera avtalsytan mot markis eller återgå för att stänga
            kopplingen mellan Markis och GLENN
          </Typography>
          <Typography className={classes.text} variant="body1">
            <b>Om du vill radera en yta</b> kan du använda Radera-verktyget.
            Aktivera verktyget i menyn och klicka sedan på den yta du vill ta
            bort. För att ytan skall försvinna från Markis måste du klicka på
            spara när du är klar. <b>OBS:</b> Du kan enbart radera ytor kopplade
            till det avtal du arbetar med.
          </Typography>
          <Typography className={classes.text} variant="body1">
            <b>Om du vill ändra attribut på en yta</b> kan du använda Ändra
            attribut-verktyget. Aktivera verktyget i menyn och klicka sedan på
            den yta du vill redigera. För att ytan skall uppdateras måste du
            klicka på spara när du är klar.
          </Typography>
          <Typography className={classes.text} variant="body1">
            <b>Om du behöver stöd i arbetet med kartan</b> kan du skicka ett
            mail till gis.fk@fastighet.goteborg.se.
          </Typography>
        </Popover>
      </div>
    );

    if (this.props.userMode === "Create" && this.props.type === "Contract") {
      return (
        <div>
          <Chip
            label={`Uppdaterar ${this.props.objectId}`}
            color="primary"
            className={classes.chip}
            variant="outlined"
          />
          <Chip
            label={"Hjälp!"}
            className={classes.chip}
            color="primary"
            variant="outlined"
            clickable
            onClick={openPopover}
          />
          {popOver}
        </div>
      );
    } else if (
      this.props.userMode === "Create" &&
      (this.props.type === "Purchase" || this.props.type === "Sale")
    ) {
      return (
        <div>
          <Chip
            label={`Skapar ${model.displayConnections[
              this.props.type
            ].toLowerCase()}`}
            color="primary"
            className={classes.chip}
            variant="outlined"
          />
          <Chip
            label={"Hjälp!"}
            className={classes.chip}
            color="primary"
            variant="outlined"
            clickable
            onClick={openPopover}
          />
          {popOver}
        </div>
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
    } else if (
      this.props.model.promptForAttributes &&
      this.props.model.editFeatureId
    ) {
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

  render() {
    return this.renderInformation();
  }
}

export default withStyles(styles)(Informationbar);
