(function(GeoJSON) {
  GeoJSON.version = '0.3.0';

  // Allow user to specify default parameters
  GeoJSON.defaults = {};

  // The one and only public function.
  // Converts an array of objects into a GeoJSON feature collection
  GeoJSON.parse = function(objects, params, callback) {

    var geojson = {"type": "FeatureCollection", "features": [{"type":"Feature","properties":{"stroke":"#ff0000","stroke-width":2,"stroke-opacity":1,"fill":"#fffa35","fill-opacity":0.5},"geometry":{"type":"Polygon","coordinates":[[[100.42278528213501,13.62782405563803],[100.42287647724152,13.627135886900318],[100.42362213134766,13.620817153019964],[100.4321837425232,13.619649315726937],[100.42776346206664,13.614247993233112],[100.43020963668823,13.61099462750847],[100.43259143829346,13.610723511678911],[100.43495178222656,13.604884018427313],[100.44370651245117,13.612162507530899],[100.45055150985718,13.608116612850647],[100.45926332473755,13.614018590705722],[100.47072172164917,13.625905519617927],[100.46636581420898,13.632244970646472],[100.46406984329224,13.631410842070306],[100.46355485916138,13.634038337112363],[100.46037912368774,13.633371039552692],[100.46057224273682,13.63180705351119],[100.45713901519775,13.631014629965005],[100.45570135116576,13.636728361282316],[100.4490065574646,13.645402959160082],[100.44439315795898,13.642087465390311],[100.44044494628906,13.637916966853302],[100.44411420822144,13.630993776677892],[100.43930768966675,13.629492335169607],[100.43686151504517,13.634789044613752],[100.4326343536377,13.637896114175545],[100.42671203613281,13.63316250867872],[100.42278528213501,13.62782405563803]]]}}]},
        settings = applyDefaults(params, this.defaults),
        propFunc;

    geomAttrs.length = 0; // Reset the list of geometry fields
    setGeom(settings);
    propFunc = getPropFunction(settings);

    objects.forEach(function(item){
      geojson.features.push(getFeature(item, settings, propFunc));
    });

    addOptionals(geojson, settings);

    if (callback && typeof callback === 'function') {
      callback(geojson);
    } else {
      return geojson;
    }
  };

  // Helper functions
  var geoms = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'],
      geomAttrs = [];

  // Adds default settings to user-specified params
  // Does not overwrite any settings--only adds defaults
  // the the user did not specify
  function applyDefaults(params, defaults) {
    var settings = params || {};

    for(var setting in defaults) {
      if(defaults.hasOwnProperty(setting) && !settings[setting]) {
        settings[setting] = defaults[setting];
      }
    }

    return settings;
  }

  // Adds the optional GeoJSON properties crs and bbox
  // if they have been specified
  function addOptionals(geojson, settings){
    if(settings.crs && checkCRS(settings.crs)) {
      geojson.crs = settings.crs;
    }
    if (settings.bbox) {
      geojson.bbox = settings.bbox;
    }
    if (settings.extraGlobal) {
      geojson.properties = {};
      for (var key in settings.extraGlobal) {
        geojson.properties[key] = settings.extraGlobal[key];
      }
    }
  }

  // Verify that the structure of CRS object is valid
  function checkCRS(crs) {
    if (crs.type === 'name') {
        if (crs.properties && crs.properties.name) {
            return true;
        } else {
            throw new Error('Invalid CRS. Properties must contain "name" key');
        }
    } else if (crs.type === 'link') {
        if (crs.properties && crs.properties.href && crs.properties.type) {
            return true;
        } else {
            throw new Error('Invalid CRS. Properties must contain "href" and "type" key');
        }
    } else {
        throw new Error('Invald CRS. Type attribute must be "name" or "link"');
    }
  }

  // Moves the user-specified geometry parameters
  // under the `geom` key in param for easier access
  function setGeom(params) {
    params.geom = {};

    for(var param in params) {
      if(params.hasOwnProperty(param) && geoms.indexOf(param) !== -1){
        params.geom[param] = params[param];
        delete params[param];
      }
    }

    setGeomAttrList(params.geom);
  }

  // Adds fields which contain geometry data
  // to geomAttrs. This list is used when adding
  // properties to the features so that no geometry
  // fields are added the properties key
  function setGeomAttrList(params) {
    for(var param in params) {
      if(params.hasOwnProperty(param)) {
        if(typeof params[param] === 'string') {
          geomAttrs.push(params[param]);
        } else if (typeof params[param] === 'object') { // Array of coordinates for Point
          geomAttrs.push(params[param][0]);
          geomAttrs.push(params[param][1]);
        }
      }
    }

    if(geomAttrs.length === 0) { throw new Error('No geometry attributes specified'); }
  }

  // Creates a feature object to be added
  // to the GeoJSON features array
  function getFeature(item, params, propFunc) {
    var feature = { "type": "Feature" };

    feature.geometry = buildGeom(item, params);
    feature.properties = propFunc.call(item);

    return feature;
  }

  // Assembles the `geometry` property
  // for the feature output
  function buildGeom(item, params) {
    var geom = {},
        attr;

    for(var gtype in params.geom) {
      var val = params.geom[gtype];

      // Geometry parameter specified as: {Point: 'coords'}
      if(item[val] && typeof val === 'string' && item.hasOwnProperty(val)) {
        geom.type = gtype;
        geom.coordinates = JSON.parse(item[val]);
      }

      // Geometry parameter specified as: {Point: ['lat', 'lng']}
      else if(Array.isArray(val) && item.hasOwnProperty(val[0]) && item.hasOwnProperty(val[1])){
        geom.type = gtype;
        geom.coordinates = [item[val[1]], item[val[0]]];
        //geom.coordinates = [Number(item[val[1]]), Number(item[val[0]])];
      }
    }

    return geom;
  }

  // Returns the function to be used to
  // build the properties object for each feature
  function getPropFunction(params) {
    var func;

    if(!params.exclude && !params.include) {
      func = function(properties) {
        for(var attr in this) {
          if(this.hasOwnProperty(attr) && (geomAttrs.indexOf(attr) === -1)) {
            properties[attr] = this[attr];
          }
        }
      };
    } else if(params.include) {
      func = function(properties) {
        params.include.forEach(function(attr){
          properties[attr] = this[attr];
        }, this);
      };
    } else if(params.exclude) {
      func = function(properties) {
        for(var attr in this) {
          if(this.hasOwnProperty(attr) && (geomAttrs.indexOf(attr) === -1) && (params.exclude.indexOf(attr) === -1)) {
            properties[attr] = this[attr];
          }
        }
      };
    }

    return function() {
      var properties = {};

      func.call(this, properties);

      if(params.extra) { addExtra(properties, params.extra); }
      return properties;
    };
  }

  // Adds data contained in the `extra`
  // parameter if it has been specified
  function addExtra(properties, extra) {
    for(var key in extra){
      if(extra.hasOwnProperty(key)) {
        properties[key] = extra[key];
      }
    }

    return properties;
  }

}(typeof module == 'object' ? module.exports : window.GeoJSON = {}));
