import { Config } from "./config";
import { MAX_REQ_WIDTH, MAX_REQ_HEIGHT, FOOTER_HEIGHT } from "./constants";

const TILE_SIZE = 256;

/*
 * The coordinate of a pixel relative to the output image. This uses a coordinate frame in
 * which the top left corner of the output image is (0, 0) and the bottom right corner is
 * (width, height)
 */
export type RelPixelCoord = {
  x: number,
  y: number
};

/*
 * A coordinate on the global, in degrees
 */
export type GeoCoord = {
  lat: number,
  lng: number
};

/*
 * Defines the geometry of a request, and how this request fits into the final image
 */
export type ReqInfo = {
  center: GeoCoord,
  topLeft: RelPixelCoord,
}

/*
 * An absolute pixel coordinate. This is a global coordinate system (as in, defined over the
 * whole globe) with some fixed resolution for a particular zoom level
 */
type AbsPixelCoord = {
  x: number,
  y: number
}

/*
 * World coordinates, use as an intermediate step between pixel and geo coordinates.
 * Zoom invariant
 */
type WorldCoord = {
  x: number,
  y: number
};

/*
 * Determine all the requests to be made
 */
export function computeRequests (config: Config): ReqInfo[] {
  // Starting from the top-left -- (0, 0) in image space)
  const topLeft: RelPixelCoord = { x: 0, y: 0 };
  const requests = [];

  while (topLeft.x < config.width * config.scale) {
    topLeft.y = 0;
    const centerPxX = topLeft.x + config.scale * MAX_REQ_WIDTH / 2;

    while (topLeft.y < config.scale * config.height) {
      const centerPxY = topLeft.y + config.scale * MAX_REQ_HEIGHT / 2;
      const centerRelPx = { x: centerPxX, y: centerPxY };
      const centerGeo = worldToGeo(pixelToWorld (pixelRelToAbs (centerRelPx, config), config.zoom));

      requests.push({ center: centerGeo, topLeft: {...topLeft}});

      topLeft.y += config.scale * MAX_REQ_HEIGHT - FOOTER_HEIGHT;
    }

    topLeft.x += config.scale * MAX_REQ_WIDTH;
  }

  return requests;
}

function geoToWorld (geo: GeoCoord): WorldCoord {
  let siny = Math.sin((geo.lat * Math.PI) / 180);

  // Truncating to 0.9999 effectively limits latitude to 89.189. This is
  // about a third of a tile past the edge of the world tile.
  siny = Math.min(Math.max(siny, -0.9999), 0.9999);

  return {
    x: TILE_SIZE * (0.5 + geo.lng / 360),
    y: TILE_SIZE * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
  };
}

function worldToAbsPixel (w: WorldCoord, zoom: number): AbsPixelCoord {
  const scale = 1 << zoom;
  return {
    x: w.x * scale,
    y: w.y * scale
  };
}

function pixelRelToAbs (px: RelPixelCoord, config: Config): AbsPixelCoord {
  // Compute absolute pixel center
  const centerAbsPx = worldToAbsPixel(geoToWorld(config.center), config.zoom);
  const dx = (px.x / config.scale) - (config.width / 2);
  const dy = (px.y / config.scale) - (config.height / 2);

  return {
    x: centerAbsPx.x + dx,
    y: centerAbsPx.y + dy,
  };
}

function pixelToWorld (px: AbsPixelCoord, zoom: number): WorldCoord {
  const scale = 1 << zoom;
  const wx = px.x / scale;
  const wy = px.y / scale;

  return { x: wx, y: wy };
}

function worldToGeo (w: WorldCoord): GeoCoord {
  const lng = 360 * ((w.x / TILE_SIZE) - 0.5);
  const lat = -180 * Math.asin(1 - 2 / (1 + Math.exp ( 4 * Math.PI * ((w.y / TILE_SIZE) - 0.5)))) / Math.PI;
  return { lat, lng };
}


