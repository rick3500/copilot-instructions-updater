# Copilot Instructions Updater

This extension helps you manage and update `.github/copilot-instructions.md` files in your projects.  
Features:
- Prompt to update copilot-instructions.md from a local file or GitHub URL
- Save and select favorites for different projects
- Safe file writing: prompts before overwriting existing files
- Cross-platform support (Windows, Mac)

## Usage

- On startup, or via the command palette, choose your copilot-instructions.md source.
- Save frequently used sources as favorites for quick access.
- The extension will only overwrite files if you confirm.

## Settings

- Favorites are stored in VS Code global settings under `copilotInstructionsUpdater.favorites`.

## Release Notes

### 0.0.1
- Initial release with favorites and safe file writing.
