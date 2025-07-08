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
- If you rename folders or move files, clean build artifacts by deleting the `target` directory in `src-tauri`.
- For more, see the [Tauri docs](https://tauri.app/) and [Vite docs](https://vitejs.dev/). 