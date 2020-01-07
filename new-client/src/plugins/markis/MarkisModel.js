import * as signalR from "@microsoft/signalr";
import { WFS } from "ol/format";
import GeometryType from "ol/geom/GeometryType";
import IsLike from "ol/format/filter/IsLike";
import Or from "ol/format/filter/Or";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Vector from "ol/layer/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { arraySort } from "./../../utils/ArraySort.js";
import { Stroke, Style, Circle, Fill } from "ol/style.js";
import { Draw } from "ol/interaction";
import X2JS from "x2js";
import { handleClick } from "../../models/Click.js";
import { Modify } from "ol/interaction.js";
import Collection from "ol/Collection.js";

class MarkisModel {
  constructor(settings) {
    this.map = settings.map;
    this.app = settings.app;
    this.localObserver = settings.localObserver;
    this.globalObserver = settings.globalObserver;
    this.hubUrl = settings.options.hubUrl;
    this.isConnected = false;
    this.sources = settings.options.sources;
    this.estateLayerName = settings.options.estateLayerName;
    this.wfstSources = settings.options.wfstSources;
    this.type = "Polygon";
    this.markisParameters = {};
    this.featureIdCounter = 1;
    this.createMethod = "abort";
    this.geometryName = "geom";
    this.wfsParser = new WFS();
    this.controllers = [];
    this.vectorSource = new VectorSource({});
    this.searchResultLayer = new VectorLayer({
      source: new VectorSource({}),
      style: this.getSketchStyle()
    });
    this.map.addLayer(this.searchResultLayer);
    this.searchResultLayer.set("type", "markisResultLayer");
    this.searchResultLayer.set("queryable", true);
  }

  /**Style for search results and sketching */
  getSketchStyle() {
    return [
      new Style({
        fill: new Fill({
          color: "rgba(255, 0, 0, 0.5)"
        }),
        stroke: new Stroke({
          color: "rgba(200, 0, 0, 0.5)",
          width: 4
        }),
        image: new Circle({
          radius: 6,
          fill: new Fill({
            color: "rgba(0, 0, 0, 0.5)"
          }),
          stroke: new Stroke({
            color: "rgba(255, 255, 255, 0.5)",
            width: 2
          })
        })
      })
    ];
  }

  /**Style for highlighted (selected) features */
  getHighlightStyle() {
    return [
      new Style({
        fill: new Fill({
          color: "rgba(0, 255, 0, 0.5)"
        }),
        stroke: new Stroke({
          color: "rgba(0, 200, 0, 0.5)",
          width: 4
        }),
        image: new Circle({
          radius: 6,
          fill: new Fill({
            color: "rgba(0, 0, 0, 0.5)"
          }),
          stroke: new Stroke({
            color: "rgba(255, 255, 255, 0.5)",
            width: 2
          })
        })
      })
    ];
  }

  /**Style for hidden features */
  getHiddenStyle() {
    return [
      new Style({
        stroke: new Stroke({
          color: "rgba(0, 0, 0, 0)",
          width: 0
        }),
        fill: new Fill({
          color: "rgba(1, 2, 3, 0)"
        }),
        image: new Circle({
          fill: new Fill({
            color: "rgba(0, 0, 0, 0)"
          }),
          stroke: new Stroke({
            color: "rgba(0, 0, 0, 0)",
            width: 0
          }),
          radius: 0
        })
      })
    ];
  }

  setEditLayer(layerName) {
    this.editSource = this.wfstSources.find(
      wfstSource => wfstSource.layers[0] === layerName
    );
    this.editLayer = new Vector({
      source: this.vectorSource,
      style: this.getSketchStyle()
    });

    if (this.editLayer) {
      this.map.removeLayer(this.editLayer);
    }
    this.map.addLayer(this.editLayer);
  }

