# Chip-8 Duel Report: AVA vs CLAUDE — Analisis Real

## Token Breakdown: Donde gasto Ava sus 68K tokens

### Por modulo (tokens)
```
interpreter  20,350  (30%)  ← el mas caro: decoder + executor + instruction
cpu          12,780  (19%)
input        11,135  (16%)
memory        9,726  (14%)
timer         7,535  (11%)
display       6,934  (10%)
```

### Por tipo de bloque
```
ANALYZE (blueprints)    12,072  (18%)  ← 6 blueprints generados
IMPLEMENT (codigo)      56,709  (82%)  ← 25 tipos traducidos
INDEX (exports)              0   (0%)  ← generados sin LLM
```

### Claude: 11,613 tokens total
```
architecture     630   (5%)  ← 1 prompt para disenar modulos
memory.ts        691   (6%)
registers.ts     500   (4%)
display.ts       490   (4%)
keyboard.ts      395   (3%)
instruction.ts 2,867  (25%)  ← el mas caro: 35 opcodes decodificados
timers.ts        468   (4%)
cpu.ts         2,328  (20%)  ← segundo mas caro: execute loop
loader.ts        235   (2%)
speaker.ts       627   (5%)
emulator.ts    1,029   (9%)
app.ts         1,353  (12%)
```

**Ratio: Ava usa 5.9x mas tokens que Claude**

---

## Analisis Real del Codigo Generado

### CLAUDE: 11 archivos, 914 LOC

| Archivo | LOC | Metodos | Estado | Problemas |
|---------|-----|---------|--------|-----------|
| memory.ts | 60 | 8 | COMPLETO | Ninguno |
| registers.ts | 44 | 4 | COMPLETO | Import faltante: types.ts |
| display.ts | 51 | 5 | COMPLETO | Ninguno |
| keyboard.ts | 43 | 6 | COMPLETO | Import faltante: types.ts |
| instruction.ts | 83 | 3 | COMPLETO | Import faltante: types.ts |
| timers.ts | 56 | 8 | COMPLETO | Import no usado |
| cpu.ts | 250 | 9 | COMPLETO | **35/35 opcodes implementados** |
| loader.ts | 10 | 1 | COMPLETO | Ninguno |
| speaker.ts | 73 | 7 | COMPLETO | Import faltante: clock.ts |
| emulator.ts | 111 | 11 | COMPLETO | Import faltante: Clock |
| app.ts | 144 | 5 | COMPLETO | Constants no exportadas |

**Bugs criticos Claude: 3**
- types.ts no existe (u8, u12, u16 type aliases)
- clock.ts no existe (Speaker y Emulator lo importan)
- DISPLAY_WIDTH/DISPLAY_HEIGHT no exportados desde display.ts

**Todos los archivos estan funcionalmente completos, sin TODOs ni stubs.**

### AVA: 31 archivos, 2680 LOC

| Modulo | Archivos | LOC | Estado | Problemas Criticos |
|--------|----------|-----|--------|-------------------|
| cpu/ | 5 | 576 | PARCIAL | CpuState no existe, constructor Opcode incompatible |
| memory/ | 5 | 271 | COMPLETO | Ninguno critico |
| display/ | 5 | 349 | PARCIAL | Renderer stub, index incompleto |
| input/ | 5 | 334 | ROTO | KeyState enum inexistente, metodos estaticos fantasma |
| timer/ | 5 | 110 | COMPLETO | reset() no implementado |
| interpreter/ | 5 | 1063 | ROTO | CPU interface incompatible, Display/Keypad API inexistente |

**Bugs criticos Ava: 8+**
- CpuState interface no existe (cpu.ts lo importa)
- Executor referencia CPU.v[], CPU.pc, CPU.i que no existen en la clase Cpu
- Executor referencia Display.xorPixel() que no existe
- Executor referencia Keypad.isPressed() que no existe
- InputHandler llama Keypad.setKeyState() estatico inexistente
- InputHandler usa Key.K1 enum value inexistente
- Keypad usa KeyState.Pressed/Released que no son constantes
- Interpreter llama CPU.getPC(), CPU.setPC() que no existen

**~30% del codigo tiene incompatibilidades entre modulos.**

---

## Metricas Reales (no las vagas)

### 1. Compilabilidad (TSC --strict)

| Metrica | AVA | CLAUDE |
|---------|-----|--------|
| Archivos que compilan sin error | ~12/31 (39%) | ~6/11 (55%) |
| Errores por import faltante | ~15 | 5 |
| Errores por interface incompatible | ~20+ | 0 |
| Archivos standalone (sin deps rotas) | 15/31 | 8/11 |

**CLAUDE gana en compilabilidad.**

### 2. Coherencia Inter-modulo

