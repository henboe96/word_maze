export class Input {
  private keys = new Set<string>()

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }

  isDown(code: string): boolean {
    return this.keys.has(code)
  }

  restartPressed(): boolean {
    const pressed = this.keys.has('KeyR')
    if (pressed) this.keys.delete('KeyR')
    return pressed
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault()
    }
    this.keys.add(e.code)
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code)
  }
}