  getLayer(layerName) {
    var foundLayer = this.map
      .getLayers()
      .getArray()
      .find(layer => {
        var match = false;
        if (layer.getSource().getParams) {
          let params = layer.getSource().getParams();
          if (typeof params === "object") {
            let paramName = params.LAYERS.split(":");
            let layerSplit = layerName.split(":");
            if (paramName.length === 2 && layerSplit.length === 2) {
              match = layerName === params.LAYERS;
            }
            if (paramName.length === 1) {
              match = layerSplit[1] === params.LAYERS;
            }
          }
        }
        return match;
      });
    if (foundLayer) {
      return foundLayer;
    }
  }

  toggleLayerVisibility(layerName, visible) {
    const foundLayer = this.getLayer(layerName);
    if (foundLayer) {
      foundLayer.setProperties({ visible: visible });
    }
  }

  refreshLayer(layerName) {
    const foundLayer = this.getLayer(layerName);
    if (foundLayer) {
      const source = foundLayer.getSource();
      source.changed();
      source.updateParams({ time: Date.now() });
      this.map.updateSize();
    }
  }

  /**Returns the data source connected to the prefix of the contract ID */
  getContractSource() {
    const prefix = this.markisParameters.objectId.slice(0, 2).toUpperCase();
    for (var i = 0; i < this.wfstSources.length; i++) {
      if (this.wfstSources[i].prefixes.indexOf(prefix) > -1) {
        return this.wfstSources[i].layers[0];
      }
    }
  }

  /**Lets the user select existing features for editing. Only handles single select and is restricted to polygon*/
  onSelectFeatures = evt => {
    handleClick(evt, evt.map, response => {
      if (response.features.length === 1) {
        const feature = response.features[0];
        const geometryType = feature.getGeometry().getType();
        if (geometryType === GeometryType.POLYGON) {
          feature.modification = "added";
          feature.setId(this.featureIdCounter);
          this.featureIdCounter++;
          this.vectorSource.addFeature(feature);
          this.localObserver.publish("featureUpdate", this.vectorSource);
        }
      }
    });
  };

  setFeatureProperties() {
    this.vectorSource.forEachFeature(feature => {
      feature.setGeometryName(this.geometryName);
      feature.unset("bbox", true);
      feature.setProperties({
        [this.editSource.columnNames.contractId]: this.markisParameters
          .objectId,
        [this.editSource.columnNames.createdBy]: this.markisParameters
          .createdBy,
        [this.editSource.columnNames.regDate]: this.getTimeStampDate(),
        [this.editSource.columnNames.status]: this.markisParameters
          .objectStatus,
        [this.editSource.columnNames.handlopnr]: this.markisParameters
          .objectSerial
      });
    });
  }

  setType(type) {
    this.type = type;
    this.removeInteraction();
    this.addInteraction();
  }

  addInteraction() {
    this.draw = new Draw({
      source: this.vectorSource,
      type: this.type,
      style: this.getSketchStyle(),
      geometryName: this.geometryName
    });
    this.draw.on("drawend", event => {
      this.handleDrawEnd(event);
    });
    this.map.addInteraction(this.draw);
  }

  handleDrawEnd = event => {
    event.feature.modification = "added";
    event.feature.setId(this.featureIdCounter);
    this.featureIdCounter++;
    this.localObserver.publish("featureUpdate", this.vectorSource);
  };

  removeInteraction() {
    if (this.draw) {
      this.map.removeInteraction(this.draw);
    }
    if (this.edit) {
      this.map.removeInteraction(this.edit);
    }
    this.editFeatureId = undefined;
    this.localObserver.publish("featureUpdate", this.vectorSource);
    this.map.un("singleclick", this.removeSelected);
    this.map.un("singleclick", this.onSelectFeatures);
    this.map.un("singleclick", this.selectForEdit);
  }

  removeSelected = e => {
    this.map.forEachFeatureAtPixel(e.pixel, feature => {
      if (this.vectorSource.getFeatures().some(f => f === feature)) {
        if (feature.modification === "added") {
          feature.modification = undefined;
        } else {
          feature.modification = "removed";
        }
        feature.setStyle(this.getHiddenStyle());
        this.localObserver.publish("featureUpdate", this.vectorSource);
      }
    });
  };

