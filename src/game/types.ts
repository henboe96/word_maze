export interface Vec2 {
  x: number
  z: number
}

export const vec2 = (x: number, z: number): Vec2 => ({ x, z })

export type Callbacks = {
  onWin: () => void
  onMinimap: (ctx: CanvasRenderingContext2D, width: number, height: number) => void
}