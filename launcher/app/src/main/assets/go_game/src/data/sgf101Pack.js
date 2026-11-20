import { parseSgfCollection, sgfTreeToLevel } from '../engine/sgfParser.js';
import { SGF101_NODE_3_1, SGF101_NODE_3_2 } from './sgf101_part1.js';
import { SGF101_NODE_3_3, SGF101_NODE_3_4 } from './sgf101_part2.js';

function convertNodeSgfList(items, nodeId) {
  return items.map((item) => {
    const [root] = parseSgfCollection(item.sgf);
    return sgfTreeToLevel(root, {
      id: item.id,
      unitId: 3,
      nodeId,
      scaffoldMode: item.scaffoldMode,
      target: 'capture',
    });
  });
}

export const UNIT3_SGF_LEVELS = [
  ...convertNodeSgfList(SGF101_NODE_3_1, '3.1'),
  ...convertNodeSgfList(SGF101_NODE_3_2, '3.2'),
  ...convertNodeSgfList(SGF101_NODE_3_3, '3.3'),
  ...convertNodeSgfList(SGF101_NODE_3_4, '3.4'),
];

export const SAMPLE_101_SGF = [
  SGF101_NODE_3_1[0].sgf,
  SGF101_NODE_3_2[4].sgf,
  SGF101_NODE_3_3[0].sgf,
  SGF101_NODE_3_4[4].sgf,
].join('\n\n');
