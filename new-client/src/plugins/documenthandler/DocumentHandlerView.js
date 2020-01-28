import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import { withSnackbar } from "notistack";
import Button from "@material-ui/core/Button";

// Define JSS styles that will be used in this component.
// Example below utilizes the very powerful "theme" object
// that gives access to some constants, see: https://material-ui.com/customization/default-theme/
const styles = theme => ({
  buttonWithBottomMargin: {
    marginBottom: theme.spacing(2)
  }
});

function getTocJson(documentNumbers) {
  return fetch("http://localhost:3000/toc.json").then(res => {
    return res.text().then(text => {
      var json = JSON.parse(text);
      for (var i = 0; i < documentNumbers.length; i++) {
        json[i].path = `http://localhost:3000/doc${documentNumbers[i]}.json`;
        json[i].title = documentNumbers[i];
      }
      return json;
    });
  });
}

function downloadJson(jsonObject, name) {
  var json = JSON.stringify(jsonObject);

  //Convert JSON string to BLOB.
  json = [json];
  var blob1 = new Blob(json, { type: "data:text/json;charset=utf-8" });

  //Check the Browser.
  var isIE = false || !!document.documentMode;
  if (isIE) {
    window.navigator.msSaveBlob(blob1, `${name}.json`);
  } else {
    var url = window.URL || window.webkitURL;
    var link = url.createObjectURL(blob1);
    var a = document.createElement("a");
    a.download = `${name}.json`;
    a.href = link;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function generateJson(documentNumbers) {
  var promises = [];
  getTocJson(documentNumbers).then(tocJson => {
    fetch("http://localhost:3000/randomtext.txt").then(res => {
      res.text().then(randomText => {
        documentNumbers.forEach((documentNumber, index) => {
          promises.push(
            new Promise((resolve, reject) => {
              fetch(
                `http://localhost:3000/docempty${documentNumber}.json`
              ).then(res => {
                res.text().then(text => {
                  var json = JSON.parse(text);
                  json.date = "random date";
                  json.text = randomText;
                  json.title = `${documentNumber}`;
                  for (var i = 0; i < json.rubriker.length; i++) {
                    console.log(documentNumber, "documentNumber");
                    tocJson[index].rubriker.push({
                      id: i,
                      document: documentNumber,
                      nyckelord:
                        i % 2 == 0 ? ["mollis", "placerat", "condimentum "] : []
                    });
                    json.rubriker[i].id = i;
                    json.rubriker[i].text = randomText;
                    json.rubriker[i].level = Math.floor(Math.random() * 3) + 1;
                  }
                  resolve(json);
                });
              });
            })
          );
        });
        Promise.all(promises).then(res => {
          downloadJson(tocJson, `toc`);
          res.forEach((json, index) => {
            downloadJson(json, `doc${index}`);
          });
        });
      });
    });
  });
}

function getFiles(documentNumbers) {
  var promises = [];
  documentNumbers.forEach((documentNumber, index) => {
    promises.push(
      fetch(`http://localhost:3000/doc${documentNumber}.json`).then(res => {
        return res.text().then(text => {
          return JSON.parse(text);
        });
      })
    );
  });
  return promises;
}

function findHeadline(document, headline) {
  console.log(document.rubriker, "rubriker");
}

class DocumentHandlerView extends React.PureComponent {
  // Initialize state - this is the correct way of doing it nowadays.
  state = {
    counter: 0
  };

  // propTypes and defaultProps are static properties, declared
  // as high as possible within the component code. They should
  // be immediately visible to other devs reading the file,
  // since they serve as documentation.
  static propTypes = {
    model: PropTypes.object.isRequired,
    app: PropTypes.object.isRequired,
    localObserver: PropTypes.object.isRequired,
    classes: PropTypes.object.isRequired,
    enqueueSnackbar: PropTypes.func.isRequired,
    closeSnackbar: PropTypes.func.isRequired
  };

  static defaultProps = {};

  constructor(props) {
    // If you're not using some of properties defined below, remove them from your code.
    // They are shown here for demonstration purposes only.
    super(props);
    this.model = this.props.model;
    this.localObserver = this.props.localObserver;
    this.globalObserver = this.props.app.globalObserver;
    this.documentToTest = null;
  }

  searchForKeywords = () => {
    var keywords = ["placerat"];
    var t0 = performance.now();

    var found = [];
    fetch("http://localhost:3000/toc.json").then(res => {
      return res.text().then(text => {
        var json = JSON.parse(text);
        var documents = Object.values(json);
        documents.forEach(document => {
          document.rubriker.forEach(rubrik => {
            for (var i = 0; i < keywords.length; i++) {
              for (var j = 0; j < rubrik.nyckelord.length; j++) {
                if (keywords[i] === rubrik.nyckelord[j]) {
                  found.push({ document: document.path, rubrik: rubrik });
                  break;
                }
              }
            }
          });
        });

        var paths = new Set(
          found.map(x => {
            return x.document;
          })
        );

        Promise.all(
          Array.from(paths).map(path => {
            return fetch(path);
          })
        ).then(documents => {
          documents.forEach(document => {
            document.text().then(text => {
              var jsonDocument = JSON.parse(text);
              var tst = this.getRubrikFromOpDokument(
                jsonDocument,
                found.map(found => {
                  return found.rubrik.id;
                })
              );
              var t1 = performance.now();
              console.log(tst, "tst");
              console.log(
                "Call to doSomething took " + (t1 - t0) + " milliseconds."
              );
            });
          });
        });
      });
    });
  };

  getRubrikFromOpDokument = (opDokument, rubrikIds) => {
    return rubrikIds.map(rubrikId => {
      return opDokument.rubriker.filter(rubrik => {
        return rubrik.id == rubrikId;
      });
    });
  };

  buttonClick = () => {
    // We have access to plugin's model:

    generateJson([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // We have access to plugin's observer. Below we publish an event that the parent
    // component is listing to, see  documenthandler.js for how to subscribe to events.
    this.localObserver.publish(
      "documentHandlerEvent",
      "This has been sent from  DocumentHandlerView using the Observer"
    );

    // And we can of course access this component's state
    this.setState(prevState => ({
      counter: prevState.counter + 1
    }));
  };

  readFiles = () => {
    var t0 = performance.now();

    Promise.all(getFiles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).then(result => {
      var t1 = performance.now();
      console.log("Call to doSomething took " + (t1 - t0) + " milliseconds.");
      this.documentToTest = result[0];
    });
  };

  // A more complicate snackbar example, this one with an action button and persistent snackbar
  showAdvancedSnackbar = () => {
    const action = key => (
      <>
        <Button
          onClick={() => {
            alert(`I belong to snackbar with key ${key}`);
          }}
        >
          {"Alert"}
        </Button>
        <Button
          onClick={() => {
            this.props.closeSnackbar(key);
          }}
        >
          {"Dismiss"}
        </Button>
      </>
    );

    this.props.enqueueSnackbar("Oops, a message with error styling!", {
      variant: "error",
      persist: true,
      action
    });
  };

  render() {
    const { classes } = this.props;
    return (
      <>
        <Button
          className={classes.buttonWithBottomMargin}
          variant="contained"
          fullWidth={true}
          onClick={this.buttonClick}
        >
          Create mocked doc-files and toc-file
        </Button>

        <Button
          className={classes.buttonWithBottomMargin}
          variant="contained"
          fullWidth={true}
          onClick={this.readFiles}
        >
          Log time to read all documents into memory (2.5 miljoner tecken per
          fil)
        </Button>
        <Button
          className={classes.buttonWithBottomMargin}
          variant="contained"
          fullWidth={true}
          onClick={this.searchForKeywords}
        >
          Log time to Search for mocked keyword and get all JSON-tags from
          documents
        </Button>
      </>
    );
  }
}

// Exporting like this adds some props to DocumentHandlerView.
// withStyles will add a 'classes' prop, while withSnackbar
// adds to functions (enqueueSnackbar() and closeSnackbar())
// that can be used throughout the Component.
export default withStyles(styles)(withSnackbar(DocumentHandlerView));
