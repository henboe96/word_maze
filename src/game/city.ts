import * as THREE from 'three'
import { vec2, type Vec2 } from './types'

export const GRID = 5
export const SPACING = 30
export const ROAD_HALF = 5
export const ROAD_WIDTH = ROAD_HALF * 2
export const GOAL_RADIUS = 4.5

const REMOVED_RATIO = 0.3
const TILE_RES = 2
const BUILDING_MARGIN = 1.5
const MAX_BUILDING_SPAN = 22

const TREE_RADIUS = 1.6
const TREE_SPACING = 6
const TREE_CELL_CHANCE = 0.03

const MILESTONE_SPHERE_RADIUS = 2.6
const MILESTONE_FLOAT_Y = 3.2
/** How many times the icon image tiles around/across the milestone sphere. */
const MILESTONE_TILE_X = 2
const MILESTONE_TILE_Y = 1

/** Images (from public/) used as milestone icons, cycled in order. */
export const MILESTONE_ASSETS = [
  { src: '/star.png', label: 'the star' },
  { src: '/pizza.png', label: 'the pizza' },
  { src: '/girl.png', label: 'the girl' },
  { src: '/polise.png', label: 'the police' },
]

/** Radius the car's collision circle is treated as. */
export const COLLISION_RADIUS = 1.2

/** World x of the i-th vertical road line (i in 0..GRID-1). */
export function intersectionX(i: number): number {
  return (i - (GRID - 1) / 2) * SPACING
}

/** World z of the j-th horizontal road line. */
export function intersectionZ(j: number): number {
  return (j - (GRID - 1) / 2) * SPACING
}

/** An axis-aligned obstacle: center plus half-extents in x and z. */
export interface Rect {
  x: number
  z: number
  halfX: number
  halfZ: number
}

/** A road segment between two junctions, for the minimap. */
export interface Segment {
  x1: number
  z1: number
  x2: number
  z2: number
}

export interface CityData {
  start: Vec2
  goal: Vec2
  /** Ordered checkpoints (from start toward goal) that must be reached first. */
  milestones: Vec2[]
  /** In-scene marker (billboard sprite) for each milestone; hidden when taken. */
  milestoneMarkers: THREE.Object3D[]
  /** Human heading for each milestone, used to tell the player what to find. */
  milestoneLabels: string[]
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  roads: Segment[]
  /** True if the circular footprint (x, z, radius) overlaps any road tile. */
  isOnRoad: (x: number, z: number, radius: number) => boolean
  /**
   * Push `pos` out of any building. Treats the car as a circle of `radius`.
   * Mutates `pos` in place and returns true if it hit something.
   */
  resolveCollision: (pos: Vec2, radius: number) => boolean
}

export function createCity(parent: THREE.Object3D): CityData {
  // Outset the bounds by half a road so the outer streets are fully drivable
  // (the car-position clamp and road raster otherwise stop at the centerline).
  const OUTSET = ROAD_HALF
  const minX = intersectionX(0) - OUTSET
  const maxX = intersectionX(GRID - 1) + OUTSET
  const minZ = intersectionZ(0) - OUTSET
  const maxZ = intersectionZ(GRID - 1) + OUTSET
  const buildings: Rect[] = []

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID * SPACING, GRID * SPACING),
    new THREE.MeshLambertMaterial({ color: 0x3f7a3a }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.05
  ground.receiveShadow = true
  parent.add(ground)

  const roadSet = pickRoadSet()
  addRoadSurfaces(parent, roadSet)
  const cols = Math.ceil((maxX - minX) / TILE_RES)
  const rows = Math.ceil((maxZ - minZ) / TILE_RES)
  const roadRaster = buildRoadRaster(roadSet, minX, minZ, cols, rows)
  addBuildings(parent, buildings, roadSet, minX, maxX, minZ, maxZ)

  const start: Vec2 = vec2(intersectionX(0), intersectionZ(0))

  const startPad = new THREE.Mesh(
      new THREE.RingGeometry(3, 4, 32),
      new THREE.MeshBasicMaterial({ color: 0xff5722, side: THREE.DoubleSide }),
  )
  startPad.rotation.x = -Math.PI / 2
  startPad.position.set(start.x, 0.08, start.z)
  parent.add(startPad)

  const goal = vec2(intersectionX(GRID - 1), intersectionZ(1))
  addGoalMarker(parent, goal)

  const milestones = pickMilestones(roadSet)
  const milestoneLabels = milestones.map(
    (_, i) => MILESTONE_ASSETS[i % MILESTONE_ASSETS.length].label,
  )
  const milestoneMarkers = addMilestoneMarkers(parent, milestones)
  addTrees(parent, buildings, roadRaster, cols, rows, minX, minZ, [start, goal, ...milestones])

  return {
    start,
    goal,
    milestones,
    milestoneMarkers,
    milestoneLabels,
    minX,
    maxX,
    minZ,
    maxZ,
    roads: roadSegments(roadSet),
    isOnRoad: makeOnRoadQuery(roadRaster, cols, rows, minX, minZ),
    resolveCollision: (pos, radius) =>
      resolveCollision(pos, radius, buildings, minX, maxX, minZ, maxZ),
  }
}

