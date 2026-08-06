import { useEffect, useRef, useState } from 'react'
import { Game } from './game/Game'
import './App.css'

function App() {
  const mountRef = useRef<HTMLDivElement>(null)
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<Game | null>(null)
  const wrongTimer = useRef<number>(0)
  const [won, setWon] = useState(false)
  const [target, setTarget] = useState('')
  const [wrongOrder, setWrongOrder] = useState(false)

  useEffect(() => {
    if (!mountRef.current || !minimapRef.current) return
    const game = new Game(
      mountRef.current,
      minimapRef.current,
      () => setWon(true),
      () => setWon(false),
      (label) => setTarget(label),
      () => {
        setWrongOrder(true)
        window.clearTimeout(wrongTimer.current)
        wrongTimer.current = window.setTimeout(() => setWrongOrder(false), 1500)
      },
    )
    gameRef.current = game
    return () => {
      window.clearTimeout(wrongTimer.current)
      gameRef.current = null
      game.destroy()
    }
  }, [])

  const restart = () => gameRef.current?.restart()

  return (
    <div className="game-root">
      <div ref={mountRef} className="game-mount" />

      <canvas ref={minimapRef} className="minimap" width={170} height={170} />

      {target && <div className="target-badge">Find {target}</div>}
      {wrongOrder && <div className="wrong-toast">Wrong order! Follow the markers in sequence</div>}

      <div className="hint">
        <span>W/S or ↑/↓: drive</span>
        <span>A/D or ←/→: steer</span>
        <span>R: restart</span>
      </div>

      <button type="button" className="restart-btn" onClick={restart}>
        Restart
      </button>

      {won && (
        <div className="win-overlay">
          <h1>You made it!</h1>
          <p>Press R or click Restart to play again</p>
        </div>
      )}
    </div>
  )
}

export default App