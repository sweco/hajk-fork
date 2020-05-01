import { WFS } from "ol/format";
import GeometryType from "ol/geom/GeometryType";
import IsLike from "ol/format/filter/IsLike";
import Intersects from "ol/format/filter/Intersects";
import Or from "ol/format/filter/Or";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { handleClick } from "../../models/Click.js";
import { Feature } from "ol";
import X2JS from "x2js";
import { buffer } from "ol/extent";
import Vector from "ol/layer/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { arraySort } from "./../../utils/ArraySort.js";
import { Draw } from "ol/interaction";
import { Modify } from "ol/interaction.js";
import Collection from "ol/Collection.js";
import {
  getSearchResultStyle,
  getDrawStyle,
  getHighlightStyle,
  getHiddenStyle
} from "./utils/FeatureStyle.js";

export default class ParkingModel {
  constructor(settings) {
    this.map = settings.map;
    this.app = settings.app;
    this.localObserver = settings.localObserver;
    this.geometryName = "geom";
    this.wfsParser = new WFS();
    this.controllers = [];
    this.featureIdCounter = 1;
    this.controllers = [];
    this.vectorSource = new VectorSource({});
    this.editLayer = new Vector({
      source: this.vectorSource,
      style: getDrawStyle
    });
    this.editSource = undefined;
    this.map.addLayer(this.editLayer);
    this.layerNames = settings.options.layerNames;
    this.wfstSources = settings.options.wfstSources;
    this.sources = settings.options.wfsSources;

    this.localObserver.subscribe("activateLayer", layerName => {
      this.toggleLayerVisibility([layerName], true);
    });
  }