/** Draw one road plane per existing segment plus a patch at each junction. */
function addRoadSurfaces(parent: THREE.Object3D, roadSet: Set<string>): void {
  const material = new THREE.MeshLambertMaterial({ color: 0x45464d })

  for (const id of roadSet) {
    const parts = id.split(':').map(Number)
    if (id[0] === 'h') {
      const [, i, j] = parts
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SPACING, ROAD_WIDTH), material)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set((intersectionX(i) + intersectionX(i + 1)) / 2, 0.02, intersectionZ(j))
      mesh.receiveShadow = true
      parent.add(mesh)
    } else {
      const [, i, j] = parts
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, SPACING), material)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(intersectionX(i), 0.025, (intersectionZ(j) + intersectionZ(j + 1)) / 2)
      mesh.receiveShadow = true
      parent.add(mesh)
    }
  }

  // Junction patch on top so crossing roads connect cleanly at all y levels.
  const patchMaterial = new THREE.MeshLambertMaterial({ color: 0x45464d })
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      if (!nodeHasRoad(roadSet, i, j)) continue
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_WIDTH), patchMaterial)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(intersectionX(i), 0.03, intersectionZ(j))
      mesh.receiveShadow = true
      parent.add(mesh)
    }
  }
}

/**
 * Buildings are placed by flood-filling the space between roads, so merged
 * city blocks get varied, irregular footprints instead of a uniform grid.
 */
function addBuildings(
  parent: THREE.Object3D,
  buildings: Rect[],
  roadSet: Set<string>,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): void {
  const cols = Math.ceil((maxX - minX) / TILE_RES)
  const rows = Math.ceil((maxZ - minZ) / TILE_RES)
  const road = buildRoadRaster(roadSet, minX, minZ, cols, rows)
  const visited = new Uint8Array(cols * rows)
  const material = new THREE.MeshLambertMaterial()
  let index = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const start = r * cols + c
      if (road[start] === 1 || visited[start] === 1) continue

      const stack = [start]
      visited[start] = 1
      let minC = c
      let maxC = c
      let minR = r
      let maxR = r
      while (stack.length > 0) {
        const cur = stack.pop() as number
        const cr = Math.floor(cur / cols)
        const cc = cur % cols
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nc = cc + dc
          const nr = cr + dr
          if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue
          const next = nr * cols + nc
          if (road[next] === 1 || visited[next] === 1) continue
          visited[next] = 1
          stack.push(next)
          if (nc < minC) minC = nc
          if (nc > maxC) maxC = nc
          if (nr < minR) minR = nr
          if (nr > maxR) maxR = nr
        }
      }

      placeComponent(
        parent,
        buildings,
        material,
        minX + minC * TILE_RES,
        minX + (maxC + 1) * TILE_RES,
        minZ + minR * TILE_RES,
        minZ + (maxR + 1) * TILE_RES,
        index,
        road,
        cols,
        rows,
        minX,
        minZ,
      )
      index++
    }
  }
}

