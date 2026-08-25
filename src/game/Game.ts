import * as THREE from 'three'
import { Car } from './car'
import { ChaseCamera } from './camera'
import { Celebration } from './celebration'
import { COLLISION_RADIUS, createCity, GOAL_RADIUS, type CityData } from './city'
import { Input } from './input'
import { drawMinimap, type MinimapProps } from './minimap'

const GRASS_MAX_SPEED = 12
const GRASS_DRAG = 3
const MILESTONE_RADIUS = 4
const PULSE_AFTER_SECONDS = 10

export class Game {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly chase: ChaseCamera
  private readonly celebration: Celebration
  private readonly input = new Input()
  private readonly car: Car
  private readonly carMesh = new THREE.Group()
  private city: CityData
  private readonly cityGroup = new THREE.Group()
  private readonly minimapCanvas: HTMLCanvasElement
  private minimap: MinimapProps
  private readonly onWin: () => void
  private readonly onReset: () => void
  private readonly onTarget: (label: string) => void
  private readonly onWrongMilestone: () => void
  private readonly clock = new THREE.Clock()
  private readonly raf = { id: 0 }
  private won = false
  private milestoneVisited: boolean[]
  private milestonesReached = 0
  private elapsed = 0
  private targetActiveElapsed = 0
  private lastWrongFlash = -Infinity

  constructor(
    container: HTMLElement,
    minimapCanvas: HTMLCanvasElement,
    onWin: () => void,
    onReset: () => void,
    onTarget: (label: string) => void,
    onWrongMilestone: () => void,
  ) {
    this.minimapCanvas = minimapCanvas
    this.onWin = onWin
    this.onReset = onReset
    this.onTarget = onTarget
    this.onWrongMilestone = onWrongMilestone

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87b8e0)
    this.scene.fog = new THREE.Fog(0x87b8e0, 80, 160)

    this.camera = new THREE.PerspectiveCamera(
      65,
      container.clientWidth / container.clientHeight,
      0.1,
      500,
    )

    this.addLights()

    this.scene.add(this.cityGroup)
    this.city = createCity(this.cityGroup)
    this.milestoneVisited = this.city.milestones.map(() => false)
    this.onTarget(this.currentTargetLabel())

    this.car = new Car(this.city.start)
    this.carMesh.add(buildCarMesh())
    this.scene.add(this.carMesh)
    this.syncCarMesh()

    this.chase = new ChaseCamera(this.camera, this.car)
    this.chase.update(1, this.car)

    this.celebration = new Celebration(this.scene, this.camera)

    this.minimap = this.buildMinimapProps()

    this.input.attach()
    window.addEventListener('resize', this.onResize)

    this.raf.id = requestAnimationFrame(this.loop)
  }

  destroy(): void {
    cancelAnimationFrame(this.raf.id)
    window.removeEventListener('resize', this.onResize)
    this.input.detach()
    this.celebration.dispose()
    this.renderer.dispose()
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement)
    }
  }

  private addLights(): void {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444422, 0.9)
    this.scene.add(hemi)
    const sun = new THREE.DirectionalLight(0xffffff, 1.0)
    sun.position.set(40, 60, 30)
    // Cast soft shadows across the whole city so objects land on the ground.
    sun.castShadow = true
    sun.shadow.mapSize.set(6144, 6144)
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 220
    sun.shadow.camera.left = -95
    sun.shadow.camera.right = 95
    sun.shadow.camera.top = 95
    sun.shadow.camera.bottom = -95
    sun.shadow.bias = -0.0001
    sun.shadow.normalBias = 0.01
    this.scene.add(sun)
  }

  private loop = (): void => {
    this.raf.id = requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.elapsed += dt

    if (this.input.restartPressed()) this.restart()

    if (!this.won) {
      this.updateCar(dt)
      this.chase.update(dt, this.car)
      this.checkMilestones()
      this.updateMarkers(dt)
      this.checkWin()
    }

    this.celebration.update(dt)

    this.drawMinimap()
    this.renderer.render(this.scene, this.camera)
  }

  private updateCar(dt: number): void {
    const steer =
      (this.input.isDown('KeyA') || this.input.isDown('ArrowLeft') ? 1 : 0) -
      (this.input.isDown('KeyD') || this.input.isDown('ArrowRight') ? 1 : 0)
    const throttle = this.input.isDown('KeyW') || this.input.isDown('ArrowUp')
    const reverse = this.input.isDown('KeyS') || this.input.isDown('ArrowDown')

    this.car.update(dt, throttle, reverse, steer)
    if (this.city.resolveCollision(this.car.position, COLLISION_RADIUS)) {
      this.car.speed = 0
    } else if (!this.city.isOnRoad(this.car.position.x, this.car.position.z, COLLISION_RADIUS)) {
      // Driving on grass is slower, so cutting across a block isn't a free shortcut.
      this.car.speed *= Math.max(0, 1 - GRASS_DRAG * dt)
      if (this.car.speed > GRASS_MAX_SPEED) this.car.speed = GRASS_MAX_SPEED
      if (this.car.speed < -GRASS_MAX_SPEED) this.car.speed = -GRASS_MAX_SPEED
    }
    this.syncCarMesh()
  }

  private syncCarMesh(): void {
    this.carMesh.position.set(this.car.position.x, 0, this.car.position.z)
    // Local +z is the car's forward; rotating around +y by `heading` maps it
    // to world (sin, 0, cos), matching Car.forward().
    this.carMesh.rotation.y = this.car.heading
  }

