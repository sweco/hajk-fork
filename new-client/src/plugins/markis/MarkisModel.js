import * as signalR from "@microsoft/signalr";
import { WFS } from "ol/format";
import GeometryType from "ol/geom/GeometryType";
import IsLike from "ol/format/filter/IsLike";
import Or from "ol/format/filter/Or";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Vector from "ol/layer/Vector";
import Feature from "ol/Feature.js";
import GeoJSON from "ol/format/GeoJSON";
import { arraySort } from "./../../utils/ArraySort.js";
import { Stroke, Style, Circle, Fill, Icon } from "ol/style.js";
import { Draw } from "ol/interaction";
import X2JS from "x2js";
import { handleClick } from "../../models/Click.js";
import { Modify } from "ol/interaction.js";
import Collection from "ol/Collection.js";
import MultiPolygon from "ol/geom/MultiPolygon";

var style = new Style({
  stroke: new Stroke({
    color: "rgba(244, 83, 63, 1)",
    width: 4
  }),
  fill: new Fill({
    color: "rgba(244, 83, 63, 0.2)"
  })
});

class MarkisModel {
  constructor(settings) {
    this.map = settings.map;
    this.app = settings.app;
    this.localObserver = settings.localObserver;
    this.hubUrl = settings.options.hubUrl;
    this.isConnected = false;
    this.connection = undefined;
    this.sources = settings.options.sources;
    this.estateLayerName = settings.options.estateLayerName;
    this.wfstSources = settings.options.wfstSources;
    this.editFeature = undefined;
    this.editSource = undefined;
    this.sourceName = undefined;
    this.geomCollection = [];
    this.type = "Polygon";
    this.markisParameters = {
      objectId: undefined,
      objectSerial: undefined,
      objectStatus: undefined,
      createdBy: undefined
    };
    this.editLayer = undefined;
    this.createMethod = "abort";
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
    this.map.addLayer(this.vectorLayer);
    this.vectorLayer.set("type", "markisResultLayer");
    this.vectorLayer.set("queryable", true);
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

  setEditLayer(layerName, done) {
    this.wfstSource = this.wfstSources.find(
      wfstSource => wfstSource.layers[0] === layerName
    );
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

  //Only handles single layers
  getContractSource() {
    if (this.markisParameters.objectId.length === 10) {
      var prefix = this.markisParameters.objectId.slice(0, 2).toUpperCase();
      for (var i = 0; i < this.wfstSources.length; i++) {
        if (this.wfstSources[i].prefixes.indexOf(prefix) > -1) {
          return this.wfstSources[i].layers[0];
        }
      }
    }
  }

  //Only handles single select and is restricted to polygon and multipolygon atm
  onSelectFeatures = (evt, selectionDone, callback) => {
    handleClick(evt, evt.map, response => {
      if (response.features.length > 0) {
        var geometryType = response.features[0].getGeometry().getType();
        if (
          geometryType === GeometryType.POLYGON ||
          geometryType === GeometryType.MULTI_POLYGON
        ) {
          this.vectorSource.addFeatures(response.features);
          this.localObserver.publish("featureUpdate", this.vectorSource);
        }
      }
    });
  };

  activateEstateSelection = (selectionDone, callback) => {
    this.map.on("singleclick", e => {
      this.onSelectFeatures(e, selectionDone, callback);
    });
  };

  setFeatureProperties() {
    this.editFeature.setProperties({
      [this.editSource.columnNames.contractId]: this.markisParameters.objectId,
      [this.editSource.columnNames.createdBy]: this.markisParameters.createdBy,
      [this.editSource.columnNames.regDate]: this.getTimeStampDate(),
      [this.editSource.columnNames.status]: this.markisParameters.objectStatus,
      [this.editSource.columnNames.handlopnr]: this.markisParameters
        .objectSerial
    });
  }

  setType(type) {
    this.type = type;
    this.removeInteraction();
    this.addInteraction(type);
  }

  addInteraction() {
    this.draw = new Draw({
      source: this.vectorSource,
      type: this.type,
      style: this.getSketchStyle(),
      geometryName: this.geometryName
    });
    this.draw.on("drawend", this.handleDrawEnd);
    this.map.addInteraction(this.draw);
  }

  removeInteraction() {
    if (this.draw) {
      this.map.removeInteraction(this.draw);
    }
    if (this.edit) {
      this.map.removeInteraction(this.edit);
    }
    this.map.un("singleclick", this.removeSelected);
    this.map.un("singleclick", this.onSelectFeatures);
  }

  handleDrawEnd = event => {
    this.localObserver.publish("featureUpdate", this.vectorSource);
  };

  removeSelected = e => {
    this.map.forEachFeatureAtPixel(e.pixel, feature => {
      this.vectorSource.removeFeature(feature);
    });
    this.localObserver.publish("featureUpdate", this.vectorSource);
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
    if (method) {
      this.createMethod = method;
    }
    this.removeInteraction();

    if (this.createMethod === "remove") {
      this.map.on("singleclick", this.removeSelected);
    }

    if (this.createMethod === "add") {
      this.setType(this.type);
    }

    if (this.createMethod === "addEstate") {
      this.map.on("singleclick", this.onSelectFeatures);
    }

    if (this.createMethod === "edit") {
      this.setEditActive();
    }
  }

  getTimeStampDate() {
    return new Date(new Date().toString().split("GMT")[0] + " UTC")
      .toISOString()
      .split(".")[0];
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

  createEditFeature() {
    if (this.vectorSource.getFeatures) {
      var geomCollection = [];
      this.vectorSource.forEachFeature(feature => {
        geomCollection.push(feature.getGeometry());
      });
      this.editFeature = new Feature(new MultiPolygon(geomCollection));
    } else {
      this.editFeature = undefined;
    }
  }

  save(done) {
    var features = {
      updates: [undefined],
      inserts: [this.editFeature],
      deletes: [undefined]
    };

    if (features.inserts.length === 0) {
      return done();
    }
    this.setFeatureProperties();

    this.transact(features, done);
  }

  clearSearchResult() {
    this.vectorLayer.getSource().clear();
  }

  reset() {
    Object.assign(this.markisParameters, {
      objectId: undefined,
      objectSerial: undefined,
      objectStatus: undefined,
      createdBy: undefined,
      mode: "visningsläge"
    });
    this.sourceName = undefined;
  }

  updateMarkisParameters(message, mode) {
    if (message.contractId.length !== 10) {
      this.publishError("Avtalsnumret måste bestå av 10 tecken.", true);
      return false;
    } else if (
      isNaN(message.contractSerial) ||
      message.contractSerial === "0"
    ) {
      this.publishError(
        "Markis skickade inte ett giltligt händelselöpnummer.",
        true
      );
      return false;
    } else if (!message.userName) {
      this.publishError("Markis skickade inte ett giltligt anvädnarnamn", true);
      return false;
    } else if (
      ["F", "G"].indexOf(message.contractStatus.toUpperCase()) === -1
    ) {
      this.publishError(
        "Markis skickade inte ett giltligt status. (Status måste vara F eller G)",
        true
      );
      return false;
    } else {
      Object.assign(this.markisParameters, {
        objectId: message.contractId,
        objectSerial: message.contractSerial,
        objectStatus: message.contractStatus,
        createdBy: message.userName,
        mode: mode
      });
      return true;
    }
  }

  checkContractMeta(foundContract) {
    var foundSerial = foundContract.features[0].properties.handlopnr;
    if (foundSerial) {
      if (
        foundSerial >= this.markisParameters.objectSerial &&
        foundContract.features[0].properties.status === "G"
      ) {
        this.publishError(
          "Det finns en en avtalsyta med samma avtalsnummer och större eller samma händelselöpsnummer.",
          false
        );
      }
    } else {
      this.publishError(
        "Det finns en en avtalsyta med samma avtalsnummer men inget händelselöpsnummer.",
        false
      );
    }
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
          this.publishError(
            "Webbkartan kunde inte ansluta till MarkIS.",
            false
          );
        }.bind(this)
      );

    this.connection.on(
      "ShowContractFromMarkis",
      function(_, showMessage) {
        this.reset();
        var showObj = JSON.parse(showMessage);
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
        var createObject = JSON.parse(createMessage);
        if (this.updateMarkisParameters(createObject, "editeringsläge")) {
          this.search(this.markisParameters.objectId, result => {
            var numExistingContracts = this.getNumberOfResults(result);
            if (numExistingContracts > 0) {
              for (var i = 0; i < numExistingContracts; i++) {
                this.checkContractMeta(result[0]);
              }
              this.publishError(
                "Avtalet som du försöker skapa en ny geometri för finns redan!",
                false
              );
              this.highlightImpact(result);
              this.localObserver.publish("updateMarkisView", {});
            } else {
              this.vectorLayer.getSource().clear();
              this.sourceName = this.getContractSource();
              if (this.sourceName) {
                this.localObserver.publish("updateMarkisView", {});
              } else {
                this.publishError(
                  "Inget datalager hittades för avtalsprefixet. Kontakta systemadministratören.",
                  true
                );
              }
            }
          });
        }
      }.bind(this)
    );
  }

  publishError(message, reset) {
    this.localObserver.publish("markisErrorEvent", {
      message: message,
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
    var olFeatures = new GeoJSON().readFeatures(result[0]);
    this.vectorLayer.getSource().addFeatures(olFeatures);
    var extent = this.vectorLayer.getSource().getExtent();
    this.map.getView().fit(extent, this.map.getSize());
    this.vectorLayer.setVisible(true);
  }
}

export default MarkisModel;
