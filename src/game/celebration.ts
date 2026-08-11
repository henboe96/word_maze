import * as THREE from 'three'

interface Particle {
  mesh: THREE.Mesh
  material: THREE.MeshBasicMaterial
  vel: THREE.Vector3
  rotVel: THREE.Vector3
  spinZ: number
  billboard: boolean
  life: number
  maxLife: number
}

const COLORS = [
  0xffd54f, 0xff8a00, 0xff5252, 0x4fc3f7, 0x66bb6a, 0xba68c8, 0xffef96,
]
const GRAVITY = 12
const UP_SPEED = 7
const SPREAD = 6
const STAR_RADIUS = 0.55
const STAR_COUNT = 6

function makeStarShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape()
  const spikes = 5
  const inner = radius * 0.45
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? radius : inner
    const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(angle) * r
    const y = Math.sin(angle) * r
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

/** Shared geometry reused by every particle so nothing is re-created per burst. */
const starGeo = new THREE.ShapeGeometry(makeStarShape(STAR_RADIUS))
const confettiGeo = new THREE.PlaneGeometry(0.35, 0.2)

export class Celebration {
  private readonly group = new THREE.Group()
  private readonly camera: THREE.Camera
  private readonly particles: Particle[] = []

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.camera = camera
    scene.add(this.group)
  }

  dispose(): void {
    for (const p of this.particles) p.material.dispose()
    this.particles.length = 0
    this.group.clear()
  }

  /** Emit a burst of stars and confetti from a world position. */
  burst(x: number, z: number): void {
    // A few large stars shooting straight up.
    for (let i = 0; i < STAR_COUNT; i++) {
      this.spawn(x, z, true)
    }
    // A handful of tumbling confetti ribbons.
    for (let i = 0; i < 14; i++) {
      this.spawn(x, z, false)
    }
  }

  private spawn(x: number, z: number, star: boolean): void {
const material = new THREE.MeshBasicMaterial({
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    side: THREE.DoubleSide,
    transparent: true,
  })
    const mesh = new THREE.Mesh(star ? starGeo : confettiGeo, material)
    mesh.position.set(x, 1, z)
    this.group.add(mesh)

    const angle = Math.random() * Math.PI * 2
    const radial = Math.random() * SPREAD
    const vel = new THREE.Vector3(
      Math.cos(angle) * radial,
      UP_SPEED * (0.5 + Math.random() * 0.8),
      Math.sin(angle) * radial,
    )
    const spin = Math.random() * 8 - 4
    const rotVel = star
      ? new THREE.Vector3(0, 0, spin)
      : new THREE.Vector3(spin, spin * 1.4, 0)

    this.particles.push({
      mesh,
      material,
      vel,
      rotVel,
      spinZ: 0,
      billboard: star,
      life: 1.1 + Math.random() * 0.7,
      maxLife: 1.8,
    })
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= dt
      if (p.life <= 0) {
        this.group.remove(p.mesh)
        p.material.dispose()
        this.particles.splice(i, 1)
        continue
      }

      p.vel.y -= GRAVITY * dt
      p.mesh.position.addScaledVector(p.vel, dt)
      p.mesh.rotation.x += p.rotVel.x * dt
      p.mesh.rotation.y += p.rotVel.y * dt
      p.mesh.rotation.z += p.rotVel.z * dt
      if (p.billboard) {
        // Face the camera, then spin the star around its facing axis.
        p.spinZ += p.rotVel.z * dt
        p.mesh.lookAt(this.camera.position)
        p.mesh.rotateZ(p.spinZ)
      }
      p.material.opacity = Math.min(1, (p.life / p.maxLife) * 1.6)

      const scale = Math.max(0.2, p.life / p.maxLife)
      p.mesh.scale.setScalar(scale)
    }
  }
}