/**
 * Split one merged block into a few sub-buildings. Each building is inset
 * from the roads by BUILDING_MARGIN, and any sub-building whose footprint
 * overlaps a road tile is skipped (non-convex blocks wrap around roads).
 */
function placeComponent(
  parent: THREE.Object3D,
  buildings: Rect[],
  material: THREE.MeshLambertMaterial,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  index: number,
  road: Uint8Array,
  cols: number,
  rows: number,
  minX: number,
  minZ: number,
): void {
  const w = x1 - x0
  const d = z1 - z0
  if (w <= BUILDING_MARGIN * 2 || d <= BUILDING_MARGIN * 2) return

  const nx = Math.min(4, Math.max(1, Math.round(w / MAX_BUILDING_SPAN)))
  const nz = Math.min(4, Math.max(1, Math.round(d / MAX_BUILDING_SPAN)))
  const cw = (w - BUILDING_MARGIN * 2) / nx
  const cd = (d - BUILDING_MARGIN * 2) / nz

  for (let cx = 0; cx < nx; cx++) {
    for (let cz = 0; cz < nz; cz++) {
      const x = x0 + BUILDING_MARGIN + cw * cx + cw / 2
      const z = z0 + BUILDING_MARGIN + cd * cz + cd / 2
      const size = Math.min(cw, cd) * (0.65 + hash(index, cx * 10 + cz) * 0.3)
      const half = size / 2
      if (overlapsRoad(x, z, half, road, cols, rows, minX, minZ)) continue

      const height = 4 + hash(index + 7, cz) * 9
      material.color.setHSL(0.04 + hash(index, cz + 3) * 0.02, 0.5, 0.42)

      const block = new THREE.Mesh(new THREE.BoxGeometry(size, height, size), material)
      block.position.set(x, height / 2, z)
      block.castShadow = true
      block.receiveShadow = true
      parent.add(block)
      buildings.push({ x, z, halfX: half, halfZ: half })
    }
  }
}

/** True if the square footprint (x, z, half) covers any road tile. */
function overlapsRoad(
  x: number,
  z: number,
  half: number,
  road: Uint8Array,
  cols: number,
  rows: number,
  minX: number,
  minZ: number,
): boolean {
  const c0 = Math.max(0, Math.floor((x - half - minX) / TILE_RES))
  const c1 = Math.min(cols - 1, Math.ceil((x + half - minX) / TILE_RES))
  const r0 = Math.max(0, Math.floor((z - half - minZ) / TILE_RES))
  const r1 = Math.min(rows - 1, Math.ceil((z + half - minZ) / TILE_RES))
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (road[r * cols + c] === 1) return true
    }
  }
  return false
}

function addGoalMarker(parent: THREE.Object3D, goal: Vec2): void {
  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 0.6, 24),
    new THREE.MeshLambertMaterial({ color: 0xffc107 }),
  )
  cylinder.position.set(goal.x, 0.35, goal.z)
  cylinder.castShadow = true
  parent.add(cylinder)

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3, 4, 32),
    new THREE.MeshBasicMaterial({ color: 0xff5722, side: THREE.DoubleSide }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.set(goal.x, 0.08, goal.z)
  parent.add(ring)
}

/**
 * Pick up to 3 checkpoints at interior junctions that actually have roads.
 * The road network is connected (see pickRoadSet), so each is reachable.
 */
function pickMilestones(roadSet: Set<string>): Vec2[] {
  const candidates: Array<[number, number]> = [
    [1, 1],
    [2, 3],
    [3, 1],
    [1, 3],
    [3, 2],
  ]
  const milestones: Vec2[] = []
  for (const [i, j] of candidates) {
    if (milestones.length >= 3) break
    if (i === 0 || i === GRID - 1 || j === 0 || j === GRID - 1) continue
    if (nodeHasRoad(roadSet, i, j)) {
      milestones.push(vec2(intersectionX(i), intersectionZ(j)))
    }
  }
  return milestones
}

