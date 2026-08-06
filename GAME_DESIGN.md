# Game Design Document

## Title

City Driving Navigation Game

## Short description

A third-person city driving game where the player must navigate through a city road network and choose the correct turns at junctions to reach a goal.

## Player fantasy

The player feels like they are driving through a city, reading the road and map, making decisions at intersections, and trying to reach the destination efficiently.

## Camera

The game uses a behind-the-car camera.

The camera should:

- Follow the player car smoothly
- Stay behind and slightly above the car
- Show the road ahead clearly
- Rotate with the car direction
- Make it easy to see upcoming junctions

## World

The world is a simplified city.

The city contains:

- Straight roads
- Junctions/intersections
- Turns
- Buildings
- Blocks
- Sidewalks or road boundaries
- Start point
- Goal point

The city does not need to be realistic at first. A simple grid-based city is acceptable for the prototype.

## Road network

The road network should be made of connected streets.

Possible road types:

- Straight road
- Left turn
- Right turn
- T-junction
- Cross intersection
- Dead end
- Goal road segment

Junctions are important because they create route choices.

## Core loop

1. Start level.
2. Player sees car, road, map, and goal.
3. Player drives forward.
4. Player reaches a junction.
5. Player chooses a turn.
6. Game continues until player reaches goal or gets lost.
7. Player wins by reaching the goal.

## Navigation challenge

The main challenge is not speed, but choosing the correct route.

The game can support:

- A highlighted route
- A minimap showing the city
- A destination marker
- Turn hints
- Wrong-way feedback
- Distance-to-goal indicator

For the first prototype, the map should clearly show:

- Player position
- Goal position
- Roads
- Current direction

## Win condition

The player wins when the car reaches the goal area.

The goal area can be represented by:

- A glowing marker
- A colored zone
- A flag
- A parking area
- A destination circle

When the player reaches the goal, show a win message.

Example:

```text
Destination reached!