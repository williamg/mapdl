#!/usr/bin/env node

import yargs from "yargs";
import Jimp from "jimp";
import axios from "axios";

import loadConfig from "./config";
import { FOOTER_HEIGHT } from "./constants";
import { computeRequests, RelPixelCoord } from "./geography";
import { buildQuery } from "./query";

async function requestImage (request: string): Promise<Jimp> {
  return await axios.get (request, {
    responseType: "arraybuffer"
  }).then (res => Jimp.read (res.data));
}

function stitchImages (coordTaggedImages: { img: Jimp, topLeft: RelPixelCoord }[], image: Jimp) {
  for (const taggedImage of coordTaggedImages) {
    const patch = taggedImage.img;
    const topLeft = taggedImage.topLeft;
    image.blit(patch, topLeft.x, topLeft.y, 0, 0, patch.bitmap.width, patch.bitmap.height - FOOTER_HEIGHT);
  }
}

async function downloadMap (configPath: string, out: string) {
  const config = (() => {
    try {
      return loadConfig (configPath);
    } catch (e) {
      console.error(`Error parsing config file: ${e}`);
      process.exit(1);
    }
  }) ();

  // Build the requests
  const requests = computeRequests (config);

  // Construct the query strings for each request. This can fail if the configuration is
  // malformed
  const queries = (() => {
    try {
      return requests.map(r => buildQuery (r.center, config));
    } catch (e) {
      console.error(`Error building queries: ${e}`);
      process.exit(2);
    }
  }) ();

  // Request all of the images
  const images = await (async () => {
    return await Promise.all (queries.map (requestImage)).catch (e => {
      console.error(`Error making requests: ${e}`);
      process.exit(3);
    });
  }) ();

  const coordTaggedImages = images.map((img, idx) => { return { img, topLeft: requests[idx].topLeft }; });
  const imgWidth = config.scale * config.width;
  const imgHeight = config.scale * config.height;

  new Jimp (imgWidth, imgHeight, (err: any, image: Jimp) => {
    if (err) {
      console.error(`Error creating output image: ${err}`);
      process.exit(2);
    }

    stitchImages (coordTaggedImages, image);
    image.write(out, (err: any) => {
      if (err) {
        console.error(`Error writing output image: ${err}`);
        process.exit(3);
      }
    });
  });
}

// Parse command line arguments
const args = yargs (process.argv.slice(2))
  .command("$0 <config> [-o map.png]", "Download a map", (yargs) => {
    yargs.positional("config", {
      describe: "Path to JSON configuration file",
      type: "string"
    })
  }, (argv) => { downloadMap (argv.config as string, argv.outfile as string); })
  .options ({
    "outfile": {
      alias: "o",
      describe: "Output file location",
      default: "map.png"
    }
  })
  .help()
  .argv;