/**
 * A milestone is a sphere with its icon image wrapped on as a map. The sphere
 * reads the same from every angle, and the game loop scales it to pulse once
 * it has gone uncollected for a while.
 */
function addMilestoneMarkers(parent: THREE.Object3D, milestones: Vec2[]): THREE.Object3D[] {
  const markers: THREE.Object3D[] = []
  const loader = new THREE.TextureLoader()
  const geometry = new THREE.SphereGeometry(MILESTONE_SPHERE_RADIUS, 32, 16)
  // Phong gives the ball a glossy, round look (specular highlight from the sun).
  const material = MILESTONE_ASSETS.map((asset) => {
    const texture = loader.load(asset.src)
    // Tile the image around the sphere instead of stretching one copy over it,
    // so the whole picture is visible at a natural size.
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(MILESTONE_TILE_X, MILESTONE_TILE_Y)
    return new THREE.MeshPhongMaterial({ map: texture, shininess: 20, specular: 0xffffff })
  })

  for (let i = 0; i < milestones.length; i++) {
    const m = milestones[i]
    const mesh = new THREE.Mesh(geometry, material[i % material.length])
    mesh.position.set(m.x, MILESTONE_FLOAT_Y, m.z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    markers.push(mesh)
  }
  return markers
}

/**
 * Place pine trees on grass cells: off the road (and its shoulder), clear of
 * buildings, clear points, and other trees. Each tree also pushes a collision
 * circle into `obstacles` so driving into one is blocked.
 */
function addTrees(
  parent: THREE.Object3D,
  obstacles: Rect[],
  road: Uint8Array,
  cols: number,
  rows: number,
  minX: number,
  minZ: number,
  clearPoints: Vec2[],
): void {
  const placed: Vec2[] = []
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4226 })
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 })

  const nearRoad = (c: number, r: number, dist: number): boolean => {
    for (let dr = -dist; dr <= dist; dr++) {
      for (let dc = -dist; dc <= dist; dc++) {
        const cc = c + dc
        const rr = r + dr
        if (cc < 0 || cc >= cols || rr < 0 || rr >= rows) continue
        if (road[rr * cols + cc] === 1) return true
      }
    }
    return false
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = r * cols + c
      if (road[cell] === 1 || hash(c, r) >= TREE_CELL_CHANCE) continue
      if (nearRoad(c, r, 1)) continue

      const px = minX + c * TILE_RES + 0.5 * TILE_RES + (hash(c + 1, r) - 0.5) * TILE_RES * 0.6
      const pz = minZ + r * TILE_RES + 0.5 * TILE_RES + (hash(c, r + 1) - 0.5) * TILE_RES * 0.6

      // Keep clear of buildings and gameplay points.
      let blocked = false
      for (const b of obstacles) {
        const bx = Math.abs(px - b.x) - b.halfX
        const bz = Math.abs(pz - b.z) - b.halfZ
        if (bx < TREE_RADIUS + BUILDING_MARGIN && bz < TREE_RADIUS + BUILDING_MARGIN) {
          blocked = true
          break
        }
      }
      if (blocked) continue
      let clear = true
      for (const p of clearPoints) {
        const ddx = px - p.x
        const ddz = pz - p.z
        if (ddx * ddx + ddz * ddz < 7 * 7) {
          clear = false
          break
        }
      }
      if (!clear) continue
      let tooClose = false
      for (const p of placed) {
        const ddx = px - p.x
        const ddz = pz - p.z
        if (ddx * ddx + ddz * ddz < TREE_SPACING * TREE_SPACING) {
          tooClose = true
          break
        }
      }
      if (tooClose) continue

      // Build the tree: trunk + stacked cone foliage.
      const group = new THREE.Group()
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.6, 8), trunkMat)
      trunk.position.y = 0.8
      trunk.castShadow = true
      group.add(trunk)
      const lower = new THREE.Mesh(new THREE.ConeGeometry(2.1, 2.6, 8), leafMat)
      lower.position.y = 2.4
      lower.castShadow = true
      group.add(lower)
      const upper = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.0, 8), leafMat)
      upper.position.y = 4.0
      upper.castShadow = true
      group.add(upper)
      group.position.set(px, 0, pz)
      const sway = (hash(c, r * 3) - 0.5) * 0.8
      group.rotation.y = (hash(c, r) * 2 - 1) * 0.5
      group.scale.y = 1 + sway * 0.15
      parent.add(group)

      placed.push(vec2(px, pz))
      obstacles.push({ x: px, z: pz, halfX: TREE_RADIUS, halfZ: TREE_RADIUS })
    }
  }
}