  removeHighlight() {
    this.vectorSource.getFeatures().forEach(feature => {
      if (feature.modification && feature.modification !== "removed") {
        feature.setStyle(this.getSketchStyle);
      }
    });
  }

  selectForEdit = e => {
    this.map.forEachFeatureAtPixel(e.pixel, feature => {
      if (this.vectorSource.getFeatures().some(f => f === feature)) {
        this.removeHighlight();
        this.editFeatureId = feature.getId();
        feature.setStyle(this.getHighlightStyle());
      }
      this.localObserver.publish("featureUpdate", this.vectorSource);
    });
  };

  setEditActive() {
    let features = new Collection();
    this.vectorSource.getFeatures().forEach(feature => {
      features.push(feature);
    });
    this.edit = new Modify({ features: features });
    this.map.addInteraction(this.edit);
  }

  setCreateMethod(method) {
    this.removeHighlight();
    if (method) {
      this.createMethod = method;
    }
    this.removeInteraction();

    if (this.createMethod === "remove") {
      this.map.on("singleclick", this.removeSelected);
    }

    if (this.createMethod === "add") {
      this.type = "Polygon";
      this.setType(this.type);
    }

    if (this.createMethod === "addLine") {
      this.type = "LineString";
      this.setType(this.type);
    }

    if (this.createMethod === "addEstate") {
      this.map.on("singleclick", this.onSelectFeatures);
    }

    if (this.createMethod === "edit") {
      this.setEditActive();
    }

    if (this.createMethod === "editAttributes") {
      this.map.on("singleclick", this.selectForEdit);
    }
  }

  /**Creates a timestamp without time zone suitable for the database */
  getTimeStampDate() {
    return new Date(new Date().toString().split("GMT")[0] + " UTC")
      .toISOString()
      .split(".")[0];
  }

  write(features) {
    const format = new WFS(),
      lr = this.editSource.layers[0].split(":"),
      fp = lr.length === 2 ? lr[0] : "",
      ft = lr.length === 2 ? lr[1] : lr[0],
      options = {
        featureNS: this.editSource.uri,
        featurePrefix: fp,
        featureType: ft,
        hasZ: false,
        version: "1.1.0", // or "1.0.0"
        srsName: this.editSource.projection
      };
    return format.writeTransaction(
      features.inserts,
      features.updates,
      features.deletes,
      options
    );
  }

  parseWFSTresponse(response) {
    const str =
      typeof response !== "string"
        ? new XMLSerializer().serializeToString(response)
        : response;
    return new X2JS().xml2js(str);
  }

  transact(features, done) {
    let node = this.write(features),
      serializer = new XMLSerializer(),
      src = this.editSource,
      payload = node ? serializer.serializeToString(node) : undefined;
    //Quickfix for wrong geometryname
    payload = payload.replace(new RegExp("<geometry>", "g"), "<geom>");
    payload = payload.replace(new RegExp("</geometry>", "g"), "</geom>");
    if (payload) {
      fetch(src.posturl, {
        method: "POST",
        body: payload,
        credentials: "same-origin",
        headers: {
          "Content-Type": "text/xml"
        }
      })
        .then(response => {
          response.text().then(wfsResponseText => {
            done(this.parseWFSTresponse(wfsResponseText));
          });
        })
        .catch(response => {
          response.text().then(errorMessage => {
            done(errorMessage);
          });
        });
    }
  }

  /**Updates the id:s on the features so that they are saved correctly in the database.
   */
  updateFeatureIds(features) {
    if (features.inserts.length > 0) {
      features.inserts.forEach(feature => {
        feature.setId(undefined);
        if (feature.getProperties().id) {
          feature.unset("id", true);
        }
      });
    }
    if (features.deletes.length > 0) {
      features.deletes.forEach(feature => {
        feature.setId(feature.getProperties().id);
      });
    }
    if (features.updates.length > 0) {
      features.updates.forEach(feature => {
        feature.setId(feature.getProperties().id);
      });
    }
  }

