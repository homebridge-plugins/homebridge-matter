import type { API, Logging, MatterAccessory, PlatformConfig } from 'homebridge'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MatterPlatform } from './platform.js'
import { PLATFORM_NAME } from './settings.js'

// One shared ordered record of everything that happened, so a test can assert
// that the section heading was logged BEFORE the devices under it were built.
// Getting that order wrong is the easy mistake here — see registerSection().
const { events, fakeDevice } = vi.hoisted(() => {
  const events: string[] = []

  const fakeDevice = (displayName: string) => class {
    constructor() {
      events.push(`construct:${displayName}`)
    }

    toAccessory() {
      return { displayName, UUID: `uuid-${displayName}` }
    }

    shutdown() {}
  }

  return { events, fakeDevice }
})

// The real accessory classes need the whole Matter API (device types, cluster
// enums, uuid) to construct. None of that is what this file is testing, so they
// are stubbed down to their display name and the fact that they were built.
vi.mock('./devices/index.js', () => ({
  AirQualitySensorAccessory: fakeDevice('Air Quality Sensor'),
  ColorTemperatureLightAccessory: fakeDevice('Colour Temperature Light'),
  ContactSensorAccessory: fakeDevice('Contact Sensor'),
  DimmableLightAccessory: fakeDevice('Dimmable Light'),
  DoorLockAccessory: fakeDevice('Door Lock'),
  ExtendedColorLightAccessory: fakeDevice('Extended Colour Light (HS+CCT)'),
  FanAccessory: fakeDevice('Fan'),
  GenericSwitchAccessory: fakeDevice('Generic Switch'),
  HumiditySensorAccessory: fakeDevice('Humidity Sensor'),
  LeakSensorAccessory: fakeDevice('Leak Sensor'),
  LightSensorAccessory: fakeDevice('Light Sensor'),
  OccupancySensorAccessory: fakeDevice('Occupancy Sensor'),
  OnOffLightAccessory: fakeDevice('On/Off Light'),
  OnOffOutletAccessory: fakeDevice('On/Off Outlet'),
  OnOffSwitchAccessory: fakeDevice('On/Off Switch'),
  PowerStripAccessory: fakeDevice('Power Strip'),
  RoboticVacuumAccessory: fakeDevice('Robot Vacuum'),
  SmokeCOAlarmAccessory: fakeDevice('Smoke Sensor'),
  TemperatureSensorAccessory: fakeDevice('Temperature Sensor'),
  ThermostatAccessory: fakeDevice('Thermostat'),
  VenetianBlindAccessory: fakeDevice('Venetian Blind (Tilt)'),
  WindowBlindAccessory: fakeDevice('Window Blind'),
}))

function createApi() {
  return {
    matter: {
      uuid: { generate: (value: string) => `uuid-${value}` },
      registerPlatformAccessories: vi.fn(),
      unregisterPlatformAccessories: vi.fn(),
    },
    isMatterAvailable: () => true,
    isMatterEnabled: () => true,
    on: vi.fn(),
  } as unknown as API
}

function createLog() {
  return {
    info: vi.fn((message: string) => {
      events.push(`log:${message}`)
    }),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
    success: vi.fn(),
    prefix: undefined,
  } as unknown as Logging
}

async function register(config: Record<string, unknown>) {
  const api = createApi()
  const log = createLog()
  const platform = new MatterPlatform(log, { platform: PLATFORM_NAME, ...config } as PlatformConfig, api)

  await (platform as unknown as { registerMatterAccessories: () => Promise<void> }).registerMatterAccessories()

  const registerAccessories = vi.mocked(api.matter!.registerPlatformAccessories)
  return {
    api,
    registered: registerAccessories.mock.calls.flatMap(call => (call[2] as MatterAccessory[]).map(a => a.displayName)),
    headings: events.filter(event => event.startsWith('log:Section ') || event === 'log:Custom Devices'),
  }
}

beforeEach(() => {
  events.length = 0
  vi.clearAllMocks()
})

describe('section headings', () => {
  // ⚠️ The heading used to print before the enabled check, so a user who had
  // (say) no HVAC and no custom devices got two three-line headings with
  // nothing underneath them - six lines of log saying nothing at all.
  it('only prints a heading for a section that has something in it', async () => {
    const { headings } = await register({ enableOnOffLight: true, enableRobotVacuum: true })

    expect(headings).toEqual([
      'log:Section 4: Lighting Devices (Matter Spec § 4)',
      'log:Section 12: Robotic Devices (Matter Spec § 12)',
    ])
  })

  it('prints no section headings at all when every device is disabled', async () => {
    const { headings, api } = await register({})

    expect(headings).toEqual([])
    expect(api.matter!.registerPlatformAccessories).not.toHaveBeenCalled()
  })

  // ⚠️ This is why the enabled check cannot simply move to the end: every
  // accessory constructor logs its own "initialized." line, and those belong
  // UNDER the heading. Build the list first and the log reads backwards.
  it('prints the heading before it builds the devices underneath it', async () => {
    await register({ enableOnOffLight: true, enableDimmableLight: true })

    expect(events.indexOf('log:Section 4: Lighting Devices (Matter Spec § 4)'))
      .toBeLessThan(events.indexOf('construct:On/Off Light'))
  })
})

describe('section contents', () => {
  it('registers the enabled devices in the order the section lists them', async () => {
    // Enabled here in the reverse of the section's own order, to pin that the
    // section table decides the order rather than the config object does.
    const { registered } = await register({ enableExtendedColourLight: true, enableOnOffLight: true })

    expect(registered).toEqual(['On/Off Light', 'Extended Colour Light (HS+CCT)'])
  })

  it('summarises the section with a count and one line per device', async () => {
    await register({ enableOnOffLight: true, enableDimmableLight: true })

    expect(events).toContain('log:✓ Registered 2 lighting device(s)')
    expect(events).toContain('log:  - On/Off Light')
    expect(events).toContain('log:  - Dimmable Light')
  })

  it('keeps the standalone note on the robot vacuum, which pairs as its own bridge', async () => {
    await register({ enableRobotVacuum: true })

    expect(events).toContain('log:  - Robot Vacuum (standalone for Apple Home compatibility)')
  })

  it('registers a device from every section when they are all enabled', async () => {
    const { registered, headings } = await register({
      enableOnOffLight: true,
      enableOnOffOutlet: true,
      enableOnOffSwitch: true,
      enableTemperatureSensor: true,
      enableDoorLock: true,
      enableThermostat: true,
      enableRobotVacuum: true,
      enablePowerStrip: true,
    })

    expect(headings).toHaveLength(8)
    expect(registered).toEqual([
      'On/Off Light',
      'On/Off Outlet',
      'On/Off Switch',
      'Temperature Sensor',
      'Door Lock',
      'Thermostat',
      'Robot Vacuum',
      'Power Strip',
    ])
  })
})