/**
 * Deterministic pseudo-random value in [0,1) from integer coordinates.
 */
function hash(i: number, j: number): number {
  const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
  return n - Math.floor(n)
}

/**
 * Pick which segments exist as roads: start with every segment, then remove
 * random ones, reverting any removal that would disconnect start from goal.
 */
function pickRoadSet(): Set<string> {
  const roads = new Set<string>()
  const candidates: string[] = []
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID - 1; i++) {
      roads.add(`h:${i}:${j}`)
      candidates.push(`h:${i}:${j}`)
    }
  }
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID - 1; j++) {
      roads.add(`v:${i}:${j}`)
      candidates.push(`v:${i}:${j}`)
    }
  }

  shuffle(candidates)

  const maxRemoved = Math.floor(candidates.length * REMOVED_RATIO)
  let removed = 0
  for (const id of candidates) {
    if (removed >= maxRemoved) break
    roads.delete(id)
    if (isConnected(roads)) {
      removed++
    } else {
      roads.add(id)
    }
  }
  return roads
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
}

function nodeHasRoad(roadSet: Set<string>, i: number, j: number): boolean {
  return (
    roadSet.has(`h:${i - 1}:${j}`) ||
    roadSet.has(`h:${i}:${j}`) ||
    roadSet.has(`v:${i}:${j - 1}`) ||
    roadSet.has(`v:${i}:${j}`)
  )
}

/** Rasterize the road network onto a tile grid (1 = road, 0 = grass). */
function buildRoadRaster(
  roadSet: Set<string>,
  minX: number,
  minZ: number,
  cols: number,
  rows: number,
): Uint8Array {
  const road = new Uint8Array(cols * rows)
  const mark = (c0: number, c1: number, r0: number, r1: number): void => {
    const cc0 = Math.max(0, Math.floor(c0))
    const cc1 = Math.min(cols - 1, Math.ceil(c1))
    const rr0 = Math.max(0, Math.floor(r0))
    const rr1 = Math.min(rows - 1, Math.ceil(r1))
    for (let r = rr0; r <= rr1; r++) {
      for (let c = cc0; c <= cc1; c++) road[r * cols + c] = 1
    }
  }

  for (const id of roadSet) {
    const parts = id.split(':').map(Number)
    if (id[0] === 'h') {
      const [, i, j] = parts
      const z = intersectionZ(j)
      mark(
        (intersectionX(i) - minX) / TILE_RES,
        (intersectionX(i + 1) - minX) / TILE_RES,
        (z - ROAD_HALF - minZ) / TILE_RES,
        (z + ROAD_HALF - minZ) / TILE_RES,
      )
    } else {
      const [, i, j] = parts
      const x = intersectionX(i)
      mark(
        (x - ROAD_HALF - minX) / TILE_RES,
        (x + ROAD_HALF - minX) / TILE_RES,
        (intersectionZ(j) - minZ) / TILE_RES,
        (intersectionZ(j + 1) - minZ) / TILE_RES,
      )
    }
  }
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      if (!nodeHasRoad(roadSet, i, j)) continue
      mark(
        (intersectionX(i) - ROAD_HALF - minX) / TILE_RES,
        (intersectionX(i) + ROAD_HALF - minX) / TILE_RES,
        (intersectionZ(j) - ROAD_HALF - minZ) / TILE_RES,
        (intersectionZ(j) + ROAD_HALF - minZ) / TILE_RES,
      )
    }
  }

  return road
}