  toggleLayerVisibility(layerNames, visible) {
    layerNames.forEach(layerName => {
      const foundLayer = this.getLayer(layerName);
      if (foundLayer) {
        foundLayer.setProperties({ visible: visible });
      }
    });
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

  getMap() {
    return this.map;
  }

  reset() {
    this.resetEditFeatureId();
    this.editLayer.getSource().clear();
    this.removeInteractions();
    this.editSource = undefined;
  }

  removeInteractions() {
    if (this.draw) {
      this.map.removeInteraction(this.draw);
    }
    if (this.edit) {
      this.map.removeInteraction(this.edit);
    }
    this.map.un("singleclick", this.onSelectFeatures);
  }

  activateAttributeEditor(layerName) {
    this.setEditSource(layerName);
    this.map.on("singleclick", this.onSelectFeatures);
  }

  onSelectFeatures = evt => {
    handleClick(evt, evt.map, response => {
      if (response.features.length === 1) {
        this.editLayer.getSource().clear();
        const selectedFeature = response.features[0];
        console.log("selectedFeature", selectedFeature);
        selectedFeature.setGeometryName(this.geometryName);
        //selectedFeature.setGeometry(selectedFeature.getGeometry());
        selectedFeature.modification = "updated";
        selectedFeature.setId(this.featureIdCounter);
        selectedFeature.setStyle(getDrawStyle());
        this.editFeatureId = this.featureIdCounter;
        this.featureIdCounter++;
        console.log("selectedFeature", selectedFeature);
        this.editLayer.getSource().addFeature(selectedFeature);
        this.localObserver.publish("feature-added");
      }
    });
  };

  activateEditTool() {
    let features = new Collection();
    this.editLayer
      .getSource()
      .getFeatures()
      .forEach(feature => {
        feature.modification = "updated";
        features.push(feature);
      });
    this.edit = new Modify({ features: features });
    this.map.addInteraction(this.edit);
  }

  activateDraw() {
    this.draw = new Draw({
      source: this.vectorSource,
      type: "Polygon",
      style: getDrawStyle(),
      geometryName: this.geometryName
    });

    this.draw.on("drawend", event => {
      this.handleDrawEnd(event);
    });

    this.map.addInteraction(this.draw);
  }

  activateParkingAreaCreation() {
    this.activateDraw();
    this.setEditSource(this.layerNames["overvakningsomraden"]);
  }

  activateParkingAreaEditing() {
    this.activateEditTool();
    this.setEditSource(this.layerNames["overvakningsomraden"]);
  }

  deActivateParkingAreaCreation() {
    this.reset();
  }

  handleDrawEnd = event => {
    event.feature.modification = "added";
    event.feature.setId(this.featureIdCounter);
    this.editFeatureId = this.featureIdCounter;
    this.featureIdCounter++;
    this.localObserver.publish("feature-added");
  };

  resetEditFeatureId() {
    this.editFeatureId = undefined;
    this.localObserver.publish("edit-feature-reset");
  }

  disableDraw() {
    if (this.draw) {
      this.map.removeInteraction(this.draw);
    }
    this.reset();
  }

  lookUp(source, searchInput) {
    const projCode = this.map
      .getView()
      .getProjection()
      .getCode();

    var isLikeFilters = source.searchFields.map(searchField => {
      return new IsLike(
        searchField,
        searchInput,
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
        "Content-Type": "application/json"
      },
      body: xmlString
    };
    const promise = fetch(
      this.app.config.appConfig.searchProxy + source.url,
      request
    );

    return { promise, controller };
  }

  search(searchInput, source, callback) {
    this.timeout = setTimeout(() => {
      let promises = [];
      this.controllers.splice(0, this.controllers.length);

      if (source) {
        const { promise, controller } = this.lookUp(source, searchInput);
        promises.push(promise);
        this.controllers.push(controller);
      } else {
        this.sources.forEach(source => {
          const { promise, controller } = this.lookUp(source, searchInput);
          promises.push(promise);
          this.controllers.push(controller);
        });
      }
      Promise.all(promises)
        .then(responses => {
          console.log("responses, ", responses);
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

  checkIfGeometryExists(searchTerm, layerName) {
    if (searchTerm === "") {
      return;
    }
    const source = this.sources.find(
      source => source.layers[0] === this.layerNames[layerName]
    );
    this.search(searchTerm, source, d => {
      const numHits = this.getNumberOfResults(d);
      if (numHits > 0) {
        this.highlightImpact(d);
        this.localObserver.publish("featureExists", {});
      } else {
        this.localObserver.publish("messageEvent", {
          message: "Det finns inga parkeringsytor kopplade till det ID:et.",
          variant: "error",
          reset: true
        });
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
    this.editLayer.getSource().addFeatures(olFeatures);
    const extent = this.editLayer.getSource().getExtent();
    this.map.getView().fit(buffer(extent, 50), this.map.getSize());
    this.editLayer.setVisible(true);
  }

  deleteAllMarkedFeaturesInLayer(layerName) {
    this.setEditSource(layerName);
    this.editLayer.getSource().forEachFeature(feature => {
      feature.modification = "removed";
    });
    this.save(r => {
      console.log("r", r);
      this.refreshLayer(layerName);
      this.localObserver.publish("featuresRemoved", {});
    });
  }

  saveEditedFeatures() {
    console.log("i save");
    this.save(r => {
      console.log("Feature update result: ", r);
      this.refreshLayer(this.layerNames["overvakningsomraden"]);
      this.localObserver.publish("featuresAdded", {});
    });
  }

  saveCreatedParkingArea() {
    console.log(
      "features tidigare: ",
      this.editLayer.getSource().getFeatures()
    );
    const source = this.sources.find(
      source => source.layers[0] === this.layerNames["overvakningsomraden"]
    );
    let searchTerm = this.editLayer
      .getSource()
      .getFeatures()[0]
      .getProperties().parkeringsomradeid;
    this.search(searchTerm, source, d => {
      const numHits = this.getNumberOfResults(d);
      if (numHits > 0) {
        this.localObserver.publish("areaAlreadyExistsError", {});
      } else {
        console.log("i else!");
        console.log("features: ", this.editLayer.getSource().getFeatures());
        this.save(r => {
          console.log("Feature saved result: ", r);
          this.refreshLayer(this.layerNames["overvakningsomraden"]);
          this.localObserver.publish("featuresAdded", {});
        });
      }
    });
  }

  updateFeatureIds(features) {
    if (features.inserts.length > 0) {
      features.inserts.forEach(feature => {
        feature.setGeometryName(this.geometryName);
        feature.unset("bbox", true);
        feature.setId(undefined);
        if (feature.getProperties().id) {
          feature.unset("id", true);
        }
      });
    }
    if (features.deletes.length > 0) {
      features.deletes.forEach(feature => {
        feature.setGeometryName(this.geometryName);
        feature.unset("bbox", true);
        feature.setId(feature.getProperties().id);
      });
    }
    if (features.updates.length > 0) {
      features.updates.forEach(feature => {
        feature.setGeometryName(this.geometryName);
        feature.unset("bbox", true);
        feature.setId(feature.getProperties().id);
      });
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

  save(done) {
    const find = mode =>
      this.editLayer
        .getSource()
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
    this.editLayer.getSource().clear();
  }

  write(features) {
    console.log("features: ", features);
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

  setEditSource(layerName) {
    this.editSource = this.wfstSources.find(
      wfstSource => wfstSource.layers[0] === layerName
    );
  }

  transact(features, done) {
    let node = this.write(features),
      serializer = new XMLSerializer(),
      src = this.editSource,
      payload = node ? serializer.serializeToString(node) : undefined;
    //Quick fix for incorrect geometryname
    payload = payload.replace(new RegExp("<geometry>", "g"), "<geom>");
    payload = payload.replace(new RegExp("</geometry>", "g"), "</geom>");
    console.log("PAYLOAD: ", payload);
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
}