| Metrica | AVA | CLAUDE |
|---------|-----|--------|
| Modulos que se importan correctamente entre si | 2/6 (memory, timer) | 8/11 (73%) |
| APIs que matchean entre caller y callee | ~50% | ~90% |
| Archivos fantasma importados | 3 (CpuState, etc) | 2 (types.ts, clock.ts) |

**CLAUDE gana en coherencia.** Claude genera modulo a modulo con contexto acumulativo, asi que los imports son mas consistentes.

### 3. Completeness de Opcodes

| Metrica | AVA | CLAUDE |
|---------|-----|--------|
| Opcodes en cpu.ts/executor | 35 (en executor.ts) | 35 (en cpu.ts) |
| Opcodes realmente ejecutables | ~20 (APIs rotas) | ~33 (2 missing files) |
| Logica correcta por opcode | ~70% | ~95% |

**CLAUDE gana en opcodes ejecutables.** Aunque ambos "declaran" 35, los de Ava no pueden ejecutar porque Executor llama metodos que no existen.

### 4. Estructura y Arquitectura

| Metrica | AVA | CLAUDE |
|---------|-----|--------|
| Archivos | 31 | 11 |
| Modulos logicos | 6 | ~6 (pero planos) |
| Separacion de concerns | Alta (pero rota) | Media (pero funcional) |
| Index/barrel exports | 6 (todos incompletos) | 0 (no necesita) |
| Clases utiles reales | ~18 | 11 |
| Clases de relleno | ~7 (Pixel, Sprite, Renderer no son Chip-8) | 0 |

**AVA tiene mejor estructura pero genera clases que no son Chip-8** (Pixel con RGBA, Sprite con texturas, Renderer con scene graph). Un Chip-8 no necesita eso.

### 5. Eficiencia

| Metrica | AVA | CLAUDE |
|---------|-----|--------|
| Tokens totales | 68,194 | 11,613 |
| Tokens por LOC util | 25.4 tok/LOC | 12.7 tok/LOC |
| Tokens desperdiciados en blueprints | 12,072 (18%) | 0 |
| Tokens en codigo que no compila | ~30,000 (44%) | ~3,000 (26%) |
| Tiempo total | 82.2s | 31.6s |

**CLAUDE es 2x mas eficiente en tokens/LOC y 2.6x mas rapido.**

---

## Veredicto Honesto

### Score Revisado (100 pts)

| Criterio | Peso | AVA | CLAUDE | Razon |
|----------|------|-----|--------|-------|
| Opcodes ejecutables | 30 | 12 | 28 | Claude: 33/35 vs Ava: ~20/35 realmente ejecutables |
| Compilabilidad | 25 | 8 | 18 | Claude: 55% vs Ava: 39% archivos limpios |
| Coherencia inter-modulo | 20 | 6 | 16 | Claude: 90% APIs coherentes vs Ava: 50% |
| Arquitectura | 15 | 12 | 8 | Ava: mejor separacion (pero sobre-engineered) |
| Eficiencia (tokens) | 10 | 3 | 9 | Claude: 6x menos tokens |
| **TOTAL** | **100** | **41** | **79** | |

### GANADOR REAL: CLAUDE (79 vs 41)

---

## Por que Ava pierde

1. **Blueprint genera tipos genéricos, no Chip-8**: La pipeline de Ava genera blueprints "desde el spec" pero el LLM infiere tipos genericos (Pixel con RGBA, Sprite con texturas, Renderer con scene graph). Un Chip-8 no usa nada de eso.

2. **Cada tipo se traduce en aislamiento**: El traductor ve UN tipo + blueprint, no ve los otros tipos ya generados. Esto causa las incompatibilidades de API (Executor llama CPU.v[] pero Cpu tiene Registers.get()).

3. **18% de tokens se van en blueprints**: 12K tokens generando YAMLs que luego producen codigo incompatible.

4. **Sin contexto acumulativo**: Claude pasa las signatures de modulos previos al siguiente. Ava no — cada tipo es "self-contained" lo cual suena bien en teoria pero produce interfaces que no encajan.

## Por que Claude gana

1. **Contexto acumulativo**: Cada modulo ve las signatures del anterior, asi que los imports son coherentes.
2. **Un archivo = un modulo**: Sin fragmentacion innecesaria (no necesitas Pixel, Sprite, Renderer para un Chip-8).
3. **Eficiencia**: 12K tokens vs 68K para un resultado mejor.
4. **cpu.ts es correcto**: Los 35 opcodes estan en un switch limpio que referencia las clases reales.

## Que necesita Ava para ganar

1. **Contexto inter-tipo**: El traductor debe recibir las signatures de tipos ya generados (como Claude hace).
2. **Blueprint mas especifico**: No generar tipos genericos — respetar el dominio (Chip-8 no tiene Pixel RGBA).
3. **Validacion post-generacion**: Detectar imports rotos antes de continuar al siguiente tipo.
4. **Menos fragmentacion**: No crear 5 archivos donde 2 bastan.
