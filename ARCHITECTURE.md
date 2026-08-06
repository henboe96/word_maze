# Architecture

## Overview

The game is a city driving navigation game.

The main systems are:

- Game loop
- Player car control
- Camera system
- City/road layout
- Junction/navigation logic
- Map/minimap
- Goal detection
- UI/game state

## Main systems

### Game loop

The game loop updates the game state and renders the scene.

Responsibilities:

- Read player input
- Update car movement
- Update camera
- Check goal condition
- Render world
- Render UI/map

### Player car

The player car handles:

- Position
- Rotation/direction
- Speed
- Acceleration
- Braking
- Steering
- Collision state if implemented

The car should be controlled with keyboard input.

### Camera

The camera follows the car from behind.

Responsibilities:

- Stay behind the car
- Stay slightly above the car
- Smoothly follow car movement
- Rotate based on car direction
- Keep the road ahead visible

### City

The city is made of roads, junctions, and buildings.

For the prototype, the city can be represented with simple data structures, such as a grid or list of road segments.

Example city elements:

- Road segment
- Intersection
- Building block
- Start position
- Goal position

### Road network

The road network defines where the player can drive.

It should support:

- Straight roads
- Turns
- Junctions
- Connected routes
- Goal location

For the first version, roads can be simple rectangular areas.

### Navigation

Navigation logic determines whether the player is moving toward the goal.

Possible responsibilities:

- Store the correct route
- Detect when the player reaches a junction
- Detect wrong turns
- Show route hints
- Calculate distance to goal

### Map/minimap

The map shows a top-down view of the city.

The map should display:

- Roads
- Player position
- Player direction
- Goal position
- Optional route line

### Goal detection

The game should detect when the player reaches the destination.

The simplest implementation is a circular or rectangular goal zone. If the car enters the goal zone, the game enters a win state.

### UI

The UI can display:

- Timer
- Distance to goal
- Current objective
- Wrong turns
- Win message
- Restart instruction

## Suggested file organization

Example structure:

```text
src/
  main.*
  game/
    Game.*
    Input.*
    Car.*
    Camera.*
    City.*
    Roads.*
    Navigation.*
    Minimap.*
    UI.*
  assets/
  styles/