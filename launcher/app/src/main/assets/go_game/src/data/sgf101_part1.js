export const SGF101_NODE_3_1 = [
  // 3.1 一线吃子（8 关：逼向 1 路边线唯一方向）
  {
    id: 'u3-n1-l01',
    scaffoldMode: 'all_liberties',
    sgf: `(;GM[1]FF[4]SZ[7]GN[一线吃子 #1]C[别让小白逃向中间！从上方压住逼它走底线！]AB[cb][eb][ea]AW[db](;B[dc];W[da];B[ca]C[正解：二线富一线死，逼到 1 路就吃光啦！])(;B[da]C[失败];W[dc]C[失败：从边线打吃，白棋逃向中腹长出三口气啦！]))`,
  },
  {
    id: 'u3-n1-l02',
    scaffoldMode: 'all_liberties',
    sgf: `(;GM[1]FF[4]SZ[7]GN[一线吃子 #2]C[左边是墙角死路，选好方向把小白逼向左边线！]AB[bc][be][ae]AW[bd](;B[cd];W[ad];B[ac]C[正解：外侧挡住大路，白棋退到一线就被提走！])(;B[ad]C[失败];W[cd]C[失败：从一线打吃正好帮白棋往中间大路逃跑！]))`,
  },
  {
    id: 'u3-n1-l03',
    scaffoldMode: 'atari_only',
    sgf: `(;GM[1]FF[4]SZ[7]GN[一线吃子 #3]C[两颗小白在二线发抖，别放它们跑到三路去！]AB[bf][ef][ce][cg][fg]AW[cf][df](;B[de];W[dg];B[eg]C[正解：压在三路逼白棋退回一线，抱团提光！])(;B[dg]C[失败];W[de]C[失败：把白棋赶向三路，一下子长出好多气啦！]))`,
  },
  {
    id: 'u3-n1-l04',
    scaffoldMode: 'atari_only',
    sgf: `(;GM[1]FF[4]SZ[7]GN[一线吃子 #4]C[右边底线没有出路，找准打吃方向捉住小白！]AB[fb][fd][gd]AW[fc](;B[ec];W[gc];B[gb]C[正解：外侧逼住白棋往一线走，轻松拿下！])(;B[gc]C[失败];W[ec]C[失败：打吃反啦，白棋顺着三路逃出去了！]))`,
  },
  {
    id: 'u3-n1-l05',
    scaffoldMode: 'atari_only',
    sgf: `(;GM[1]FF[4]SZ[9]GN[一线吃子 #5]C[9×9 棋盘！快从三路打吃把小白关在底线！]AB[db][fb][fa]AW[eb](;B[ec];W[ea];B[da]C[正解：三路打吃把小白关在底线一路！])(;B[ea]C[失败];W[ec]C[失败：从一路打吃，白棋就逃向中腹咯！]))`,
  },
  {
    id: 'u3-n1-l06',
    scaffoldMode: 'atari_only',
    sgf: `(;GM[1]FF[4]SZ[9]GN[一线吃子 #6]C[二二点上的白子，要堵住宽敞外路往角落赶！]AB[cb][ba][ac]AW[bb](;B[bc];W[ab];B[aa]C[正解：先封住二路出头，把白棋逼进角落一线！])(;B[ab]C[失败];W[bc]C[失败：往外跑出二路，白棋长出三口气啦！]))`,
  },
  {
    id: 'u3-n1-l07',
    scaffoldMode: 'tap_inspect',
    sgf: `(;GM[1]FF[4]SZ[9]GN[一线吃子 #7]C[两颗白棋贴近右边线，封锁三路一网打尽！]AB[hc][hf][gd][ie][if]AW[hd][he](;B[ge];W[id];B[ic]C[正解：外侧连成一片把白棋压到一线吃掉！])(;B[id]C[失败];W[ge]C[失败：让白棋逃出三路，后面就捉不住咯！]))`,
  },
  {
    id: 'u3-n1-l08',
    scaffoldMode: 'tap_inspect',
    sgf: `(;GM[1]FF[4]SZ[9]GN[一线吃子 #8]C[底线两颗白子还想逃向三路，快封住断口！]AB[ch][fh][dg][ei]AW[dh][eh](;B[eg];W[di];B[ci]C[正解：从三路堵住断口，把白棋压在底线吃掉！])(;B[di]C[失败];W[eg]C[失败：打吃方向错啦，白棋顺势冲向中腹！]))`,
  },
];

