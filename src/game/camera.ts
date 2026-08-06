import * as THREE from 'three'
import type { Car } from './car'

const BEHIND = 8
const ABOVE = 5.5
const LOOK_AHEAD = 4

/**
 * Third-person camera that sits behind the car, smoothing its movement
 * towards the ideal chase position each frame.
 */
export class ChaseCamera {
  private readonly camera: THREE.PerspectiveCamera
  private smoothed: THREE.Vector3

  constructor(camera: THREE.PerspectiveCamera, car: Car) {
    this.camera = camera
    this.smoothed = new THREE.Vector3(car.position.x, ABOVE, car.position.z)
  }

  update(dt: number, car: Car): void {
    const forward = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading))
    const target = new THREE.Vector3(
      car.position.x - forward.x * BEHIND,
      ABOVE,
      car.position.z - forward.z * BEHIND,
    )

    const factor = 1 - Math.exp(-6 * dt)
    this.smoothed.lerp(target, factor)

    this.camera.position.copy(this.smoothed)
    this.camera.lookAt(
      car.position.x + forward.x * LOOK_AHEAD,
      1,
      car.position.z + forward.z * LOOK_AHEAD,
    )
  }
}