/**
 * True if the (x, z) footprint, treated as a circle of `radius`, overlaps any
 * road tile. Used to slow the car when it drifts onto the grass.
 */
function makeOnRoadQuery(
  road: Uint8Array,
  cols: number,
  rows: number,
  minX: number,
  minZ: number,
): (x: number, z: number, radius: number) => boolean {
  return (x, z, radius) => {
    const c0 = Math.max(0, Math.floor((x - radius - minX) / TILE_RES))
    const c1 = Math.min(cols - 1, Math.ceil((x + radius - minX) / TILE_RES))
    const r0 = Math.max(0, Math.floor((z - radius - minZ) / TILE_RES))
    const r1 = Math.min(rows - 1, Math.ceil((z + radius - minZ) / TILE_RES))
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (road[r * cols + c] === 1) return true
      }
    }
    return false
  }
}

/**
 * BFS over the grid network; true if the goal node is reachable from the
 * start node through existing road segments.
 */
function isConnected(roads: Set<string>): boolean {
  const start = 0
  const goal = (GRID - 1) * GRID + 1
  const visited = new Set<number>([start])
  const queue = [start]

  while (queue.length > 0) {
    const node = queue.shift() as number
    const i = Math.floor(node / GRID)
    const j = node % GRID
    const neighbors: Array<[number, string]> = []
    // node = i * GRID + j: +/-1 moves along a row (j), +/-GRID moves rows (i).
    if (j > 0) neighbors.push([node - 1, `h:${i}:${j - 1}`])
    if (j < GRID - 1) neighbors.push([node + 1, `h:${i}:${j}`])
    if (i > 0) neighbors.push([node - GRID, `v:${i - 1}:${j}`])
    if (i < GRID - 1) neighbors.push([node + GRID, `v:${i}:${j}`])

    for (const [next, edgeId] of neighbors) {
      if (!roads.has(edgeId)) continue
      if (!visited.has(next)) {
        visited.add(next)
        queue.push(next)
      }
    }
  }

  return visited.has(goal)
}

function roadSegments(roadSet: Set<string>): Segment[] {
  const segments: Segment[] = []
  for (const id of roadSet) {
    const parts = id.split(':').map(Number)
    if (id[0] === 'h') {
      const [, i, j] = parts
      segments.push({
        x1: intersectionX(i),
        z1: intersectionZ(j),
        x2: intersectionX(i + 1),
        z2: intersectionZ(j),
      })
    } else {
      const [, i, j] = parts
      segments.push({
        x1: intersectionX(i),
        z1: intersectionZ(j),
        x2: intersectionX(i),
        z2: intersectionZ(j + 1),
      })
    }
  }
  return segments
}

/**
 * Collision: clamp to the city bounds and push the car out of any building
 * it overlaps. Only a building hit counts as a real collision (`hit`), so the
 * car keeps moving on grass between roads and buildings.
 */
function resolveCollision(
  pos: Vec2,
  radius: number,
  obstacles: Rect[],
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): boolean {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
  let hit = false

  pos.x = clamp(pos.x, minX, maxX)
  pos.z = clamp(pos.z, minZ, maxZ)

  // Obstacles: push out along the axis of least penetration, applying the
  // correction 10x so the car is kicked clear instead of grinding on the wall.
  for (const o of obstacles) {
    const hx = o.halfX + radius
    const hz = o.halfZ + radius
    const dx = pos.x - o.x
    const dz = pos.z - o.z
    if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
      const ox = hx - Math.abs(dx)
      const oz = hz - Math.abs(dz)
      if (ox < oz) {
        const edge = pos.x < o.x ? o.x - hx : o.x + hx
        pos.x = pos.x + (edge - pos.x) * 10
      } else {
        const edge = pos.z < o.z ? o.z - hz : o.z + hz
        pos.z = pos.z + (edge - pos.z) * 10
      }
      hit = true
    }
  }

  return hit
}
