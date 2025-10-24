<p align="center">
   <a href="https://github.com/homebridge-plugins/homebridge-matter"><img alt="Homebridge Verified" src="https://github.com/homebridge-plugins/homebridge-matter/blob/latest/plugin-header.png?raw=true" width="600px"></a>
</p>
<span align="center">

# homebridge-matter

Homebridge plugin to showcase examples of Matter devices in Homebridge.

[![npm](https://img.shields.io/npm/v/@homebridge-plugins/homebridge-matter/latest?label=latest)](https://www.npmjs.com/package/@homebridge-plugins/homebridge-matter)
[![npm](https://img.shields.io/npm/v/@homebridge-plugins/homebridge-matter/beta?label=beta)](https://github.com/homebridge-plugins/homebridge-matter/wiki/Beta-Version)

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

[![npm](https://img.shields.io/npm/dt/@homebridge-plugins/homebridge-matter)](https://www.npmjs.com/package/@homebridge-plugins/homebridge-matter)
[![Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=hb-discord)](https://discord.com/channels/432663330281226270/742733745743855627)

</span>

### Plugin Information

This plugin provides example implementations of Matter device types in Homebridge:

- **21+ Matter Device Types**: Complete implementations across all major Matter device categories
- **Demonstration & Testing**: Perfect for developers building Matter plugins or testing Matter integrations
- **Example Code Reference**: Clean, documented examples showing how to implement Matter devices in Homebridge
- **Apple Home Compatible**: Special support for devices like robotic vacuum cleaners that require dedicated bridges
- **Production Ready**: Built on the official Matter specification with proper cluster implementations

#### Supported Matter Device Types

**Section 4: Lighting Devices** (Matter Spec § 4) - 5 devices
- On/Off Light
- Dimmable Light
- Colour Temperature Light
- Colour Light (HS)
- Extended Colour Light (HS+CCT)

**Section 5: Smart Plugs/Actuators** (Matter Spec § 5) - 1 device
- On/Off Outlet

**Section 6: Switches & Controllers** (Matter Spec § 6) - 1 device
- On/Off Light Switch

**Section 7: Sensors** (Matter Spec § 7) - 7 devices
- Contact Sensor
- Light Sensor
- Motion Sensor (Occupancy)
- Temperature Sensor
- Humidity Sensor
- Smoke/CO Alarm
- Water Leak Detector

**Section 8: Closure Devices** (Matter Spec § 8) - 3 devices
- Door Lock
- Window Blind
- Venetian Blind (with Tilt)

**Section 9: HVAC** (Matter Spec § 9) - 2 devices
- Thermostat
- Fan

**Section 12: Robotic Devices** (Matter Spec § 12) - 1 device
- Robotic Vacuum Cleaner (published as an external accessory on a dedicated Matter bridge)

### Prerequisites

- To use this plugin, you will need to already have:
  - [Node](https://nodejs.org): latest version of `v20`, `v22` or `v24` - any other major version is not supported.
  - [Homebridge](https://homebridge.io): `>=2.0.0-alpha.66 <2.0.0-beta.0` - refer to link for more information and installation instructions.

### Help/About

- [Support Request](https://github.com/homebridge-plugins/homebridge-matter/issues/new/choose)
- [Changelog](https://github.com/homebridge-plugins/homebridge-matter/blob/latest/CHANGELOG.md)
- [About Me](https://github.com/sponsors/bwp91)

### Credits

- To the developers of [matter.js](https://github.com/matter-js/matter.js) who make the Matter integration possible.

### Disclaimer

- I am in no way affiliated with Matter and this plugin is a personal project that I maintain in my free time.
- Use this plugin entirely at your own risk - please see licence for more information.
