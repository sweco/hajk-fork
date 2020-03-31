import React from "react";
import { withStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import FormControl from "@material-ui/core/FormControl";
import NativeSelect from "@material-ui/core/NativeSelect";
import FormLabel from "@material-ui/core/FormLabel";
import Input from "@material-ui/core/Input";

const styles = theme => ({
  root: {
    display: "flex",
    flexWrap: "wrap"
  },
  text: {
    marginLeft: theme.spacing(1),
    display: "flex",
    flexWrap: "wrap"
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
    width: "100%"
  },
  attributeButtons: {
    margin: theme.spacing(1),
    width: 90
  },
  textField: {
    marginLeft: 0,
    marginRight: 0,
    width: "100%"
  }
});

class AttributeEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      formValues: {}
    };

    props.observer.subscribe("featureUpdate", vectorSource => {
      this.setState({
        formValues: this.initFormValues() || {}
      });
    });
  }

  initFormValues() {
    const { model } = this.props;
    var formValues = {};
    var editableFields = model.editSource.editableFields;
    if (model.editFeatureId) {
      var editFeature = model.vectorSource.getFeatureById(model.editFeatureId);
      for (var i = 0; i < editableFields.length; i++) {
        formValues[editableFields[i].name] =
          editFeature.get(editableFields[i].name) || "";
      }
    }

    return formValues;
  }

  checkText(name, value) {
    var formValues = this.state.formValues;
    formValues[name] = value;
    this.setState({
      formValues: formValues
    });
    this.updateFeature(
      this.props.model.vectorSource.getFeatureById(
        this.props.model.editFeatureId
      )
    );
  }

  updateFeature(feature) {
    var props = feature.getProperties();
    console.log("THIS:STATE:FORMVALUES: ", this.state.formValues);
    Object.keys(this.state.formValues).forEach(key => {
      var value = this.state.formValues[key];
      if (value === "") value = null;
      if (Array.isArray(value)) {
        value = value
          .filter(v => v.checked)
          .map(v => v.name)
          .join(";");
      }
      props[key] = value;
    });
    feature.setProperties(props);
  }

  getValueMarkup(field) {
    const { model, classes } = this.props;
    switch (field.textType) {
      case "fritext":
        return (
          <>
            <TextField
              id={field.id}
              label={field.displayName}
              className={classes.textField}
              margin="normal"
              variant="outlined"
              disabled={!model.editFeatureId}
              inputProps={{ maxLength: field.maxLength || undefined }}
              value={this.state.formValues[field.name]}
              onChange={e => {
                this.checkText(field.name, e.target.value);
              }}
            />
          </>
        );
      case "lista":
        let options = null;
        if (Array.isArray(field.values)) {
          options = field.values.map((val, i) => (
            <option key={i} value={val}>
              {val}
            </option>
          ));
        }
        return (
          <div className={classes.root}>
            <FormControl component="fieldset" className={classes.formControl}>
              <FormLabel component="legend">{field.displayName}</FormLabel>
              <NativeSelect
                value={this.state.formValues[field.name]}
                disabled={!model.editFeatureId}
                input={<Input name={field.displayName} id={field.name} />}
                onChange={e => {
                  this.checkText(field.name, e.target.value);
                }}
              >
                <option value="">
                  {field.nullDisplayName || "-Välj värde-"}
                </option>
                {options}
              </NativeSelect>
            </FormControl>
          </div>
        );

      case null:
        return <span>{this.state.formValues[field.name]}</span>;
      default:
        return <span>{this.state.formValues[field.name]}</span>;
    }
  }

  acceptAttributes = () => {
    this.props.model.resetEditFeatureId();
  };

  createAttributeForm() {
    const { model, classes } = this.props;

    const btnAcceptAttributes = (
      <Button
        variant="contained"
        className={classes.attributeButtons}
        onClick={this.acceptAttributes}
      >
        Ok
      </Button>
    );

    if (
      model.promptForAttributes &&
      model.markisParameters.userMode === "Create"
    ) {
      if (model.editFeatureId) {
        var markup = model.editSource.editableFields.map((field, i) => {
          var valueMarkup = this.getValueMarkup(field);
          return (
            <div key={i} ref={field.name}>
              {valueMarkup}
            </div>
          );
        });
        return (
          <div>
            {markup}
            {btnAcceptAttributes}
          </div>
        );
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  render() {
    return this.createAttributeForm();
  }
}

export default withStyles(styles)(AttributeEditor);
