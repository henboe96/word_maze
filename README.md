# City Driving Navigation Game

A 3D-style car navigation game where the player drives through a city from a behind-the-car perspective. The player must follow a route through streets and junctions to reach a goal destination.

The game shows the car from behind, similar to a classic driving game. The player drives forward through a city environment and must choose the correct turns at junctions. A city map helps the player understand the route and destination.

## Game concept

The player controls a car driving through a city. The city is made of roads, intersections, buildings, and landmarks. The goal is to navigate from a start position to a target destination by taking the correct turns at junctions.

The player can see:

- The car from behind
- The road ahead
- City buildings and streets
- Junctions and intersections
- A minimap or city map
- The goal location
- Navigation hints or route markers

## Core gameplay

1. The player starts at a fixed location in the city.
2. A goal destination is selected.
3. The player drives through streets toward the goal.
4. At junctions, the player must choose the correct direction.
5. Wrong turns may lead the player away from the goal.
6. The player wins when they reach the destination.

## Main features

- Behind-the-car driving camera
- Keyboard controls for steering, acceleration, and braking
- City road network with junctions
- Map or minimap of the city
- Start and goal positions
- Route/navigation challenge
- Image checkpoints (star, pizza, etc.) that must be collected in order; the next
  one is shown in a HUD badge and starts pulsing if ignored for 10 seconds
- Win condition when reaching the goal
- Optional timer or score system

## Controls

Suggested controls:

- `W` or `Arrow Up`: Accelerate
- `S` or `Arrow Down`: Brake / reverse
- `A` or `Arrow Left`: Turn left
- `D` or `Arrow Right`: Turn right
- `M`: Toggle map
- `R`: Restart level (regenerates a new random road layout, buildings, checkpoints, and trees)

## Project goal

The goal of this project is to create a fun, simple driving/navigation game that focuses on choosing the correct route through a city rather than realistic racing simulation.

## Tech stack
React + TypeScript + Vite
No database.

## Setup

```bash
npm install
```

## Run locally

```bash
npm run dev
```

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
