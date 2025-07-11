import React from "react";
// Try this import for Tauri v2
import { getCurrentWindow } from "@tauri-apps/api/window";

// If the above doesn't work, try this for Tauri v1
// import { appWindow } from "@tauri-apps/api/window";

// Type declaration for Webkit app region
declare module "react" {
  interface CSSProperties {
    WebkitAppRegion?: "drag" | "no-drag";
  }
}

const buttonClass =
  "w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors select-none";

const CustomTitleBar: React.FC = () => {
  // For Tauri v2
  const handleMinimize = async () => {
    const window = getCurrentWindow();
    await window.minimize();
  };

  const handleMaximize = async () => {
    const window = getCurrentWindow();
    await window.toggleMaximize();
  };

  const handleClose = async () => {
    const window = getCurrentWindow();
    await window.close();
  };

  // For Tauri v1, use these instead:
  // const handleMinimize = () => appWindow.minimize();
  // const handleMaximize = () => appWindow.toggleMaximize();
  // const handleClose = () => appWindow.close();

  return (
    <div
      className="flex items-center justify-end px-2 h-10 bg-[hsl(var(--background))] select-none drag"
      style={{ WebkitAppRegion: "drag", userSelect: "none" }}
    >
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" }}>
        <button
          className={buttonClass}
          title="Minimize"
          onClick={handleMinimize}
        >
          <svg width="12" height="2" viewBox="0 0 12 2" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="12" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
        <button
          className={buttonClass}
          title="Maximize"
          onClick={handleMaximize}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
        <button
          className={buttonClass + " hover:bg-red-500 hover:text-white"}
          title="Close"
          onClick={handleClose}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default CustomTitleBar;