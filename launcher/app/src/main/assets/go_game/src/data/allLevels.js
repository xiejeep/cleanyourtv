import { UNIT1_LEVELS } from './unit1Levels.js';
import { UNIT2_LEVELS } from './unit2Levels.js';
import { UNIT3_SGF_LEVELS } from './sgf101Pack.js';

export const ALL_LEVELS = [...UNIT1_LEVELS, ...UNIT2_LEVELS, ...UNIT3_SGF_LEVELS];

const LEVEL_MAP = new Map(ALL_LEVELS.map((l) => [l.id, l]));

export function getLevelById(id) {
  return LEVEL_MAP.get(id) || null;
}

export function getLevelsByNode(nodeId) {
  return ALL_LEVELS.filter((l) => l.nodeId === nodeId);
}
