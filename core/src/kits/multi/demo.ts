// Demos for MultiStyle: the Piri Reis script directed automatically (tools/style_director.py + segment_draft.py).
// Tpl-MultiStyle = the director's default choice; Tpl-MultiStyle-Many = the same script with --switch-cost 0 (capacity test).
import timing from "../../../public/multi/piri/timing.json";
import edit from "../../../public/multi/piri/edit.json";
import editMany from "../../../public/multi/piri/edit_many.json";
import type { Edit } from "./MultiStyle";
import type { KitTiming } from "../time";
export const multiTiming = timing as unknown as KitTiming;
export const multiEdit = edit as unknown as Edit;
export const multiEditMany = editMany as unknown as Edit;
