import { WFS } from "ol/format";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style.js";
import IsLike from "ol/format/filter/IsLike";
import Or from "ol/format/filter/Or";
import VectorSource from "ol/source/Vector";
import { handleClick } from "../../models/Click.js";
import X2JS from "x2js";
import GeometryType from "ol/geom/GeometryType";
import { buffer } from "ol/extent";
import Vector from "ol/layer/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { arraySort } from "./../../utils/ArraySort.js";
import { Draw } from "ol/interaction";
import { Modify, Translate } from "ol/interaction.js";
import Collection from "ol/Collection.js";
import { getDrawStyle } from "./utils/FeatureStyle.js";
import Intersects from "ol/format/filter/Intersects";
import { Feature } from "ol";
import { LineString, Point, Polygon } from "ol/geom";

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
    this.numLots = 0;
    this.parkingAreaId = "";
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
    this.sketchStyle = [
      new Style({
        fill: new Fill({
          color: "rgba(255, 255, 255, 0.5)"
        }),
        stroke: new Stroke({
          color: "rgba(0, 0, 0, 0.5)",
          width: 4
        }),
        image: new CircleStyle({
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

  reset() {
    this.resetEditFeatureId();
    this.editLayer.getSource().clear();
    this.removeInteractions();
    this.editSource = undefined;
    this.numLots = 0;
    this.parkingCoordinates = [];
    this.startCoord = undefined;
  }

  removeInteractions() {
    if (this.draw) {
      this.map.removeInteraction(this.draw);
      this.draw = undefined;
    }
    if (this.edit) {
      this.map.removeInteraction(this.edit);
      this.edit = undefined;
    }
    if (this.move) {
      this.map.removeInteraction(this.move);
      this.move = undefined;
    }
    this.map.un("singleclick", this.onSelectFeatures);
    this.map.un("singleclick", this.onSelectPointFeatures);
    this.map.un("pointermove", this.generateParkingSpaces);
    this.map.un("singleclick", evt => {
      this.finishParkingSpaces();
    });
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
        selectedFeature.setGeometryName(this.geometryName);
        selectedFeature.modification = "updated";
        selectedFeature.setId(this.featureIdCounter);
        selectedFeature.setStyle(getDrawStyle());
        this.editFeatureId = this.featureIdCounter;
        this.featureIdCounter++;
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

  activateDraw(type) {
    this.draw = new Draw({
      source: this.vectorSource,
      type: type,
      style: getDrawStyle(),
      geometryName: this.geometryName
    });

    this.draw.on("drawend", event => {
      this.handleDrawEnd(event);
    });

    this.map.addInteraction(this.draw);
  }

  setMoveActive() {
    this.move = new Translate({
      features: this.editLayer.getSource().getFeaturesCollection()
    });
    this.map.addInteraction(this.move);
    this.map.on("singleclick", this.onSelectPointFeatures);
  }

  onSelectPointFeatures = evt => {
    handleClick(evt, evt.map, response => {
      response.features.forEach(feature => {
        const geometryType = feature.getGeometry().getType();
        if (geometryType === GeometryType.POINT) {
          feature.modification = "updated";
          this.editLayer.getSource().addFeature(feature);
          this.localObserver.publish("move-feature-added");
        }
      });
    });
  };

  activateParkingAreaCreation() {
    this.activateDraw("Polygon");
    this.setEditSource(this.layerNames["overvakningsomraden"]);
  }

  activateParkingAreaEditing() {
    this.activateEditTool();
    this.setEditSource(this.layerNames["overvakningsomraden"]);
  }

  deActivateParkingAreaCreation() {
    this.reset();
  }

  deActivateParkingSpaceCreation() {
    this.map.un("pointermove", this.generateParkingSpaces);
    this.reset();
  }

  activateSignPackageCreation() {
    this.activateDraw("Point");
    this.setEditSource(this.layerNames["skyltpaket"]);
  }

  activateMoveSignPackage() {
    this.setEditSource(this.layerNames["skyltpaket"]);
    if (!this.move) {
      this.setMoveActive();
    }
  }

  activateMoveSignPackageLabels() {
    this.setEditSource(this.layerNames["skyltpaket_etiketter"]);
    if (!this.move) {
      this.setMoveActive();
    }
  }

  acceptSignPackages() {
    this.removeInteractions();
    this.getPossibleAreaConnection(parkingAreaIds => {
      if (parkingAreaIds.every(val => val === parkingAreaIds[0])) {
        this.parkingAreaId = parkingAreaIds[0];
      }
      this.editLayer
        .getSource()
        .getFeatures()
        .forEach(feature => {
          feature.modification = "added";
          feature.setProperties({
            overvakningsomradeid: this.parkingAreaId
          });
        });
      this.localObserver.publish("sign-packages-added");
    });
  }

  getPossibleAreaConnection(callback) {
    let promises = [];
    let parkingAreaIds = [];
    const source = this.sources.find(
      source => source.layers[0] === this.layerNames["overvakningsomraden"]
    );

    this.editLayer
      .getSource()
      .getFeatures()
      .forEach(feature => {
        promises.push(this.lookupParkingArea(source, feature));
      });

    Promise.all(promises).then(parkingAreaCollections => {
      if (parkingAreaCollections) {
        parkingAreaCollections.forEach(parkingAreaCollection => {
          parkingAreaCollection.features.forEach(parkingArea => {
            parkingAreaIds.push(parkingArea.properties.overvakningsomradeid);
          });
        });
      }
      if (callback) callback(parkingAreaIds);
    });
  }

  lookupParkingArea(source, feature) {
    const projCode = this.map
      .getView()
      .getProjection()
      .getCode();

    const geometry = feature.getGeometry();

    const options = {
      featureTypes: source.layers,
      srsName: projCode,
      outputFormat: "JSON", //source.outputFormat,
      geometryName: source.geometryField,
      filter: new Intersects(source.geometryField, geometry, projCode)
    };

    const node = this.wfsParser.writeGetFeature(options);
    const xmlSerializer = new XMLSerializer();
    const xmlString = xmlSerializer.serializeToString(node);

    const request = {
      credentials: "same-origin",
      method: "POST",
      headers: {
        "Content-Type": "text/xml"
      },
      body: xmlString
    };

    return fetch(
      this.app.config.appConfig.searchProxy + source.url,
      request
    ).then(response => {
      return response.json();
    });
  }

  finishParkingSpaces() {
    this.map.un("pointermove", this.generateParkingSpaces);
    this.editLayer
      .getSource()
      .getFeatures()
      .forEach(feature => {
        feature.modification = "added";
      });
    this.localObserver.publish("parking-spaces-added");
    this.numLots = 0;
    this.parkingCoordinates = [];
    this.startCoord = undefined;
  }

  activateParkingSpaceCreation() {
    this.startCoord = undefined;
    this.parkingCoordinates = [];
    this.totalDistances = [];
    this.setEditSource(this.layerNames["parkeringsytor"]);
    this.map.once("singleclick", evt => {
      this.startCoord = evt.coordinate;
      this.parkingCoordinates.push(this.startCoord);
      this.map.once("singleclick", evt => {
        this.finishParkingSpaces();
      });
    });

    this.map.on("pointermove", this.generateParkingSpaces);
  }

  eqDistanceBetweenPoints(a1, a2) {
    var line = new LineString([a1, a2]);
    return Math.round(line.getLength() * 100) / 100;
  }

  getAngleBetweenPoints(a1, a2) {
    if (Math.abs(a2[0] - a1[0]) > 0) {
      var dx =
        Math.round(new LineString([a1, [a2[0], a1[1]]]).getLength() * 100) /
        100;
    }
    if (Math.abs(a2[1] - a1[1]) > 0) {
      var dy =
        Math.round(new LineString([a1, [a1[0], a2[1]]]).getLength() * 100) /
        100;
    }

    return Math.atan(dy / dx);
  }

  generateParkingSpaces = evt => {
    if (this.parkingCoordinates.length > 0) {
      this.totalDistances = this.totalDistances.slice(
        this.totalDistances.length - 1
      );
      var totalDistance = this.eqDistanceBetweenPoints(
        this.startCoord,
        evt.coordinate
      );
      this.totalDistances.push(totalDistance);
      var distanceFromLast = this.eqDistanceBetweenPoints(
        this.parkingCoordinates.slice(-1)[0],
        evt.coordinate
      );

      var angle = this.getAngleBetweenPoints(this.startCoord, evt.coordinate);

      if (this.totalDistances.length === 1 && distanceFromLast > 2.5) {
        this.editLayer.getSource().clear();
        this.parkingCoordinates.push(evt.coordinate);
        this.reDrawParkingSpaces(angle);
      } else if (
        this.totalDistances[0] < this.totalDistances[1] &&
        distanceFromLast > 2.5 &&
        this.numLots < Math.floor(totalDistance / 2.5)
      ) {
        this.editLayer.getSource().clear();
        this.parkingCoordinates.push(evt.coordinate);
        this.reDrawParkingSpaces(angle);
      } else if (
        this.totalDistances[0] > this.totalDistances[1] &&
        distanceFromLast > 2.5 &&
        this.numLots > Math.floor(totalDistance / 2.5)
      ) {
        this.editLayer.getSource().clear();
        this.parkingCoordinates.pop();
        this.reDrawParkingSpaces(angle);
      }
    }
  };

  reDrawParkingSpaces(angle) {
    var numLots = this.parkingCoordinates.length - 1;
    this.numLots = numLots;
    for (var i = 0; i < numLots; i++) {
      let p1 = new Point([
        this.parkingCoordinates[0][0] + Math.cos(angle) * i * 2.5,
        this.parkingCoordinates[0][1] + Math.sin(angle) * i * 2.5
      ]);
      let p1Coords = p1.getCoordinates();
      let p2 = new Point([
        p1Coords[0] + Math.cos(angle) * 1 * 2.5,
        p1Coords[1] + Math.sin(angle) * 1 * 2.5
      ]);
      let p2Coords = p2.getCoordinates();
      let p3 = new Point([p2Coords[0], p2Coords[1] + 5]);
      let p4 = new Point([p1Coords[0], p1Coords[1] + 5]);
      p3.rotate(angle, p2Coords);
      p4.rotate(angle, p1Coords);
      let geometry = new Polygon([
        [
          p1.getCoordinates(),
          p2.getCoordinates(),
          p3.getCoordinates(),
          p4.getCoordinates(),
          p1.getCoordinates()
        ]
      ]);
      var feature = new Feature({
        geometry: geometry
      });
      this.editLayer.getSource().addFeature(feature);
    }
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
        this.localObserver.publish("searched-area-highlighted", {});
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
      this.refreshLayer(layerName);
      this.localObserver.publish("parking-area-removed", {});
      this.localObserver.publish("messageEvent", {
        message: "Parkeringsområdet togs bort utan problem!",
        variant: "success"
      });
    });
  }

  saveEditedFeatures(layerName) {
    this.save(r => {
      this.refreshLayer(layerName);
      this.localObserver.publish("parking-area-saved", {});
      this.localObserver.publish("messageEvent", {
        message: "Uppdateringen sparades utan problem!",
        variant: "success"
      });
    });
  }

  saveCreatedParkingArea() {
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
        this.save(r => {
          this.refreshLayer(this.layerNames["overvakningsomraden"]);
          this.localObserver.publish("parking-area-saved", {});
          this.localObserver.publish("messageEvent", {
            message: "Parkeringsområdet skapades utan problem!",
            variant: "success"
          });
        });
      }
    });
  }

  saveCreatedSignPackages() {
    this.signPackageLabelConnection = this.getRandomArbitrary(
      99999,
      999999
    ).toString();
    this.editLayer
      .getSource()
      .getFeatures()
      .forEach(feature => {
        feature.setProperties({
          etikettid: this.signPackageLabelConnection
        });
      });
    this.save(r => {
      this.refreshLayer(this.layerNames["skyltpaket"]);
      this.localObserver.publish("sign-packages-saved", {});
      this.localObserver.publish("messageEvent", {
        message: "Skyltpaketet skapades utan problem!",
        variant: "success"
      });
    });
  }

  getRandomArbitrary(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  }

  createSignPackageLabel() {
    let labelFeatures = [];
    this.setEditSource(this.layerNames["skyltpaket_etiketter"]);

    this.editLayer
      .getSource()
      .getFeatures()
      .forEach(feature => {
        let labelPoint = new Point([
          feature.getGeometry().getCoordinates()[0] + 10,
          feature.getGeometry().getCoordinates()[1] + 10
        ]);
        let labelFeature = new Feature({
          geometry: labelPoint
        });
        labelFeatures.push(labelFeature);
      });

    this.editLayer.getSource().clear();
    labelFeatures.forEach(feature => {
      feature.modification = "added";
      feature.setProperties({
        skyltpaketid: this.signPackageLabelConnection,
        index: "10"
      });
      this.editLayer.getSource().addFeature(feature);
    });

    this.save(r => {
      this.refreshLayer(this.layerNames["skyltpaket_etiketter"]);
      this.localObserver.publish("sign-package-labels-saved", {});
      this.localObserver.publish("messageEvent", {
        message: "Etiketten skapades utan problem!",
        variant: "success"
      });
    });
  }

  saveCreatedParkingSpaces() {
    this.save(r => {
      this.refreshLayer(this.layerNames["parkeringsytor"]);
      this.localObserver.publish("parking-spaces-saved", {});
      this.localObserver.publish("messageEvent", {
        message: "Parkeringsytorna skapades utan problem!",
        variant: "success"
      });
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
