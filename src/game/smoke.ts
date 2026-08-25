import * as THREE from 'three'

const POOL_SIZE = 48
const EMISSION_RATE = 26 // puffs per second at full wheelspin
const REAR_WHEELS: ReadonlyArray<Readonly<[number, number, number]>> = [
  [-1.02, 0.3, -1.55],
  [1.02, 0.3, -1.55],
]

/** Soft round puff drawn once on a small canvas and shared by all sprites. */
function makePuffTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(32, 32, 4, 32, 32, 30)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.45)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(canvas)
}

interface Puff {
  sprite: THREE.Sprite
  material: THREE.SpriteMaterial
  vel: THREE.Vector3
  life: number
  maxLife: number
}

/**
 * Pooled tire smoke for burnouts. `emitFrom` spawns puffs behind the rear
 * wheels; puffs rise, expand, and fade until their life runs out or they are
 * recycled round-robin when the pool is full.
 */
export class TireSmoke {
  private readonly group = new THREE.Group()
  private readonly texture = makePuffTexture()
  private readonly puffs: Puff[] = []
  private next = 0
  private side = 0
  private carry = 0

  constructor(scene: THREE.Scene) {
    scene.add(this.group)
    for (let i = 0; i < POOL_SIZE; i++) {
      const material = new THREE.SpriteMaterial({
        map: this.texture,
        color: 0xdddddd,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
      const sprite = new THREE.Sprite(material)
      sprite.visible = false
      this.group.add(sprite)
      this.puffs.push({
        sprite,
        material,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
      })
    }
  }

  dispose(): void {
    for (const puff of this.puffs) puff.material.dispose()
    this.texture.dispose()
    this.group.clear()
  }

  /**
   * Spawn smoke behind the car while the tires spin. `intensity` (0..1) sets
   * how hard the tires are slipping; fractional amounts carry over frames so
   * emission stays smooth at any frame rate.
   */
  emitFrom(carMesh: THREE.Object3D, dt: number, intensity: number): void {
    if (intensity <= 0) {
      this.carry = 0
      return
    }
    this.carry += intensity * EMISSION_RATE * dt
    carMesh.updateMatrixWorld()
    while (this.carry >= 1) {
      this.carry -= 1
      this.spawn(carMesh)
    }
  }

  /** Advance every live puff; safe to call every frame even when idle. */
  update(dt: number): void {
    for (const puff of this.puffs) {
      if (puff.life <= 0) continue
      puff.life -= dt
      if (puff.life <= 0) {
        puff.sprite.visible = false
        continue
      }

      const t = 1 - puff.life / puff.maxLife
      puff.sprite.position.addScaledVector(puff.vel, dt)
      // Quick fade-in so new puffs don't pop, then fade out as they expand.
      puff.material.opacity = 0.5 * Math.min(t * 6, 1) * (1 - t)
      const scale = 0.5 + 1.1 * t
      puff.sprite.scale.set(scale, scale, 1)
    }
  }

  private spawn(carMesh: THREE.Object3D): void {
    const puff = this.puffs[this.next]
    this.next = (this.next + 1) % POOL_SIZE
    this.side ^= 1

    const [lx, ly, lz] = REAR_WHEELS[this.side]
    puff.sprite.position.set(
      lx + Math.random() * 0.24 - 0.12,
      ly + Math.random() * 0.1,
      lz + Math.random() * 0.2 - 0.1,
    )
    carMesh.localToWorld(puff.sprite.position)
    puff.sprite.visible = true

    puff.vel.set(Math.random() * 0.6 - 0.3, 0.9 + Math.random() * 0.6, Math.random() * 0.6 - 0.3)
    puff.maxLife = 0.7 + Math.random() * 0.4
    puff.life = puff.maxLife
  }
}