  save(done) {
    this.setFeatureProperties();

    const find = mode =>
      this.vectorSource
        .getFeatures()
        .filter(feature => feature.modification === mode);

    const features = {
      updates: find("updated"),
      inserts: find("added"),
      deletes: find("removed")
    };

    if (
      features.updates.length === 0 &&
      features.inserts.length === 0 &&
      features.deletes.length === 0
    ) {
      return done();
    }
    this.featuresToTransact = features;
    this.updateFeatureIds(this.featuresToTransact);
    this.transact(this.featuresToTransact, done);
    this.featuresToTransact = undefined;
  }

  clearSearchResult() {
    this.searchResultLayer.getSource().clear();
  }

  reset() {
    this.vectorSource.clear();
    this.editFeatureId = undefined;
    Object.assign(this.markisParameters, {
      objectId: undefined,
      objectSerial: undefined,
      objectStatus: undefined,
      createdBy: undefined,
      mode: "visningsläge"
    });
    this.sourceName = undefined;
  }

  /**Verifies the parameters sent from Markis and assigns them to the MarkisParameter-object */
  updateMarkisParameters(message, mode) {
    if (message.contractId.length !== 10) {
      this.publishMessage(
        "Avtalsnumret måste bestå av 10 tecken.",
        "error",
        true
      );
      return false;
    } else if (
      isNaN(message.contractSerial) ||
      message.contractSerial === "0" ||
      message.contractSerial === ""
    ) {
      this.publishMessage(
        "Markis skickade inte ett giltligt händelselöpnummer.",
        "error",
        true
      );
      return false;
    } else if (!message.userName && mode !== "visningsläge") {
      this.publishMessage(
        "Markis skickade inte ett giltligt anvädnarnamn",
        "error",
        true
      );
      return false;
    } else if (
      ["F", "G"].indexOf(message.contractStatus.toUpperCase()) === -1
    ) {
      this.publishMessage(
        "Markis skickade inte ett giltligt status. (Status måste vara F eller G)",
        "error",
        true
      );
      return false;
    } else if (
      message.contractStatus.toUpperCase() === "G" &&
      mode !== "visningsläge"
    ) {
      this.publishMessage(
        "Du kan inte skapa en avtalsyta med status gällande.",
        "error",
        true
      );
      return false;
    } else {
      Object.assign(this.markisParameters, {
        objectId: message.contractId.toUpperCase(),
        objectSerial: message.contractSerial,
        objectStatus: message.contractStatus.toUpperCase(),
        createdBy: message.userName,
        mode: mode
      });
      return true;
    }
  }

  /**Validates that each feature in the existing contract is ok before allowing
   * the user to create additional contract geometries
   */
  validateContract(foundContract) {
    let contractControl = { contractOk: false, type: undefined };
    const foundSerial = foundContract.properties.handlopnr;
    if (foundSerial) {
      if (foundContract.properties.status.toUpperCase() === "G") {
        if (foundSerial >= this.markisParameters.objectSerial) {
          Object.assign(contractControl, {
            contractOk: false,
            message: "Det finns redan en gällande avtalsyta."
          });
          return contractControl;
        } else if (foundSerial < this.markisParameters.objectSerial) {
          Object.assign(contractControl, {
            contractOk: true,
            message:
              "Du skapar en tilläggsyta. Kom ihåg att radera den gamla ytan om du inte vill att den ska ingå."
          });
          return contractControl;
        }
      } else if (foundContract.properties.status.toUpperCase() === "F") {
        if (
          foundContract.properties.handlopnr.toString() !==
          this.markisParameters.objectSerial
        ) {
          Object.assign(contractControl, {
            contractOk: false,
            message: "Det finns en förslagsyta med ett annat händelselöpnummer."
          });
          return contractControl;
        }
        Object.assign(contractControl, {
          contractOk: true,
          message: "Du redigerar nu en förslagsyta."
        });
        return contractControl;
      } else {
        Object.assign(contractControl, {
          contractOk: false,
          message: "De existerande avtalsytorna har inget status."
        });
        return contractControl;
      }
    } else {
      Object.assign(contractControl, {
        contractOk: false,
        type: "Det finns redan en gällande avtalsyta. (Utan händelselöpnummer)."
      });
      return contractControl;
    }
  }

