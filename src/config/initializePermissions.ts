import { invoke } from "@tauri-apps/api/core";
import { TrayIcon } from "@tauri-apps/api/tray";
import { Menu } from "@tauri-apps/api/menu";
import { defaultWindowIcon } from "@tauri-apps/api/app";

import { listen } from "@tauri-apps/api/event";
listen("evento_background", (event) => {
  console.log("Nuevo evento:", event.payload);
});

const menu = await Menu.new({
  items: [
    {
      id: "quit",
      text: "Quit",
    },
  ],
});

const options = {
  menu,
  menuOnLeftClick: true,
  //   icon: await defaultWindowIcon(),
};

const tray = await TrayIcon.new(options);

// const tray = await TrayIcon.new({ tooltip: 'awesome tray tooltip' });
// tray.setTooltip("new tooltip")

const getFromRust = async (path: string) => {
  try {
    await invoke("set_write_permission", { path });
    await invoke("set_read_permission", { path });
    return await invoke("set_remove_permission", { path });
  } catch (err) {
    console.error("getFromRust", err);
  }

  return "";
};

export async function getEnv(path: string | null) {
  if (!path) return;
  const normalizedPath = `${path.replace(/\\/g, "/")}/**/*`;

  await getFromRust(normalizedPath);

  return normalizedPath;
}
