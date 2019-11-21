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
import { Stroke, Style, Circle, Fill, Icon } from "ol/style.js";
import { Draw } from "ol/interaction";
import X2JS from "x2js";
import { handleClick } from "../../models/Click.js";

const fetchConfig = {
  credentials: "same-origin"
};
var style = new Style({
  stroke: new Stroke({
    color: "rgba(244, 83, 63, 1)",
    width: 4
  }),
  fill: new Fill({
    color: "rgba(244, 83, 63, 0.2)"
  }),
  //Setting image in constructor to MarkerImage - this is default style
  image: new Circle({
    radius: 6,
    stroke: new Stroke({
      color: "rgba(0, 0, 0, 0.6)",
      width: 2
    })
  })
});

var drawStyle = new Style({
  stroke: new Stroke({
    color: "rgba(255, 214, 91, 0.6)",
    width: 4
  }),
  fill: new Fill({
    color: "rgba(255, 214, 91, 0.2)"
  }),
  image: new Circle({
    radius: 6,
    stroke: new Stroke({
      color: "rgba(255, 214, 91, 0.6)",
      width: 2
    })
  })
});

class MarkisModel {
  constructor(settings) {
    this.map = settings.map;
    this.app = settings.app;
    this.localObserver = settings.localObserver;
    this.hubUrl = settings.options.hubUrl;
    this.defaultStatus = settings.options.defaultStatus;
    this.defaultHandlopNr = settings.options.defaultHandlopNr;
    this.isConnected = false;
    this.connection = undefined;
    this.sources = settings.options.sources;
    this.estateLayerName = settings.options.estateLayerName;
    this.wfstSources = settings.options.wfstSources;
    this.editFeature = undefined;
    this.editSource = undefined;
    this.sourceName = undefined;
    this.geomCreated = false;
    this.markisParameters = {
      objectId: undefined,
      objectType: undefined,
      createdBy: undefined,
      objectState: "F"
    };
    this.editLayer = undefined;
    this.geometryName = "geom";
    this.wfsParser = new WFS();
    this.controllers = [];
    this.globalObserver = settings.globalObserver;
    this.vectorLayer = new VectorLayer({
      source: new VectorSource({}),
      style: () => {
        if (settings.options.markerImg && settings.options.markerImg !== "") {
          style.setImage(
            new Icon({
              src: settings.options.markerImg
            })
          );
        }
        return style;
      }
    });
    this.vectorLayer.set("type", "markisResultLayer");
    this.vectorLayer.set("queryable", true);
    this.drawSource = new VectorSource({ wrapX: false });
    this.drawLayer = new VectorLayer({
      source: this.drawSource,
      style: drawStyle
    });
    this.map.addLayer(this.vectorLayer);
    this.map.addLayer(this.drawLayer);
  }

  getMap() {
    return this.map;
  }

  getConnection() {
    return this.connection;
  }

