import * as t from "io-ts";
import { PathReporter } from "io-ts/PathReporter";
import { pipe } from "fp-ts/function";
import { fold } from "fp-ts/Either";

import { MAX_REQ_WIDTH, MAX_REQ_HEIGHT } from "./constants";
import { Config } from "./config";
import { GeoCoord } from "./geography";

const CoordinateCodec = t.type({
  lat: t.number,
  lng: t.number
});

const LocationCodec = t.union([CoordinateCodec, t.string]);

const StyleComponentCodec = t.type({
  featureType: t.union([t.undefined, t.string]),
  elementType: t.union([t.undefined, t.string]),
  stylers: t.array(t.any)
});

const StyleDefCodec = t.array(StyleComponentCodec);

type StyleComponent = t.TypeOf<typeof StyleComponentCodec>;
type StyleDef = t.TypeOf<typeof StyleDefCodec>;

const IconMarkerDefCodec = t.type({
  icon: t.string,
  anchor: t.union([t.undefined, t.keyof({
    top: null,
    bottom: null, 
    left: null,
    right: null,
    center: null,
    topleft: null,
    topright: null,
    bottomleft: null,
    bottomright: null
  })])
});

const StyledMarkerDefCodec = t.partial({
  size: t.keyof({ tiny: null, mid: null, small: null }),
  color: t.string,
  label: t.string
});

const MarkerStyleDefCodec = t.union([t.undefined, IconMarkerDefCodec, StyledMarkerDefCodec]);

const MarkerDefCodec = t.type({
  style: MarkerStyleDefCodec,
  locations: t.array(LocationCodec)
});

const MarkersCodec = t.array(MarkerDefCodec);

const PathCodec = t.intersection([ t.partial ({
  weight: t.number,
  color: t.string,
  fillcolor: t.string,
  geodesic: t.boolean
}), t.type ({
  locations: t.array(LocationCodec)
})]);

const PathsCodec = t.array(PathCodec);

const labelRegex = new RegExp("^[A-Z0-9]$");

type Coordinate = t.TypeOf<typeof CoordinateCodec>;
type Location = t.TypeOf<typeof LocationCodec>;
type IconMarkerDef = t.TypeOf<typeof IconMarkerDefCodec>;
type StyledMarkerDef = t.TypeOf<typeof StyledMarkerDefCodec>;
type MarkerStyleDef = t.TypeOf<typeof MarkerStyleDefCodec>;
type MarkerDef = t.TypeOf<typeof MarkerDefCodec>;
type Path = t.TypeOf<typeof PathCodec>;

function isCoordinate (location: Location): location is Coordinate {
  return typeof location !== "string";
}

function isIconType (style: MarkerStyleDef): style is IconMarkerDef {
  return (style as IconMarkerDef).icon !== undefined;
}

function isStyledType (style: MarkerStyleDef): style is StyledMarkerDef {
  return (style as IconMarkerDef).icon === undefined;
}

function locationToString (location: Location): string {
  if (isCoordinate (location)) {
    return `${location.lat},${location.lng}`;
  }

  return location;
}

function kvpString (key: string, value: string, omitDelimeter?: boolean) {
  let res = `${key}:${value}`;

  if (! omitDelimeter)
    res += "|";

  return res;
}

function optionalArgument (key: string, value: string | undefined): string {
  if (! value)
    return "";

  return kvpString(key, value);
}

function serializeStyleComponent (comp: StyleComponent): string {
  let result = "";

  result += optionalArgument ("feature", comp.featureType);
  result += optionalArgument ("element", comp.elementType);

  for (const styler of comp.stylers) {
    const ruleStrings = Object.keys(styler).map(k => { return kvpString(k, styler[k], true); });
    result += ruleStrings.join("|");
  }

  return result;
}

function serializeMarker (def: MarkerDef): string {
  let result = "";
  const style = def.style;

  if (style && isIconType(style)) {
    result += kvpString("icon", style.icon);
    result += optionalArgument("anchor", style.anchor);
  } else if (style && isStyledType(style)) {
    result += optionalArgument("size", style.size);
    result += optionalArgument("color", style.color);

    if (style.label) {
      if (! labelRegex.test(style.label)) {
        throw new Error("Marker label must be a single upper-case letter or digit");
      }

      result += kvpString("label", style.label);
    }
  }

  const locationStrings = def.locations.map(locationToString);
  result += locationStrings.join("|");
  return result;
}

function serializePath (path: Path): string {
  let result = "";
  result += optionalArgument ("weight", `${path.weight}`);
  result += optionalArgument ("color", path.color);
  result += optionalArgument ("fillcolor", path.fillcolor);
  result += optionalArgument ("geodesic", `${path.geodesic}`);

  const locationStrings = path.locations.map(locationToString);
  result += locationStrings.join("|");

  return result;
}

function buildParams<A, O, I> (paramName: string, data: any, codec: t.Type<A[], O, I>, mapper: (t: A) => string) {
  const sanitizedMapper = (t: A) => {
    let res = mapper (t);
    res = res.replace("color:#", "color:0x");
    return encodeURI (res);
  };

  const result = codec.decode(data);
  const decodedResult = pipe(
    result,
    fold(() => {
      throw Error(`Malformed ${paramName}: ${PathReporter.report(result)}`);
    }, x => x));
  const strings = decodedResult.map (x => { return `&${paramName}=${sanitizedMapper(x)}`;});
  return strings.join("");
}

export function buildQuery (point: GeoCoord, config: Config): string {
  let queryString = "https://maps.googleapis.com/maps/api/staticmap?";

  // Append zoom, center, and scale
  const lat = point.lat.toFixed(6);
  const lng = point.lng.toFixed(6);
  queryString += `center=${lat},${lng}&zoom=${config.zoom}&scale=${config.scale}`;

  // Always request the maximum size
  queryString += `&size=${MAX_REQ_WIDTH}x${MAX_REQ_HEIGHT}`;

  // Iterate over the options, appending them to the query
  for (const key in config.options) {
    // Special cases for style and markers
    if (key == "style")
      queryString += buildParams ("style", config.options["style"], StyleDefCodec, serializeStyleComponent);
    else if (key == "markers")
      queryString += buildParams ("markers", config.options["markers"], MarkersCodec, serializeMarker);
    else if (key == "path")
      queryString += buildParams ("path", config.options["path"], PathsCodec, serializePath);
    else
      queryString += `&${key}=${config.options[key]}`;
  }

  return queryString;
}


