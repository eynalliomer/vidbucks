// Demo for Tpl-ShotFilm: "Ceylan Derisindeki Dünya" (Piri Reis) built from a hand-written visual treatment
// (public/shots/piri/visuals.json): 4 acts, 4 styles chosen for the story, 10 layouts, real licensed media per line.
import visuals from "../../../public/shots/piri/visuals.json";
import timing from "../../../public/shots/piri/timing.json";
import med from "../../../public/shots/piri/map_med.json";
import atl from "../../../public/shots/piri/map_atl.json";
import type { Visuals } from "./ShotFilm";
import type { MapData } from "../board/BoardFilm";
import type { KitTiming } from "../time";
export const shotVisuals = { ...(visuals as unknown as Visuals), maps: { med: med as unknown as MapData, atl: atl as unknown as MapData } } as Visuals;
export const shotTiming = timing as unknown as KitTiming;
