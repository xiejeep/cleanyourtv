export const UNITS = [
  {
    id: 1,
    title: '第 1 单元：气与吃子大冒险',
    subtitle: '认识棋子的呼吸，一口吃掉小对手！',
    badge: 'UNIT 1 · 5×5 / 7×7',
  },
  {
    id: 2,
    title: '第 2 单元：逃跑、连接与虎口防线',
    subtitle: '学会长气求生、手拉手合作与识破虎口陷阱！',
    badge: 'UNIT 2 · 5×5 / 7×7',
  },
  {
    id: 3,
    title: '第 3 单元：101 经典吃子绝招（SGF）',
    subtitle: '掌握一线吃、抱吃门吃、双打吃与 19 路枷吃征子！',
    badge: '101 题库 · 7×7 / 9×9 / 19×19',
  },
];

export const NODES = [
  {
    id: '1.1',
    unitId: 1,
    title: '棋子的呼吸',
    shortDesc: '认识“气”在哪里，找出只剩一口气发抖的棋子',
    icon: '🫧',
    badgeId: 'badge-1-1',
    sessions: [
      { id: '1.1-s1', title: '第 1 节：数一数有几口气', levelRange: [0, 6] },
      { id: '1.1-s2', title: '第 2 节：谁在发抖快帮忙', levelRange: [6, 12] },
    ],
  },
  {
    id: '1.2',
    unitId: 1,
    title: '一口吃掉你',
    shortDesc: '堵住最后一口气，把对方棋子变成你的战利品',
    icon: '😋',
    badgeId: 'badge-1-2',
    sessions: [
      { id: '1.2-s1', title: '第 1 节：一口吃掉单颗子', levelRange: [0, 5] },
      { id: '1.2-s2', title: '第 2 节：找出真假一口气', levelRange: [5, 10] },
      { id: '1.2-s3', title: '第 3 节：2 步追吃大作战', levelRange: [10, 15] },
    ],
  },
  {
    id: '1.3',
    unitId: 1,
    title: '抱团大作战',
    shortDesc: '连在一起的棋子共用“气”，一次吃掉一整串！',
    icon: '🍡',
    badgeId: 'badge-1-3',
    sessions: [
      { id: '1.3-s1', title: '第 1 节：吃掉并排两颗子', levelRange: [0, 5] },
      { id: '1.3-s2', title: '第 2 节：三子四子整块提', levelRange: [5, 10] },
      { id: '1.3-s3', title: '第 3 节：围堵抱团连续追击', levelRange: [10, 15] },
    ],
  },
  {
    id: '1.4',
    unitId: 1,
    title: '谁先下手为强',
    shortDesc: '双方都危急时先手吃子，并挑战第 1 单元 Boss 战！',
    icon: '👑',
    isBossNode: true,
    badgeId: 'badge-1-4',
    sessions: [
      { id: '1.4-s1', title: '第 1 节：互吃对杀谁更快', levelRange: [0, 5] },
      { id: '1.4-s2', title: '第 2 节：两气比拼紧气胜', levelRange: [5, 10] },
      { id: '1.4-s3', title: '第 3 节：破眼绝杀与 Boss 战', levelRange: [10, 15] },
    ],
  },
  {
    id: '2.1',
    unitId: 2,
    title: '快快逃跑吧',
    shortDesc: '被打吃时向空旷大路长气逃跑，避开边角死路',
    icon: '🏃',
    badgeId: 'badge-2-1',
    sessions: [
      { id: '2.1-s1', title: '第 1 节：长出新气变强壮', levelRange: [0, 5] },
      { id: '2.1-s2', title: '第 2 节：小心边角假逃跑', levelRange: [5, 10] },
      { id: '2.1-s3', title: '第 3 节：连续突出重围', levelRange: [10, 15] },
    ],
  },
  {
    id: '2.2',
    unitId: 2,
    title: '手拉手好朋友',
    shortDesc: '把孤单棋子连回大部队，同时学会切断坏对手',
    icon: '🤝',
    badgeId: 'badge-2-2',
    sessions: [
      { id: '2.2-s1', title: '第 1 节：连回温暖大部队', levelRange: [0, 5] },
      { id: '2.2-s2', title: '第 2 节：一子牵手救两块', levelRange: [5, 10] },
      { id: '2.2-s3', title: '第 3 节：找到断点冲断它', levelRange: [10, 15] },
    ],
  },
  {
    id: '2.3',
    unitId: 2,
    title: '危险的虎口',
    shortDesc: '认出三颗子张开的“大老虎嘴”，不跳坑还要学会造虎口',
    icon: '🐯',
    badgeId: 'badge-2-3',
    sessions: [
      { id: '2.3-s1', title: '第 1 节：躲开白棋老虎嘴', levelRange: [0, 5] },
      { id: '2.3-s2', title: '第 2 节：造出虎口守断点', levelRange: [5, 11] },
      { id: '2.3-s3', title: '第 3 节：虎口攻防小连招', levelRange: [11, 15] },
    ],
  },
  {
    id: '2.4',
    unitId: 2,
    title: '禁入点与反吃陷阱',
    shortDesc: '掌握不能自杀和神奇的“反吃”，迎战 7×7 终极 Boss！',
    icon: '🏆',
    isBossNode: true,
    badgeId: 'badge-2-4',
    sessions: [
      { id: '2.4-s1', title: '第 1 节：识别禁入安全线', levelRange: [0, 5] },
      { id: '2.4-s2', title: '第 2 节：绝境反吃大逆转', levelRange: [5, 11] },
      { id: '2.4-s3', title: '第 3 节：7×7 吃子王 Boss 战', levelRange: [11, 15] },
    ],
  },
  {
    id: '3.1',
    unitId: 3,
    title: '一线吃子',
    shortDesc: '“二线富、一线死”，学会把对手逼向 1 路底线死路',
    icon: '🧱',
    badgeId: 'badge-3-1',
    sessions: [
      { id: '3.1-s1', title: '第 1 节：7×7 逼向底线吃', levelRange: [0, 4] },
      { id: '3.1-s2', title: '第 2 节：9×9 边角一线吃', levelRange: [4, 8] },
    ],
  },
  {
    id: '3.2',
    unitId: 3,
    title: '抱吃与门吃',
    shortDesc: '往自己厚壁赶的“抱吃”与一子封门的“关门吃”',
    icon: '🚪',
    badgeId: 'badge-3-2',
    sessions: [
      { id: '3.2-s1', title: '第 1 节：往怀抱里赶（抱吃）', levelRange: [0, 4] },
      { id: '3.2-s2', title: '第 2 节：合上大门（关门吃）', levelRange: [4, 8] },
    ],
  },
  {
    id: '3.3',
    unitId: 3,
    title: '双打吃',
    shortDesc: '一石二鸟！一子同时叫吃两块白棋，救左丢右',
    icon: '⚡',
    badgeId: 'badge-3-3',
    sessions: [
      { id: '3.3-s1', title: '第 1 节：7×7 一石二鸟', levelRange: [0, 4] },
      { id: '3.3-s2', title: '第 2 节：9×9 双打吃实战', levelRange: [4, 8] },
    ],
  },
  {
    id: '3.4',
    unitId: 3,
    title: '征子与枷吃初探',
    shortDesc: '扭羊头连续追吃，与 19 路实战角落的“天罗地网”枷吃！',
    icon: '🕸️',
    badgeId: 'badge-3-4',
    sessions: [
      { id: '3.4-s1', title: '第 1 节：扭羊头大征子', levelRange: [0, 3] },
      { id: '3.4-s2', title: '第 2 节：19 路角落枷吃绝招', levelRange: [3, 6] },
    ],
  },
];

