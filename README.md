![mapdl](https://i.imgur.com/US08S5m.png)

# :world_map: mapdl
`mapdl` lets you download high-resolution static maps from Google featuring pins, paths, and arbitrary styling. Here's a [4000x4000 image](https://i.imgur.com/MJyNwha.png) generated with `mapdl`.

Google provides a nice static map API which allows you to download static images of maps, as opposed to the typical interactive widget. However, this API only allows you to download maps with a maximum size of 640x640 (depending on scaling). If you need more than that, they suggest that you:

> ..contact the support team and provide the following information:
>
>   1. Your use case and why you need large size images.
>   2. Whether you considered using other Google Maps Platform APIs (Maps JavaScript API, Maps Embed API, Maps SDK for Android, or Maps SDK for iOS) and why don't they meet your needs.
>   3. Screenshots, mocks, or samples of how you will use large size images.
>   4. Your estimated monthly usage for large size images.
>   
> We will review your request based on the information you provide and determine if your use case complies with Google Maps Platform Terms of Service.
> The maximum size we can provide is 2048 x 2048 pixels.

There's now another option! Use `mapdl`. Why would you need more than the generous 640x640 Google provides?

- Maps can make cool background/desktop images and my monitor is bigger than 640x640 pixels
- Maps make cool things to hang on walls, which typically require high-resolution graphics
- Probably plenty more reasons!

`mapdl` provides arbitrarily-sized maps by stitching together the small sections that Google provides. Due to the spherical nature of the Earth, results will likely degrade in quality at a certain resolution, but it's been plenty suitable for my use cases thus far.

## :arrow_down: Install

`mapdl` is available via npm: `# npm install -g @williamg/mapdl`

## :question: Usage
```
mapdl <config> [-o map.png]

Download a map

Positionals:
  config  Path to JSON configuration file                               [string]

Options:
      --version  Show version number                                   [boolean]
  -o, --outfile  Output file location                       [default: "map.png"]
      --help     Show help                                             [boolean]
```
`mapdl` is configured via a JSON file, the format of which is detailed in the following section. `mapdl` does leverage the Google Maps API, so you'll need to [grab an API key](https://developers.google.com/maps/) before you can do anything with `mapdl`

### :gear: Configuration
In general, the configuration options  for `mapdl` map 1-to-1 with the parameters supported by the [Google Static Maps API](https://developers.google.com/maps/documentation/maps-static/overview), so refer to that documentation for additional details.

The below is a sample configuration file:
```
{
  "width": 1000,
  "height": 1000,
  "zoom": 12,
  "scale": 2,
  "center": {
    "lat": 40.7,
    "lng": -73.977617
  },
  "options": {
    "markers": [],
    "path": [],
    "key": "API_KEY_HERE",
    "style": []
  }
}
```

All parameters are optional and will default as specified below if not set (note the `key` parameter in `options` is required).

- `width`: Width of the output image in pixels (default: 640px)
- `height`: Height of the output image in pixels  (default: 640px)
- `zoom`: Zoom level (default: 1)
- `scale`: Scale factor (default: 1)
- `center`: Center location coordinates in degrees (default: (40.7128, -74.0060))

Anything in options will be appended to all queries made to Google's api in the form `&key=value`, except for `style`, `markers`, and `path` which are handled specially as described below.

#### Style
The style parameter allows you to specify a custom look-and-feel for your map beyond the default Google Map style. The format is exactly the same as what is provided by [Google's Map Styling Wizard](https://mapstyle.withgoogle.com/), but is summarized briefly below:
```
style: [
   {
       "featureType": "...",
       "elementType": "...",
       "stylers": [
           "rule": "value"
       ]
   },
   ...
]
```
Feature type and element type are optional. Colors should be formatted as CSS strings (`#XXXXXX`); For full details on style options, see [Google's Documentation](https://developers.google.com/maps/documentation/maps-static/styling).

Note that it's also possible to use Google's [cloud-based styling](https://developers.google.com/maps/documentation/maps-static/cloud-based-map-styling) by omitting the style parameter and specifying a `map_id` in `options` instead.

#### Markers
`mapdl` has full support for markers. Both "default" markers and customer markers are supported, as shown below:
```
"markers": [
    {
        "icon": "https://....",
        "anchor": "top"
        "locations": [
            "New York, NY"
        ]
    },
    {
        "size": "small",
        "color": "#00FF00",
        "label": "A",
        "locations": [
            { "lat": 40.7, "lng": -73.97 }
        ]
    }
]
```
For custom icons, only the `icon` option is required. For styled icons, none of the style options are required. Locations can be specified with addresses or coordinates. For more details on each of the parameters, refer to the [Marker Section](https://developers.google.com/maps/documentation/maps-static/start#Markers) of the API specification.

#### Paths
`mapdl` has full support for paths. Paths are described as shown below:
```
"path": [
    {
        "weight": 4,
        "color": "#FFFFFF",
        "fillcolor": "#FFFFFF",
        "geodesic": true,
        "locations": [
            "New York, NY",
            { "lat": 40.7, "lng": -73.97 }
        ]
    }
]
```
All of the arguments other than `locations` are optional. For details and default values, refer to the [Paths Section](https://developers.google.com/maps/documentation/maps-static/start#Paths) of the API specification.

## :wave: Contributing
Pull requests are welcome! Below are some features that I haven't yet implemented:
- Implicit sizing based on paths/markers/visibility
- Custom output file formats

## License
`mapdl` is released under the MIT license.
