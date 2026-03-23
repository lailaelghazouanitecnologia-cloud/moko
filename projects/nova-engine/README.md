# Nova Engine

WebGL game engine built iteratively with `ava dev`.

## References
- **PlayCanvas** — Production WebGL2/WebGPU engine (ECS, forward renderer, PBR)
- **ThiefEngine** — Minimal WebGL engine (sprite batching, 2D physics, builder pattern)

## Architecture Goal
Minimal but extensible WebGL engine with:
- Math library (Vec2, Vec3, Mat4, Quat)
- WebGL2 abstraction layer
- Entity-Component-System
- Forward renderer with layer sorting
- Scene graph with transform hierarchy
- Input system
- Game loop with fixed timestep physics

## Development
```bash
ava dev "Build WebGL game engine" -t nova-engine -r playcanvas thief-engine -v
```