export const SGF101_NODE_3_2 = [
  // 3.2 抱吃与门吃（8 关：4 关抱吃 + 4 关关门吃）
  {
    id: 'u3-n2-l01',
    scaffoldMode: 'all_liberties',
    sgf: `(;GM[1]FF[4]SZ[7]GN[抱吃 #1]C[学会“抱吃”！把小白赶向左边自己人多的怀抱里！]AB[ec][dd][bc][ce][cb]AW[dc](;B[db];W[cc];B[cd]C[正解：往自己人多的怀抱里赶，这就是“抱吃”！])(;B[cc]C[失败];W[db]C[失败：往里挡反而把白棋赶向宽敞的上方逃跑啦！]))`,
  },
  {
    id: 'u3-n2-l02',
    scaffoldMode: 'all_liberties',
    sgf: `(;GM[1]FF[4]SZ[7]GN[抱吃 #2]C[左边空荡荡，右边有埋伏，该从哪边打吃抱住它？]AB[db][ec][cd][ed][ce]AW[dc](;B[cc];W[dd];B[de]C[正解：堵住左路出口，把白棋抱进右边包围圈！])(;B[dd]C[失败];W[cc]C[失败：白棋往左逃向空旷地盘长气啦！]))`,
  },
  {
    id: 'u3-n2-l03',
    scaffoldMode: 'atari_only',
    sgf: `(;GM[1]FF[4]SZ[9]GN[抱吃 #3]C[两颗小白想往左边逃，堵住左路把它们抱进下方口袋！]AB[dd][ed][fe][ef][cf][eg][ch]AW[de][ee](;B[ce];W[df];B[dg]C[正解：封住左边大路，把小白抱进下方口袋！])(;B[df]C[失败];W[ce]C[失败：打吃方向错啦，白棋冲出左面逃走咯！]))`,
  },
  {
    id: 'u3-n2-l04',
    scaffoldMode: 'atari_only',
    sgf: `(;GM[1]FF[4]SZ[9]GN[抱吃 #4]C[右上角有黑棋铁壁接应，快把两颗小白赶过去！]AB[df][gf][eg][fg][gd][fc][dd][de][ge]AW[ef][ff](;B[ee];W[fe];B[fd]C[正解：堵住左边让白棋撞进上边怀抱，一口抱吃！])(;B[fe]C[失败];W[ee]C[失败：打吃反了，白棋顺着左上逃出重围！]))`,
  },
  {
    id: 'u3-n2-l05',
    scaffoldMode: 'atari_only',
    sgf: `(;GM[1]FF[4]SZ[7]GN[关门吃 #1]C[“关门吃”绝招！直接把门合上，让白棋插翅难飞！]AB[db][cc][cd][ed][ce][ee][df]AW[dc](;B[ec];W[dd];B[de]C[正解：关门打狗！白棋钻进门里也只有一口气啦！])(;B[dd]C[失败];W[ec]C[失败：没把门关上，白棋大摇大摆从右门溜走啦！]))`,
  },
  {
    id: 'u3-n2-l06',
    scaffoldMode: 'atari_only',
    sgf: `(;GM[1]FF[4]SZ[7]GN[关门吃 #2]C[下边门户大开，先合上大门把小白关在屋里！]AB[cc][db][eb][ed][fb][fd][gc]AW[dc](;B[dd];W[ec];B[fc]C[正解：先封住下方大门，白棋钻进门里只剩一口气！])(;B[ec]C[失败];W[dd]C[失败：没关好下边的门，白棋顺势往下逃走啦！]))`,
  },
  {
    id: 'u3-n2-l07',
    scaffoldMode: 'tap_inspect',
    sgf: `(;GM[1]FF[4]SZ[9]GN[关门吃 #3]C[两颗小白卡在门缝里，先关好右边的大门再提子！]AB[cc][cd][db][eb][fc][ee][df][ce][ef][ff]AW[dc][ec](;B[ed];W[dd];B[de]C[正解：精准关门！白棋撞在墙上无路可逃！])(;B[dd]C[失败];W[ed]C[失败：没关右边的门，白棋一头冲出去啦！]))`,
  },
  {
    id: 'u3-n2-l08',
    scaffoldMode: 'tap_inspect',
    sgf: `(;GM[1]FF[4]SZ[9]GN[关门吃 #4]C[找出这扇敞开的大门，一子关门吃掉两颗小白！]AB[dd][de][ec][fc][eb][gf][ge][ef]AW[ed][ee](;B[fd];W[fe];B[ff]C[正解：门一关上，里面只剩一口气啦！])(;B[fe]C[失败];W[fd]C[失败：这扇门没关严，白棋从右上角溜掉啦！]))`,
  },
];
