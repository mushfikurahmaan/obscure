# Obscure

A Tauri + React (Vite) desktop application.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Rust & Cargo](https://www.rust-lang.org/tools/install)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites/)

### Install Dependencies
```bash
cd root
npm install
# or
yarn install
```

### Start the Development Server
```bash
npm run dev
# or
yarn dev
```

This will start both the Vite dev server and the Tauri app in development mode.

### Build for Production
```bash
npm run build
# or
yarn build
```

### Run Tauri App Only
```bash
npm run tauri dev
# or
yarn tauri dev
```

## Configuration
- App configuration is in `src-tauri/tauri.conf.json`.
- Environment variables can be set in `.env` files at the project root.

## Troubleshooting

### Cleaning Build Artifacts
- If you encounter strange build issues, especially after changing dependencies or configuration, first try cleaning the build artifacts by deleting the `target` directory in `src-tauri`.

### Windows Build Errors

#### Icon Format Error (`RC2175`)
If you see an error like `error RC2175 : resource file ... is not in 3.00 format` during a Windows build, it means the `.ico` file specified in `tauri.conf.json` is not in a format that the Windows resource compiler understands.

**Solution:**
1.  Use a single, high-resolution **`.png`** file for your application icon (512x512px or larger is recommended for sharpness).
2.  Update your `src-tauri/tauri.conf.json` to point to this `.png` file:
    ```json
    "bundle": {
      "icon": [
        "../src/assets/favicon/your-icon.png"
      ]
    }
    ```
3.  Tauri's bundler will automatically generate a correctly formatted, multi-resolution `.ico` file during the build process.

#### Missing Icon Error (`Couldn't find a .ico icon`)
If the build completes but fails at the final bundling step with an error about a missing `.ico` file, it's often caused by a version mismatch between Tauri's frontend and backend packages.

**Solution:**
1.  Check for version compatibility between `@tauri-apps/cli` in `package.json` and the `tauri` crate in `src-tauri/Cargo.toml`.
2.  Ensure they are aligned. For example, if you are using a `2.x` version of the CLI, your Rust dependencies should also be on a compatible `2.x` version (e.g., `2.0.0-rc.x`).
3.  After updating `src-tauri/Cargo.toml`, run `cargo update` inside the `src-tauri` directory to fetch the new crate versions before building again.

- For more, see the [Tauri docs](https://tauri.app/) and [Vite docs](https://vitejs.dev/). 