  getSketchStyle() {
    return [
      new Style({
        fill: new Fill({
          color: "rgba(255, 255, 255, 0.5)"
        }),
        stroke: new Stroke({
          color: "rgba(0, 0, 0, 0.5)",
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

  setEditLayer(layerName, done) {
    this.wfstSource = this.wfstSources.find(
      wfstSource => wfstSource.layers[0] === layerName
    );
    // this.vectorSource = new VectorSource({
    //   loader: extent => this.loadData(this.wfstSource, extent, done),
    //   strategy: strategyAll,
    //   projection: this.wfstSource.projection
    // });
    this.vectorSource = new VectorSource({});
    this.editLayer = new Vector({
      source: this.vectorSource,
      style: this.getSketchStyle()
    });

    if (this.editLayer) {
      this.map.removeLayer(this.editLayer);
    }
    this.map.addLayer(this.editLayer);
    this.editSource = this.wfstSource;
    this.editFeature = null;
  }

  toggleLayer(layerName, visible) {
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
      foundLayer.setProperties({ visible: visible });
    }
  }

  refreshLayer(layerName) {
    var source,
      foundLayer = this.map
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
      source = foundLayer.getSource();
      source.changed();
      source.updateParams({ time: Date.now() });
      this.map.updateSize();
    }
  }

  getContractSource() {
    if (this.markisParameters.objectId.length === 10) {
      var prefix = this.markisParameters.objectId.slice(0, 2).toUpperCase();
      if (prefix.match(/^(AA|AB|AJ|AL|KI|AN)$/)) {
        return "fk.belastning.v1:arrende_nyttjanderatt";
      } else if (prefix.match(/^(EX|FV|MA|MR|OP)$/)) {
        return "fk.belastning.v1:avtal_special";
      } else if (prefix.match(/^(KN)$/)) {
        return "fk.belastning.v1:kommunal_nyttjanderatt";
      } else if (prefix.match(/^(LT)$/)) {
        return "fk.belastning.v1:trf_ledningsratt";
      } else if (prefix.match(/^(NB)$/)) {
        return "fk.belastning.v1:arrende_med_byggnad";
      } else if (prefix.match(/^(SE)$/)) {
        return "fk.belastning.v1:avtal_servitut";
      }
    }
  }

  //Only handles single select and is restricted to polygon and multipolygon atm
  onSelectFeatures = (evt, selectionDone, callback) => {
    handleClick(evt, evt.map, response => {
      this.vectorSource.clear();
      if (response.features.length > 0) {
        var geometryType = response.features[0].getGeometry().getType();

        if (
          geometryType === GeometryType.POLYGON ||
          geometryType === GeometryType.MULTI_POLYGON
        ) {
          if (response.features.length > 0) {
            this.editFeature = response.features[0];
            this.editFeature.modification = "added";
            this.vectorSource.addFeatures([this.editFeature]);
            this.geomCreated = true;
            this.localObserver.publish("editFeature", this.editFeature);
            this.activateEstateSelection(selectionDone, callback);
          }
        } else {
          this.editFeature = undefined;
          this.localObserver.publish("editFeature", this.editFeature);
          this.activateEstateSelection(selectionDone, callback);
        }
      } else {
        this.editFeature = undefined;
        this.localObserver.publish("editFeature", this.editFeature);
        this.activateEstateSelection(selectionDone, callback);
      }
    });
  };

  activateEstateSelection = (selectionDone, callback) => {
    this.map.once("singleclick", e => {
      this.onSelectFeatures(e, selectionDone, callback);
    });
  };

  loadDataSuccess = data => {
    var format = new WFS();
    var features;
    try {
      features = format.readFeatures(data);
    } catch (e) {
      alert("Fel: data kan inte läsas in. Kontrollera koordinatsystem.");
    }
    if (features.length > 0) {
      this.geometryName = features[0].getGeometryName();
    }
    this.vectorSource.addFeatures(features);
  };

  loadDataError = response => {
    alert("Fel: data kan inte hämtas. Försök igen senare.");
  };

  loadData(source, extent, done) {
    var url = this.urlFromObject(source.url, {
      service: "WFS",
      version: "1.1.0",
      request: "GetFeature",
      typename: source.layers[0],
      srsname: source.projection
    });
    fetch(url, fetchConfig)
      .then(response => {
        response.text().then(data => {
          this.loadDataSuccess(data);
        });
        if (done) done();
      })
      .catch(error => {
        this.loadDataError(error);
        if (done) done();
      });
  }

  activateAdd() {
    this.draw = new Draw({
      source: this.vectorSource,
      style: this.getSketchStyle(),
      type: GeometryType.POLYGON,
      geometryName: this.geometryName
    });
    this.draw.on("drawend", event => {
      event.feature.modification = "added";
      this.geomCreated = true;
      this.editAttributes(event.feature);
      this.setFeatureProperties();
      this.map.removeInteraction(this.draw);
    });
    this.map.addInteraction(this.draw);
  }

  setFeatureProperties() {
    this.editFeature.setProperties({
      [this.editSource.columnNames.contractId]: this.markisParameters.objectId,
      [this.editSource.columnNames.createdBy]: this.markisParameters.createdBy,
      [this.editSource.columnNames.regDate]: this.getTimeStampDate(),
      [this.editSource.columnNames.status]: this.defaultStatus,
      [this.editSource.columnNames.handlopnr]: this.defaultHandlopNr
    });
  }

  getTimeStampDate() {
    return new Date(new Date().toString().split("GMT")[0] + " UTC")
      .toISOString()
      .split(".")[0];
  }

  deActivateAdd() {
    this.map.removeInteraction(this.draw);
    this.editLayer.getSource().clear();
  }

  editAttributes(feature) {
    this.editFeature = feature;
    this.localObserver.publish("editFeature", feature);
  }

  urlFromObject(url, obj) {
    return Object.keys(obj).reduce((str, key, i, a) => {
      str = str + key + "=" + obj[key];
      if (i < a.length - 1) {
        str = str + "&";
      }
      return str;
    }, (url += "?"));
  }

  write(features) {
    var format = new WFS(),
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
    var str =
      typeof response !== "string"
        ? new XMLSerializer().serializeToString(response)
        : response;
    return new X2JS().xml2js(str);
  }

  transact(features, done) {
    var node = this.write(features),
      serializer = new XMLSerializer(),
      src = this.editSource,
      payload = node ? serializer.serializeToString(node) : undefined;
    if (payload.search("<geometry>")) {
      payload = payload.replace("<geometry>", "<geom>");
      payload = payload.replace("</geometry>", "</geom>");
    }

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

  save(done) {
    var find = mode =>
      this.vectorSource
        .getFeatures()
        .filter(feature => feature.modification === mode);

    var features = {
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

    this.transact(features, done);
  }

  clearSearchResult() {
    this.vectorLayer.getSource().clear();
  }

  reset() {
    Object.assign(this.markisParameters, {
      objectId: undefined,
      createdBy: undefined
    });
    this.sourceName = undefined;
    this.geomCreated = false;
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
      .catch(function() {});

    this.connection.on(
      "ShowContractFromMarkis",
      function(_, showMessage) {
        this.reset();
        this.localObserver.publish("toggleCreateButton", { enabled: false });
        var showObj = JSON.parse(showMessage);
        if (showObj.objectid) {
          this.localObserver.publish("toggleView", "visningsläge");
          this.localObserver.publish("updateContractInformation", {
            objectId: showObj.objectid,
            createdBy: ""
          });
          this.doSearch(showObj.objectid);
        } else {
          this.localObserver.publish(
            "markisErrorEvent",
            "Markis skickade ej giltligt avtalsnummer"
          );
        }
      }.bind(this)
    );

    this.connection.on(
      "CreateContractFromMarkis",
      function(_, createMessage) {
        this.reset();
        var createObject = JSON.parse(createMessage);
        if (createObject.objectid && createObject.userName) {
          Object.assign(this.markisParameters, {
            objectId: createObject.objectid,
            createdBy: createObject.userName
          });
          this.search(createObject.objectid, result => {
            if (this.getNumberOfResults(result) > 0) {
              this.localObserver.publish(
                "contractAlreadyExistsError",
                "Avtalet som du försöker skapa en ny geometri för finns redan!"
              );
              this.highlightImpact(result);
              this.localObserver.publish("toggleView", "visningsläge");
              this.localObserver.publish("updateContractInformation", {
                objectId: this.markisParameters.objectId,
                createdBy: this.markisParameters.createdBy
              });
              this.localObserver.publish("toggleCreateButton", {
                enabled: false
              });
            } else {
              this.vectorLayer.getSource().clear();
              this.sourceName = this.getContractSource();
              if (this.sourceName) {
                this.localObserver.publish("toggleView", "editeringsläge");
                this.localObserver.publish("updateContractInformation", {
                  objectId: this.markisParameters.objectId,
                  objectType: this.markisParameters.objectType
                });
                this.localObserver.publish("toggleCreateButton", {
                  enabled: true
                });
              } else {
                this.localObserver.publish(
                  "markisErrorEvent",
                  "Markis skickade ej giltligt avtalsnummer eller typ"
                );
              }
            }
          });
        } else {
          this.localObserver.publish(
            "markisErrorEvent",
            "Markis skickade ej giltligt avtalsnummer eller typ"
          );
        }
      }.bind(this)
    );
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
      this.vectorLayer.getSource().clear();
      var promises = [];
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
      var numHits = this.getNumberOfResults(d);
      if (numHits !== 1) {
        this.localObserver.publish(
          "markisErrorEvent",
          "Antal sökträffar från Markis: " + numHits
        );
        this.highlightImpact(d);
      } else {
        this.highlightImpact(d);
        this.localObserver.publish(
          "markisSearchComplete",
          "Sökbegreppet " + v + " hittades!"
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
    var olFeatures = new GeoJSON().readFeatures(result[0]);
    this.vectorLayer.getSource().addFeatures(olFeatures);
    var extent = this.vectorLayer.getSource().getExtent();
    this.map.getView().fit(extent, this.map.getSize());
    this.vectorLayer.setVisible(true);
  }
}

export default MarkisModel;
