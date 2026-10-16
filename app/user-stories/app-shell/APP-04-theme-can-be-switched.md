# APP-04: Theme can be switched

**As a** user
**I want** to switch between a light and a dark theme
**so that** the app is comfortable to read in my surroundings.

## Acceptance criteria

- The header has a theme switch on every page. `AC-1`
- On a first visit, the theme follows the device's light/dark preference. `AC-2`
- In the light theme the switch shows ☾ and is announced as "Switch to dark theme"; in the dark theme it shows ☀ and is announced as "Switch to light theme". `AC-3`
- Using the switch changes the theme at once, without a reload. `AC-4`
- The chosen theme is kept on this device and applies on later visits, overriding the device preference. `AC-5`
- The page opens in the kept theme without first showing the other one. `AC-6`
- If storage is unavailable, the switch still works until the page is reloaded. `AC-7`

## Open questions

- Once a theme is chosen, there's no way back to following the device preference. Is a "system" option needed?