export const STONE_SKINS = [
  { id: 'dango', name: '呆萌团子', desc: '自带小眼睛和冒汗表情，最受小朋友喜爱', price: 0, preview: '🐼' },
  { id: 'alien', name: '星际小兽', desc: '软萌外星耳朵和荧光大眼，能量满满', price: 40, preview: '👾' },
  { id: 'yunzi', name: '经典云子', desc: '温润玉石质感棋子，过渡到真实围棋', price: 60, preview: '⚫' },
];

export const BOARD_THEMES = [
  { id: 'bamboo', name: '青青竹林', desc: '清新护眼嫩竹绿，阿竹的家园', price: 0, preview: '🎋' },
  { id: 'wood', name: '暖暖原木', desc: '经典榧木棋盘暖色调，阳光温馨', price: 30, preview: '🪵' },
  { id: 'starry', name: '梦幻星空', desc: '深邃夜空与发光星线，炫酷宇宙感', price: 50, preview: '🌌' },
];

export const BADGES = [
  { id: 'badge-1-1', name: '小小呼吸师', desc: '通关 1.1 棋子的呼吸', icon: '🫧' },
  { id: 'badge-1-2', name: '一口吃掉王', desc: '通关 1.2 一口吃掉你', icon: '😋' },
  { id: 'badge-1-3', name: '抱团神投手', desc: '通关 1.3 抱团大作战', icon: '🍡' },
  { id: 'badge-1-4', name: '吃子小英雄', desc: '击败第 1 单元 5×5 Boss', icon: '👑' },
  { id: 'badge-2-1', name: '疾风逃跑侠', desc: '通关 2.1 快快逃跑吧', icon: '🏃' },
  { id: 'badge-2-2', name: '牵手连接官', desc: '通关 2.2 手拉手好朋友', icon: '🤝' },
  { id: 'badge-2-3', name: '虎口守护者', desc: '通关 2.3 危险的虎口', icon: '🐯' },
  { id: 'badge-2-4', name: '小棋圣毕业徽章', desc: '击败第 2 单元 7×7 终极 Boss', icon: '🏆' },
  { id: 'badge-3-1', name: '一线小能手', desc: '通关 3.1 一线吃子专题', icon: '🧱' },
  { id: 'badge-3-2', name: '关门大弟子', desc: '通关 3.2 抱吃与门吃专题', icon: '🚪' },
  { id: 'badge-3-3', name: '双打吃大师', desc: '通关 3.3 双打吃专题', icon: '⚡' },
  { id: 'badge-3-4', name: '101 吃子王', desc: '通关第 3 单元征子与枷吃', icon: '🕸️' },
];
