import React from "react";
import { withStyles } from "@material-ui/core/styles";
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
    marginTop: 4,
    width: "100%"
  },
  centerElements: {
    textAlign: "center"
  }
});

class AttributeEditor extends React.Component {
  constructor(props) {
    super(props);
    this.localObserver = this.props.localObserver;
    this.state = {
      formValues: this.initFormValues() || {},
      editFeatureId: undefined
    };

    // this.localObserver.subscribe("feature-selected-for-edit", vectorSource => {
    //   this.setState({
    //     formValues: this.initFormValues() || {}
    //   });
    // });

    // this.localObserver.subscribe("edit-feature-reset", message => {
    //   this.setState({
    //     editFeatureId: undefined,
    //     featureModified: true
    //   });
    // });

    this.localObserver.subscribe("feature-added", message => {
      this.setState({
        formValues: this.initFormValues()
      });
    });

    this.localObserver.subscribe("spaces-added", message => {
      this.setState({
        formValues: this.initFormValues()
      });
    });
  }

  initFormValues() {
    const { model } = this.props;
    var formValues = {};
    var editableFields = model.editSource.editableFields;
    console.log("model: ", model);
    if (model.editFeatureId) {
      var editFeature = model.vectorSource.getFeatureById(model.editFeatureId);
      console.log("editfeature: ", editFeature);
      for (var i = 0; i < editableFields.length; i++) {
        formValues[editableFields[i].name] =
          editFeature.get(editableFields[i].name) || "";
      }
    } else {
      for (var j = 0; j < editableFields.length; j++) {
        formValues[editableFields[j].name] = "";
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
    if (this.props.model.editFeatureId) {
      this.updateFeature(
        this.props.model.vectorSource.getFeatureById(
          this.props.model.editFeatureId
        )
      );
    } else {
      this.updateAllFeatures();
    }
  }

  updateFeature(feature) {
    var props = feature.getProperties();
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

  updateAllFeatures() {
    this.props.model.vectorSource.getFeatures().forEach(feature => {
      var props = feature.getProperties();
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
    });
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
              size="small"
              variant="outlined"
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
    const { model } = this.props;

    var markup = model.editSource.editableFields.map((field, i) => {
      var valueMarkup = this.getValueMarkup(field);
      return (
        <div key={i} ref={field.name}>
          {valueMarkup}
        </div>
      );
    });
    return <div>{markup}</div>;
  }

  render() {
    return this.createAttributeForm();
  }
}

export default withStyles(styles)(AttributeEditor);
