// Demo data for Tpl-BoardFilm: "Ceylan Derisindeki Dünya" (the Piri Reis map), silent; timing from a Turkish narration.
import board from "../../../public/board/piri/board.json";
import timing from "../../../public/board/piri/timing.json";
import atl from "../../../public/board/piri/map_atl.json";
import type { BoardCfg, MapData } from "./BoardFilm";
import type { KitTiming } from "../time";
export const boardDemo = { ...(board as unknown as BoardCfg), maps: { atl: atl as unknown as MapData } } as BoardCfg;
export const boardDemoTiming = timing as unknown as KitTiming;
