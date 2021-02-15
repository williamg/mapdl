import fs from "fs";

export type Config = {
  width: number,
  height: number,
  zoom: number,
  scale: number,
  center: {
    lat: number,
    lng: number
  },
  options?: any
};

const DEFAULT_CONFIG: Config = {
  width: 640,
  height: 640,
  zoom: 1,
  scale: 1,
  center: {
    lat: 40.7128,
    lng: -74.0060
  }
};


export default function loadConfig (filepath: string): Config {
  const data = JSON.parse (fs.readFileSync (filepath, "utf-8"));

  // Notify the users of the unspecified keys that are being defaulted
  const missingKeys = Object.keys (DEFAULT_CONFIG).filter (k => data[k] === undefined);

  if (missingKeys.length > 0)
    console.log (`The following keys were unspecified and are being defaulted: ${missingKeys.join(", ")}`);

  const config = {
    width: data.width || DEFAULT_CONFIG.width,
    height: data.height || DEFAULT_CONFIG.height,
    zoom: data.zoom || DEFAULT_CONFIG.zoom,
    scale: data.scale || DEFAULT_CONFIG.scale,
    center: data.center || DEFAULT_CONFIG.center,
    options: data.options
  };

  return config;
}

