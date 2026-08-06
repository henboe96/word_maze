# Agent Instructions

## Project overview

This project is a city driving navigation game.

The player controls a car from a behind-the-car perspective and drives through a city road network. The main challenge is choosing the correct turns at junctions to reach a goal destination.

The game should feel like a simple car game with a third-person camera, city streets, intersections, buildings, and a map/minimap.

## Game vision

Create a playable prototype where:

- The player sees the car from behind.
- The car can drive along city roads.
- The city contains roads, junctions, and buildings.
- The player has a start point and a goal point.
- The player must navigate through the city by making correct turns.
- A map or minimap helps the player understand the route.
- The player wins when the car reaches the goal.

## Development priorities

Prioritize a working prototype over visual polish.

Build in this order:

1. Basic driving controls
2. Behind-the-car camera
3. Simple city road layout
4. Junctions and turns
5. Goal destination
6. Map/minimap
7. Win condition
8. Improved visuals and gameplay feedback

## Rules for AI assistants

- Make small, focused changes.
- Prefer simple and understandable code.
- Do not add unnecessary dependencies.
- Do not rewrite the entire project unless asked.
- Keep the game playable after each major change.
- If adding a feature, also explain how to test it.
- Preserve existing controls unless asked to change them.
- Prefer a simple prototype implementation before advanced realism.
- If something is unclear, make a reasonable assumption and mention it.

## Gameplay requirements

The game should include:

- A controllable car
- A third-person camera behind the car
- A city-like environment
- Roads and junctions
- A destination/goal
- A map or minimap
- A clear win condition

## Suggested controls

- `W` or `Arrow Up`: Accelerate
- `S` or `Arrow Down`: Brake / reverse
- `A` or `Arrow Left`: Turn left
- `D` or `Arrow Right`: Turn right
- `M`: Toggle map
- `R`: Restart level

## Game design principles

- Navigation should be the main challenge.
- Roads should be easy to understand.
- Junctions should offer meaningful choices.
- The goal should be visible on the map.
- The player should get feedback when going the right or wrong way.
- The first version should be simple and fun rather than realistic.

## Code style

- Keep code modular.
- Separate car controls, camera logic, city/map data, and game state where possible.
- Use clear names for variables and functions.
- Avoid over-engineering.
- Add comments for non-obvious math, movement, or camera logic.

## Definition of done

A task is complete when:

- The game still runs.
- The new feature can be tested by playing.
- Controls still work.
- The car, camera, roads, and goal behave as expected.
- Any important behavior changes are documented.

**Status:** the actual code is still the unmodified Vite starter template. `src/App.tsx` contains boilerplate to be replaced with the app described in `README.md`.

## How to work in this repo

- Make small, focused changes.
- Brake components into separate files
- Prefer simple, readable solutions.
- Do not add dependencies unless necessary.
- Ask before making large architectural changes.
- Preserve existing formatting and naming conventions.
- Update documentation when behavior changes.
- If something is unclear, state your assumption before proceeding.

## Commands

```bash
npm install        # install deps
npm run dev        # Vite dev server (HMR)
npm run lint       # ESLint (flat config)
npm run build      # typecheck (tsc -b) then vite build
npm run preview    # serve production build locally
```

Verification order when changing code: `npm run lint` then `npm run build` (build runs the typecheck). There is no test framework or test script configured.

## TypeScript constraints (require care)

`tsconfig.app.json` (`src/`) sets strict-ish options that trips up common patterns:
- `verbatimModuleSyntax` → use type-only imports (`import type { Foo }`) for anything used only as a type.
- `noUnusedLocals` / `noUnusedParameters` → unused vars/params are build errors, not warnings.
- `erasableSyntaxOnly` → no enums, namespaces, or `parameter properties` (constructor `public/private` params); use unions/plain classes instead.
- `allowImportingTsExtensions` + `noEmit` → import modules with `.tsx`/`.ts` extension (see `src/main.tsx` importing `./App.tsx`).

## Conventions / notes

- React Compiler is intentionally NOT enabled (README notes dev/build perf). Don't add it.
- ESLint flat config (`eslint.config.js`) uses recommended TS + `react-hooks` + `react-refresh(vite)` presets; no type-aware rules. Keep imports in `defineConfig([...])` array style.
- Editing `App.tsx` triggers HMR automatically via the dev server.
- `main.tsx` is the entrypoint: `createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)`.
- Public assets live in `public/` (referenced by absolute path, e.g. `/icons.svg`); app assets in `src/assets/` (imported). This is NOT a git repository.