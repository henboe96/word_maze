import type { Car } from './car'
import { ROAD_WIDTH, type Segment } from './city'

export interface MinimapProps {
  car: Car
  goal: { x: number; z: number }
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  roads: Segment[]
  milestones: { x: number; z: number }[]
  visitedMilestones: boolean[]
  /** Index of the next milestone to collect, or -1 when all are taken. */
  nextMilestone: number
  /** True once the next milestone has been left untouched for a while. */
  pulseActive: boolean
  /** Game elapsed time (s), drives the minimap pulse animation. */
  elapsed: number
}

const PAD = 14

/**
 * Draw a north-up minimap: the road network, goal marker, and the car's
 * position with a triangle pointing in its heading direction.
 */
export function drawMinimap(ctx: CanvasRenderingContext2D, width: number, height: number, p: MinimapProps): void {
  ctx.clearRect(0, 0, width, height)

  const size = Math.min(width, height) - PAD * 2
  const scale = size / (p.maxX - p.minX)
  const originX = (width - size) / 2
  const originY = (height - size) / 2

  const toScreen = (x: number, z: number): [number, number] => [
    originX + (p.maxX - x) * scale,
    originY + (p.maxZ - z) * scale,
  ]

  // Road segments, thick enough to look like roads.
  ctx.strokeStyle = 'rgba(220,220,230,0.9)'
  ctx.lineWidth = Math.max(2, ROAD_WIDTH * scale)
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (const seg of p.roads) {
    const [x1, z1] = toScreen(seg.x1, seg.z1)
    const [x2, z2] = toScreen(seg.x2, seg.z2)
    ctx.moveTo(x1, z1)
    ctx.lineTo(x2, z2)
  }
  ctx.stroke()

  const [gx, gy] = toScreen(p.goal.x, p.goal.z)
  ctx.fillStyle = '#4caf50'
  ctx.beginPath()
  ctx.arc(gx, gy, 6, 0, Math.PI * 2)
  ctx.fill()

  // Milestones: unvisited in bright cyan, already collected in faded grey.
  for (let i = 0; i < p.milestones.length; i++) {
    const [mx, my] = toScreen(p.milestones[i].x, p.milestones[i].z)
    ctx.fillStyle = p.visitedMilestones[i] ? 'rgba(255,255,255,0.35)' : '#4fc3f7'
    ctx.strokeStyle = p.visitedMilestones[i] ? 'rgba(255,255,255,0.35)' : '#0288d1'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(mx, my, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Pulse the current target once it has gone uncollected for a while.
    if (i === p.nextMilestone && p.milestones.length > 0 && p.pulseActive) {
      const pulse = 0.5 + 0.5 * Math.sin(p.elapsed * 4)
      ctx.strokeStyle = '#ffd54f'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(mx, my, 6 + 4 * pulse, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  const [px, py] = toScreen(p.car.position.x, p.car.position.z)
  // Forward dir (sin, cos) maps to screen (+right, -up): angle = atan2(x, -z).
  const dir = p.car.forward()
  ctx.save()
  ctx.translate(px, py)
  ctx.rotate(Math.atan2(dir.x, -dir.z) + Math.PI / 2)
  ctx.fillStyle = '#ff5252'
  ctx.beginPath()
  ctx.moveTo(7, 0)
  ctx.lineTo(-5, 5)
  ctx.lineTo(-5, -5)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = 'rgba(0,0,0,0.55)'
  ctx.lineWidth = 2
  ctx.strokeRect(originX, originY, size, size)
}