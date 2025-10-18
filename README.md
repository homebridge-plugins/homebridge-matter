<p align="center">

<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

<span align="center">

# Homebridge Matter

</span>

### Customise Plugin

You can now start customising the plugin template to suit your requirements.

- [`src/platform.ts`](./src/platform.ts) - this is where your device setup and discovery should go.
- [`src/platformAccessory.ts`](./src/platformAccessory.ts) - this is where your accessory control logic should go, you can rename or create multiple instances of this file for each accessory type you need to implement as part of your platform plugin. You can refer to the [developer documentation](https://developers.homebridge.io/) to see what characteristics you need to implement for each service type.
- [`config.schema.json`](./config.schema.json) - update the config schema to match the config you expect from the user. See the [Plugin Config Schema Documentation](https://developers.homebridge.io/#/config-schema).

### Matter State Management Guide

**Important for Matter plugin developers:** Understanding how to manage accessory state is critical when working with Matter.

📖 **[Read the State Management Guide](./STATE_MANAGEMENT.md)** to learn:

- **Handlers** (Home app → Device) - How to respond when users control devices via Home app
- **State Updates** (Device → Home app) - How to sync state when devices change externally (native app, physical buttons, webhooks, etc.)
- Complete working examples for outlets, lights, and sensors
- Differences between Matter and HAP (HomeKit Accessory Protocol) patterns

**Quick Overview:**

```typescript
handlers: {
  onOff: {
    on: async () => {
      await yourDeviceAPI.turnOn()
    }
  }
}

// Pattern 2: Device changes externally → Update Home app
function handleExternalChange(newState: boolean) {
  this.api.updateMatterAccessoryState('device-uuid', 'onOff', {
    onOff: newState,
  })
}
```

See [`STATE_MANAGEMENT.md`](./STATE_MANAGEMENT.md) for complete details and examples.

