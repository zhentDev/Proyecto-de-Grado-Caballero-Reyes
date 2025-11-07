import { listen, type Event } from "@tauri-apps/api/event";

listen("evento_background", (event: Event<unknown>) => {
  console.log("Nuevo evento:", event.payload);
});
