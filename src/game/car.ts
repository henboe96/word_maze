import { vec2, type Vec2 } from './types'

export class Car {
  position: Vec2 = vec2(0, 0)
  heading = 0
  speed = 0

  private readonly maxSpeed = 20
  private readonly acceleration = 15
  private readonly brakePower = 30
  private readonly reverseSpeed = 12
  private readonly drag = 1.4
  private readonly turnSpeed = 2.4

  constructor(start: Vec2, heading = 0) {
    this.position = { ...start }
    this.heading = heading
  }

  /** @returns the world-space forward unit vector based on current heading. */
  forward(): Vec2 {
    return vec2(Math.sin(this.heading), Math.cos(this.heading))
  }

  /**
   * Advance the car by one step. Accelerate/brake via `throttle`/`reverse`,
   * steering via `steer` (-1 .. 1). Steering only takes effect while moving.
   */
  update(dt: number, throttle: boolean, reverse: boolean, steer: number): void {
    if (throttle) {
      this.speed += this.acceleration * dt
    } else if (reverse) {
      if (this.speed > 0) {
        this.speed -= this.brakePower * dt
      } else {
        this.speed = Math.max(this.speed - this.acceleration * dt, -this.reverseSpeed)
      }
    } else {
      this.speed -= this.speed * this.drag * dt
    }

    this.speed = Math.max(this.speed, -this.reverseSpeed)

    // Only clamp from above, so reversing into a wall cannot overshoot.
    if (this.speed > this.maxSpeed) this.speed = this.maxSpeed

    const speedFactor = Math.min(Math.abs(this.speed) / 10, 1)
    this.heading += steer * this.turnSpeed * speedFactor * dt

    const forward = this.forward()
    this.position.x += forward.x * this.speed * dt
    this.position.z += forward.z * this.speed * dt
  }
}