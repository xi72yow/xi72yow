# Hey, I'm xi72yow

From embedded systems through Linux and security tooling to DevOps, web apps, and developer experience. I build what's needed.

## Selected Projects

### [sei](https://github.com/xi72yow/sei)

Manages environment variables securely by storing them in GNOME Keyring instead of plaintext .env files. Provides a TUI for editing and a CLI for injecting secrets into applications.

<p align="center"><img src="https://github.com/user-attachments/assets/5d2d0e94-cc7f-4601-b2af-7d8f1e2e6797" alt="sei" width="600"></p>

**Tech:** Rust, Shell, Dockerfile

<details><summary>Recent activity</summary>

- `2026-04-27` fix: strip surrounding quotes from .env values on parse
- `2026-04-18` build(deps): Bump actions/upload-pages-artifact from 4 to 5
- `2026-04-18` build(deps): Bump softprops/action-gh-release from 2 to 3

</details>

### [desktop-drac](https://github.com/xi72yow/desktop-drac)

A Linux-specific fork of GitHub Desktop, synchronized with the official upstream repository and adapted for compatibility with a custom Linux distribution.

<p align="center"><img src="https://github.com/user-attachments/assets/211838b3-89d7-4a07-97c9-32ed612d0b35" alt="desktop-drac" width="600"></p>

**Tech:** TypeScript, SCSS, JavaScript

<details><summary>Recent activity</summary>

- `2026-04-09` fix: adapt upstream tests for linux fork
- `2026-04-09` Use pathToFileURL for Windows import path
- `2026-04-09` Fix Copilot CLI import on Windows

</details>

### [ScreenChaser](https://github.com/xi72yow/ScreenChaser)

ScreenChaser is a Rust-based bias lighting daemon for Linux that uses the Wayland XDG Desktop Portal to capture screen content, processes colors with GPU-accelerated wgpu compute shaders, and streams the output to WLED devices via UDP. It includes a webview frontend for LED configuration, device scanning, and live previews, all within a lightweight native binary.

<p align="center"><video src="https://user-images.githubusercontent.com/65042627/210893593-29b303a0-6971-4d15-9e41-3c11cf5573cd.mp4" width="600" autoplay loop muted></video></p>

**Tech:** Rust, TypeScript, JavaScript

<details><summary>Recent activity</summary>

- `2026-04-18` fix: make APP_VERSION declaration global for tsc
- `2026-04-18` docs: fix binary vs deb size claim in readme
- `2026-04-18` ci: bump frontend package.json version during release

</details>

### [input-remapper-rs](https://github.com/xi72yow/input-remapper-rs)

A Rust-based tool for remapping input device events at the kernel level using evdev and uinput. Supports multi-device mapping, terminal-based configuration, and integration with systemd on Linux systems.

<p align="center"><img src="https://github.com/user-attachments/assets/78a50482-9e85-4baa-ab16-6cafa35e1031" alt="input-remapper-rs" width="600"></p>

**Tech:** Rust, Shell, Dockerfile

<details><summary>Recent activity</summary>

- `2026-03-30` chore(deps): bump the all-actions group with 4 updates
- `2026-03-30` chore: align dependabot (monthly, grouped, explicit deps)
- `2026-03-28` fix: mount host /dev into test container for uinput device visibility

</details>

---

*Last updated: 2026-05-18*
