# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Levantando a Venezuela** is a social media content project producing bilingual (Spanish/English) informational carousel images about earthquake response and humanitarian support in Venezuela.

## Structure

```
Carrusel Terremotos/
  CarruselTeremotos2/   # Full-resolution PNG exports
  files/                # Compressed PNG exports (for social media upload)
  CarruselTeremotos2.zip
  files.zip
Git/                    # Git for Windows installation (not project content)
```

## File Naming Convention

All images follow the pattern: `c{carousel}_{slide}_{slide_name}.png`

- **`c1`–`c4`** — carousel number (topic/theme)
- **`_en_`** in the filename — English version; no `_en_` means Spanish
- **Slide names** — descriptive slug of the slide content

### Carousel Topics

| Carousel | Theme |
|----------|-------|
| c1 | Earthquake response actions (zonas, donaciones, sangre/voluntariado, reportar, inspección) |
| c2 | Foundations & supplies (fundaciones, insumos, empresas/difunde) |
| c3 | Foundations & direct contacts (fundaciones, contactos_directos) |
| c4 | Context: censorship & infrastructure (censura, infraestructura, contexto) |

### Slide Positions

Each carousel starts with `portada`/`cover` (slide 1) and ends with `cierre`/`close` (last slide). The number after the carousel prefix (e.g., `c2_3_`) is the slide's position in the sequence.

## Two Output Sizes

- `CarruselTeremotos2/` — larger files (~100–220 KB per image), full quality
- `files/` — smaller files (~40–100 KB per image), optimized for upload

When adding new carousels, export both sizes and name them consistently with the existing convention.
