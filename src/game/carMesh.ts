import * as THREE from 'three'

/**
 * Build a chunky toy-style car: painted body, dark glass band with a roof,
 * bumpers, head/tail lights, hubcaps, and an exhaust pipe. Front is local +z.
 */
export function buildCarMesh(): THREE.Group {
  const group = new THREE.Group()

  const paint = new THREE.MeshLambertMaterial({ color: 0xd33c3c })
  const glass = new THREE.MeshLambertMaterial({ color: 0x27313d })
  const trim = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 })
  const rubber = new THREE.MeshLambertMaterial({ color: 0x151515 })

  const addPart = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, z)
    group.add(mesh)
    return mesh
  }

  // Dark skirt under the body gives the toy a bit of visual ground clearance.
  addPart(new THREE.BoxGeometry(1.9, 0.35, 3.9), rubber, 0, 0.38, 0).castShadow = true

  // Main painted body.
  addPart(new THREE.BoxGeometry(2, 0.6, 4.2), paint, 0, 0.88, 0).castShadow = true

  // Glass band all around, capped by a painted roof.
  addPart(new THREE.BoxGeometry(1.55, 0.42, 2.1), glass, 0, 1.36, -0.25).castShadow = true
  addPart(new THREE.BoxGeometry(1.6, 0.14, 2.2), paint, 0, 1.63, -0.25).castShadow = true

  // Bumpers.
  addPart(new THREE.BoxGeometry(2.08, 0.2, 0.22), trim, 0, 0.62, 2.16)
  addPart(new THREE.BoxGeometry(2.08, 0.2, 0.22), trim, 0, 0.62, -2.16)

  // Headlights (warm) and taillights (red), unlit materials so they pop.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0 })
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xe03030 })
  addPart(new THREE.BoxGeometry(0.3, 0.16, 0.08), headMat, 0.62, 0.92, 2.11)
  addPart(new THREE.BoxGeometry(0.3, 0.16, 0.08), headMat, -0.62, 0.92, 2.11)
  addPart(new THREE.BoxGeometry(0.3, 0.16, 0.08), tailMat, 0.62, 0.92, -2.11)
  addPart(new THREE.BoxGeometry(0.3, 0.16, 0.08), tailMat, -0.62, 0.92, -2.11)

  // Little exhaust pipe poking out at the rear.
  const exhaust = addPart(
    new THREE.CylinderGeometry(0.07, 0.07, 0.25, 10),
    trim,
    0.55,
    0.42,
    -2.15,
  )
  exhaust.rotation.x = Math.PI / 2

  // Wheels with light hubcaps (children of the tire, so they stay aligned).
  const tireGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 14)
  const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.36, 10)
  const wheelPositions: Array<[number, number, number]> = [
    [1.02, 0.42, 1.45],
    [-1.02, 0.42, 1.45],
    [1.02, 0.42, -1.45],
    [-1.02, 0.42, -1.45],
  ]
  for (const [x, y, z] of wheelPositions) {
    const wheel = new THREE.Mesh(tireGeo, rubber)
    // Rotate the cylinder axle from +y to +x so wheels face sideways.
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(x, y, z)
    wheel.castShadow = true
    wheel.add(new THREE.Mesh(hubGeo, trim))
    group.add(wheel)
  }

  return group
}