/** Index of the first unvisited milestone, or -1 when all are taken. */
  private nextMilestoneIndex(): number {
    for (let i = 0; i < this.milestoneVisited.length; i++) {
      if (!this.milestoneVisited[i]) return i
    }
    return -1
  }

  private currentTargetLabel(): string {
    const i = this.nextMilestoneIndex()
    return i === -1 ? '' : this.city.milestoneLabels[i]
  }

  /**
   * Milestones must be collected in order. Only the next unvisited one counts;
   * reaching an out-of-order marker is ignored (with a brief wrong-order hint).
   */
  private checkMilestones(): void {
    const next = this.nextMilestoneIndex()
    if (next === -1) return
    const m = this.city.milestones[next]
    const dx = this.car.position.x - m.x
    const dz = this.car.position.z - m.z
    const touching = dx * dx + dz * dz <= MILESTONE_RADIUS * MILESTONE_RADIUS

    if (touching) {
      this.milestoneVisited[next] = true
      this.milestonesReached++
      this.city.milestoneMarkers[next].visible = false
      this.targetActiveElapsed = 0
      this.celebration.burst(m.x, m.z)
      this.onTarget(this.currentTargetLabel())
      return
    }

    // Out of order? Flag the first unvisited marker that isn't the target.
    for (let i = 0; i < this.milestoneVisited.length; i++) {
      if (this.milestoneVisited[i] || i === next) continue
      const o = this.city.milestones[i]
      const odx = this.car.position.x - o.x
      const odz = this.car.position.z - o.z
      if (odx * odx + odz * odz <= MILESTONE_RADIUS * MILESTONE_RADIUS) {
        if (this.elapsed - this.lastWrongFlash > 2) {
          this.lastWrongFlash = this.elapsed
          this.onWrongMilestone()
        }
      }
    }
  }

  /**
   * Keep every milestone plaque facing the camera (billboard), and after the
   * current target has been active for a while without being taken, scale it up
   * and down to draw the player's attention.
   */
  private updateMarkers(dt: number): void {
    for (const group of this.city.milestoneMarkers) {
      group.lookAt(this.camera.position)
    }

    const next = this.nextMilestoneIndex()
    if (next === -1) return
    this.targetActiveElapsed += dt
    if (this.targetActiveElapsed >= PULSE_AFTER_SECONDS) {
      const pulse = 1 + 0.18 * Math.sin(this.elapsed * 4)
      this.city.milestoneMarkers[next].scale.setScalar(pulse)
    }
  }

  private checkWin(): void {
    if (this.milestonesReached < this.milestoneVisited.length) return
    const dx = this.car.position.x - this.city.goal.x
    const dz = this.car.position.z - this.city.goal.z
    if (dx * dx + dz * dz <= GOAL_RADIUS * GOAL_RADIUS) {
      this.won = true
      this.car.speed = 0
      this.onWin()
    }
  }

  private drawMinimap(): void {
    const ctx = this.minimapCanvas.getContext('2d')
    if (!ctx) return
    this.minimap.nextMilestone = this.nextMilestoneIndex()
    this.minimap.pulseActive = this.targetActiveElapsed >= PULSE_AFTER_SECONDS
    this.minimap.elapsed = this.elapsed
    drawMinimap(ctx, this.minimapCanvas.width, this.minimapCanvas.height, this.minimap)
  }

  restart(): void {
    this.won = false

    // Rebuild a brand-new course: dispose the old city meshes, then regenerate.
    this.disposeCity()
    this.city = createCity(this.cityGroup)
    this.milestoneVisited = this.city.milestones.map(() => false)
    this.milestonesReached = 0
    this.targetActiveElapsed = 0
    this.lastWrongFlash = -Infinity
    this.minimap = this.buildMinimapProps()
    this.onTarget(this.currentTargetLabel())

    this.car.position.x = this.city.start.x
    this.car.position.z = this.city.start.z
    this.car.heading = 0
    this.car.speed = 0
    this.syncCarMesh()
    this.onReset()
  }

  private buildMinimapProps(): MinimapProps {
    return {
      car: this.car,
      goal: { x: this.city.goal.x, z: this.city.goal.z },
      minX: this.city.minX,
      maxX: this.city.maxX,
      minZ: this.city.minZ,
      maxZ: this.city.maxZ,
      roads: this.city.roads,
      milestones: this.city.milestones,
      visitedMilestones: this.milestoneVisited,
      nextMilestone: this.nextMilestoneIndex(),
      pulseActive: false,
      elapsed: this.elapsed,
    }
  }

  /** Remove the city group's meshes, freeing their GPU resources. */
  private disposeCity(): void {
    this.cityGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        const material = obj.material
        if (Array.isArray(material)) {
          for (const m of material) m.dispose()
        } else {
          material.dispose()
        }
      }
    })
    this.cityGroup.clear()
  }

  private onResize = (): void => {
    const el = this.renderer.domElement.parentElement as HTMLElement | null
    if (!el) return
    this.camera.aspect = el.clientWidth / el.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(el.clientWidth, el.clientHeight)
  }
}

/** Build a simple boxy car: body + cabin + four wheels. */
function buildCarMesh(): THREE.Group {
  const group = new THREE.Group()

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.8, 4),
    new THREE.MeshLambertMaterial({ color: 0xd33c3c }),
  )
  body.position.y = 0.7
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.7, 2),
    new THREE.MeshLambertMaterial({ color: 0x22252c }),
  )
  cabin.position.set(0, 1.3, -0.3)
  cabin.castShadow = true
  group.add(cabin)

  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 })
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12)
  const wheelPositions: Array<[number, number, number]> = [
    [1, 0.4, 1.4],
    [-1, 0.4, 1.4],
    [1, 0.4, -1.4],
    [-1, 0.4, -1.4],
  ]
  for (const [x, y, z] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat)
    wheel.rotation.x = Math.PI / 2
    wheel.position.set(x, y, z)
    wheel.castShadow = true
    group.add(wheel)
  }

  return group
}