  /**Validates all existing features connected to the contract ID */
  validateContractCollection(featureCollection) {
    for (var i = 0; i < featureCollection.features.length; i++) {
      var existingContract = this.validateContract(
        featureCollection.features[i]
      );
      if (!existingContract.contractOk) {
        this.publishMessage(existingContract.message, "error", false);
        return false;
      }
    }
    this.publishMessage(existingContract.message, "warning", false);
    return true;
  }

  connectToHub(sessionId) {
    this.sessionId = sessionId;
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl + "?sid=" + sessionId + "")
      .build();

    this.connection
      .start()
      .then(
        function() {
          this.isConnected = true;
        }.bind(this)
      )
      .catch(
        function() {
          this.publishMessage(
            "Webbkartan kunde inte ansluta till MarkIS.",
            "error",
            false
          );
        }.bind(this)
      );

    this.connection.on(
      "ShowContractFromMarkis",
      function(_, showMessage) {
        this.reset();
        const showObj = JSON.parse(showMessage);
        if (this.updateMarkisParameters(showObj, "visningsläge")) {
          this.localObserver.publish("updateMarkisView", {});
          this.doSearch(showObj.contractId);
        }
      }.bind(this)
    );

    this.connection.on(
      "CreateContractFromMarkis",
      function(_, createMessage) {
        this.reset();
        const createObject = JSON.parse(createMessage);
        if (this.updateMarkisParameters(createObject, "visningsläge")) {
          this.search(this.markisParameters.objectId, result => {
            var numExistingContracts = this.getNumberOfResults(result);
            if (numExistingContracts > 0) {
              var contractCollectionOk = this.validateContractCollection(
                result[0]
              );
              if (contractCollectionOk) {
                this.enableContractCreation(createObject, result);
              } else {
                this.highlightImpact(result);
                this.localObserver.publish("updateMarkisView", {});
              }
            } else {
              this.enableContractCreation(createObject, null);
            }
          });
        }
      }.bind(this)
    );
  }

  /**Enables creation of contract geometries. Sets the editlayer etc. */
  enableContractCreation(createObject, existingGeom) {
    this.updateMarkisParameters(createObject, "editeringsläge");
    this.searchResultLayer.getSource().clear();
    this.sourceName = this.getContractSource();
    if (this.sourceName) {
      this.localObserver.publish("updateMarkisView", {});
      if (existingGeom) {
        const existingFeatures = new GeoJSON().readFeatures(existingGeom[0]);
        this.vectorSource.addFeatures(existingFeatures);
        this.vectorSource.getFeatures().forEach(feature => {
          feature.setId(this.featureIdCounter);
          this.featureIdCounter++;
          //If we are creating "Tilläggsavtal", all existing geometries are seen as "new" geometries (Added).
          if (feature.getProperties().status.toUpperCase() === "G") {
            feature.modification = "added";
          } else {
            feature.modification = "updated";
          }
          feature.on("propertychange", e => {
            if (feature.modification === "removed") {
              return;
            }
            if (feature.modification === "added") {
              return;
            }
            if (feature.getProperties().id) {
              feature.modification = "updated";
            }
          });
          feature.on("change", e => {
            if (feature.modification === "removed") {
              return;
            }
            if (feature.modification === "added") {
              return;
            }
            if (feature.getProperties().id) {
              feature.modification = "updated";
            }
          });
        });
        const extent = this.vectorSource.getExtent();
        this.map.getView().fit(extent, this.map.getSize());
        this.localObserver.publish("featureUpdate", this.vectorSource);
      }
    } else {
      this.publishMessage(
        "Inget datalager hittades för avtalsprefixet. Kontakta systemadministratören.",
        "error",
        true
      );
    }
  }

  publishMessage(message, variant, reset) {
    this.localObserver.publish("markisErrorEvent", {
      message: message,
      variant: variant,
      reset: reset
    });
  }

  disconnectHub() {
    this.connection
      .stop()
      .then(
        function() {
          this.isConnected = false;
        }.bind(this)
      )
      .catch(function() {
        console.log("Disconnection from hub failed");
      });
  }

  lookUp(source, searchInput) {
    const projCode = this.map
      .getView()
      .getProjection()
      .getCode();

    var isLikeFilters = source.searchFields.map(searchField => {
      return new IsLike(
        searchField,
        searchInput + "*",
        "*", // wild card
        ".", // single char
        "!", // escape char
        false // match case
      );
    });

    var filter =
      isLikeFilters.length > 1 ? new Or(...isLikeFilters) : isLikeFilters[0];

    const options = {
      featureTypes: source.layers,
      srsName: projCode,
      outputFormat: "JSON", //source.outputFormat,
      geometryName: source.geometryField,
      maxFeatures: 100,
      filter: filter
    };

    const node = this.wfsParser.writeGetFeature(options);
    const xmlSerializer = new XMLSerializer();
    const xmlString = xmlSerializer.serializeToString(node);
    const controller = new AbortController();
    const signal = controller.signal;

    const request = {
      credentials: "same-origin",
      signal: signal,
      method: "POST",
      headers: {
        "Content-Type": "text/xml"
      },
      body: xmlString
    };
    const promise = fetch(
      this.app.config.appConfig.searchProxy + source.url,
      request
    );

    return { promise, controller };
  }

  search(searchInput, callback) {
    this.timeout = setTimeout(() => {
      this.searchResultLayer.getSource().clear();
      let promises = [];
      this.controllers.splice(0, this.controllers.length);

      this.sources.forEach(source => {
        const { promise, controller } = this.lookUp(source, searchInput);
        promises.push(promise);
        this.controllers.push(controller);
      });

      Promise.all(promises)
        .then(responses => {
          Promise.all(responses.map(result => result.json()))
            .then(jsonResults => {
              jsonResults.forEach((jsonResult, i) => {
                if (jsonResult.features.length > 0) {
                  arraySort({
                    array: jsonResult.features,
                    index: this.sources[i].searchFields[0]
                  });
                }
                jsonResult.source = this.sources[i];
              });
              jsonResults = jsonResults.filter(function(e) {
                return e.features.length > 0;
              });
              setTimeout(() => {
                return this.localObserver.publish("searchComplete");
              }, 500);
              if (callback) callback(jsonResults);
            })
            .catch(parseErrors => {});
        })
        .catch(responseErrors => {});
    }, 200);
  }

  doSearch(v) {
    if (v.length <= 3) return null;
    this.search(v, d => {
      const numHits = this.getNumberOfResults(d);
      if (numHits < 1) {
        this.localObserver.publish(
          "markisErrorEvent",
          "Det finns ingen gällande avtalsyta för: " + v
        );
        this.highlightImpact(d);
      } else {
        this.highlightImpact(d);
        this.localObserver.publish(
          "markisSearchComplete",
          "Avtalsytor kopplade till " + v + " är markerade i rött"
        );
      }
    });
  }

  getNumberOfResults = result => {
    return result.reduce((accumulated, result) => {
      return accumulated + result.features.length;
    }, 0);
  };

  highlightImpact(result) {
    const olFeatures = new GeoJSON().readFeatures(result[0]);
    this.searchResultLayer.getSource().addFeatures(olFeatures);
    const extent = this.searchResultLayer.getSource().getExtent();
    this.map.getView().fit(extent, this.map.getSize());
    this.searchResultLayer.setVisible(true);
  }
}

export default MarkisModel;
