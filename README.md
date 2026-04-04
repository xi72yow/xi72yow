# Hey, I'm xi72yow

From embedded systems to web apps, from security tooling to Linux infrastructure, from DevOps to developer experience. I build what's needed.

## Selected Projects

### [desktop-drac](https://github.com/xi72yow/desktop-drac)

A Linux-specific fork of GitHub Desktop, maintained to integrate with a custom Linux distribution and synchronized with the official GitHub Desktop repository. Built using TypeScript, React, and Electron.

<img src="https://github.com/xi72yow/desktop-drac/actions/workflows/ci-linux.yml/badge.svg" alt="desktop-drac" width="600">

**Tech:** TypeScript, SCSS, JavaScript

<details><summary>Recent activity</summary>

- `2026-03-18` Update build-default-menu.ts
- `2026-03-17` chore: lint
- `2026-03-12` fix: increase RecentRepositoriesLength to 7

</details>

### [sei](https://github.com/xi72yow/sei)

A tool for managing environment secrets securely by storing them in GNOME Keyring instead of plaintext `.env` files. Provides a TUI for editing and a CLI for injecting secrets, ensuring they remain inaccessible to file-based tools like AI agents, scanners, and version control systems.

<img src="https://github.com/user-attachments/assets/5d2d0e94-cc7f-4601-b2af-7d8f1e2e6797" alt="sei" width="600">

**Tech:** Rust, Shell, Dockerfile

<details><summary>Recent activity</summary>

- `2026-03-29` Update README with image and command usage details
- `2026-03-29` Update README.md
- `2026-03-29` Update README to remove old examples

</details>

### [input-remapper-rs](https://github.com/xi72yow/input-remapper-rs)

A Rust-based tool for remapping input device events at the kernel level using evdev and uinput, designed for devices like MMO mice and Azeron keypads. It supports Wayland and X11, offers a terminal-based UI for configuration, and is compatible with input-remapper preset files.

<img src="https://github.com/user-attachments/assets/78a50482-9e85-4baa-ab16-6cafa35e1031" alt="input-remapper-rs" width="600">

**Tech:** Rust, Shell, Dockerfile

<details><summary>Recent activity</summary>

- `2026-03-30` chore: align dependabot (monthly, grouped, explicit deps)
- `2026-03-28` fix: mount host /dev into test container for uinput device visibility
- `2026-03-28` fix: modprobe uinput on runner, not inside container

</details>

### [ScreenChaser](https://github.com/xi72yow/ScreenChaser)

ScreenChaser is a system for controlling Neopixel (WS2812B) LEDs using a PC and local network. It consists of firmware, a core for mediating between the user and LEDs, and a graphical user interface for configuration, with plans for CLI support in future versions.

<video src="https://user-images.githubusercontent.com/65042627/210893593-29b303a0-6971-4d15-9e41-3c11cf5573cd.mp4" width="600" autoplay loop muted></video>

**Tech:** TypeScript, JavaScript, C

<details><summary>Recent activity</summary>

- `2024-03-17` Update README.md
- `2024-02-18` chore: bump deps
- `2023-08-30` chore(app): disable auto scan

</details>

---

*Last updated: 2026-04-04*
