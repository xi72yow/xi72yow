# Blechblender

Browser-based license plate retouching. Drop in a photo, mark the four corners
of a plate and replace it with a black bar, a blur or a realistic dummy plate —
all client-side, the image never leaves your machine.

**Live demo: [blechblender.reinke.ing](https://blechblender.reinke.ing/)**

![Screenshot](https://raw.githubusercontent.com/xi72yow/blechblender/main/docs/screenshot.jpg)

## Features

- **Three effects** — solid black bar, adjustable blur, or a generated dummy
  plate rendered in perspective onto the marked quad.
- **Perspective mapping** — a 4-point homography warps the effect onto the plate
  no matter how the car is angled; every corner stays draggable after placement.
- **European plate templates** — Germany (standard, dealer, tax-exempt,
  short-term) plus Austria, Switzerland, France, Netherlands, Poland, Italy,
  Spain and Belgium, each with the correct EU band and country code.
- **Authentic German plates** — real FE-Schrift (self-hosted, see below),
  registration seal, HU/TÜV inspection sticker for rear plates, season plates
  and embossed glyphs at FZV-correct proportions.
- **Plate holder** — optional plastic frame with a custom print line
  (dealer name, website, …).
- **Photo integration** — the generated plate adopts the white tone and the
  light falloff sampled from the covered region, plus optional wear/patina, so
  it blends into the scene instead of looking like a sticker.
- **Non-destructive editing** — apply multiple regions, undo per step, reset all,
  then download the result as JPEG.

Keyboard: `Enter` apply · `Esc` discard selection · `Ctrl/⌘ Z` undo.

## Development

Requires Node 25 and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm dev        # dev server on http://localhost:5173
pnpm build      # production build into dist/
pnpm preview    # preview the production build
```

## Container

Multi-stage build; the runtime image serves the static `dist/` with a small
Node server on port 3000.

```bash
podman build -f Containerfile -t blechblender .
podman run --rm -p 3000:3000 blechblender
```

## Fonts

German plates use **GL-Nummernschild** by
[Gutenberg Labo](https://github.com/Gutenberg-Labo/GL-Nummernschild), a free
rendering of the official FE-Schrift (FZV Anlage 4). The font files are hosted
in `src/assets/fonts/`; the license permits unlimited use, copying and
distribution, commercial or not (see `GL-Nummernschild-LICENSE.txt`).

## Privacy

Everything runs in the browser. Images are processed on a local `<canvas>` and
are never uploaded.