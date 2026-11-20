export const SGF101_NODE_3_3 = [
  // 3.3 双打吃（8 关：一子两叫吃，含双应对正解分支）
  {
    id: 'u3-n3-l01',
    scaffoldMode: 'all_liberties',
    sgf: `(;GM[1]FF[4]SZ[7]GN[双打吃 #1]C[神奇的“双打吃”！落一子让两颗白棋同时发抖！]AB[bc][cd][ed]AW[cc][dd](;B[dc](;W[cb];B[de]C[正解：白棋救左边的，我们就吃掉右边的！])(;W[de];B[cb]C[正解：白棋救右边的，我们就吃掉左边的！]))(;B[cb]C[失败];W[dc]C[失败：只打吃一边，白棋手拉手连在一起啦！]))`,
  },
  {
    id: 'u3-n3-l02',
    scaffoldMode: 'all_liberties',
    sgf: `(;GM[1]FF[4]SZ[7]GN[双打吃 #2]C[找出两颗小白共同的断点，一石二鸟双打吃！]AB[db][ec][fd][ef]AW[dc][ed](;B[dd](;W[cc];B[ee]C[正解：一子双打吃，顾左顾不了右！])(;W[ee];B[cc]C[正解：白棋跑掉上面，下面这颗归我们啦！]))(;B[cc]C[失败];W[dd]C[失败：白棋顺利连接成一个大部队咯！]))`,
  },
  {
    id: 'u3-n3-l03',
    scaffoldMode: 'atari_only',
    sgf: `(;GM[1]FF[4]SZ[7]GN[双打吃 #3]C[斜角里的两颗白子都有漏洞，一子同时叫吃两块！]AB[bd][cc][dc][af][bf]AW[cd][be](;B[ce](;W[dd];B[ae]C[正解：双打吃成功！白棋左边逃不掉啦！])(;W[ae];B[dd]C[正解：白棋连回左边，中间这颗立刻提掉！]))(;B[dd]C[失败];W[ce]C[失败：白棋一连接，两颗棋子都变安全啦！]))`,
  },
  {
    id: 'u3-n3-l04',
    scaffoldMode: 'atari_only',
    sgf: `(;GM[1]FF[4]SZ[7]GN[双打吃 #4]C[左边抱团的白子和右边单子，哪个点能同时打吃它们？]AB[ab][bb][cb][ac][bd][eb][fc]AW[bc][cc][ec](;B[dc](;W[cd];B[ed]C[正解：同时叫吃两块！右边白棋被吃掉啦！])(;W[ed];B[cd]C[正解：大丰收！一口吃掉左边两颗白子！]))(;B[cd]C[失败];W[dc]C[失败：没打中共同弱点，白棋全部连成一片啦！]))`,
  },
  {
    id: 'u3-n3-l05',
    scaffoldMode: 'atari_only',
    sgf: `(;GM[1]FF[4]SZ[9]GN[双打吃 #5]C[9×9 棋盘双打吃！找准同时威胁两颗白子的交叉点！]AB[db][ec][fd][ef][ff]AW[dc][ed][gf](;B[dd](;W[cc];B[ee]C[正解：漂亮的双打吃，必吃其一！])(;W[ee];B[cc]C[正解：一石二鸟，轻松吃子！]))(;B[cc]C[失败];W[dd]C[失败：白棋粘起来变成铁板一块啦！]))`,
  },
  {
    id: 'u3-n3-l06',
    scaffoldMode: 'atari_only',
    sgf: `(;GM[1]FF[4]SZ[9]GN[双打吃 #6]C[用双打吃拆散这群白棋，无论阿竹怎么救都会丢子！]AB[dd][cd][cf][dg][ef][ge][fd]AW[de][df][fe](;B[ee](;W[ce];B[ff]C[正解：吃掉右边白棋，双打吃大显神威！])(;W[ff];B[ce]C[正解：一口提掉左边两颗抱团白子！]))(;B[ce]C[失败];W[ee]C[失败：没有同时打吃，白棋牵手回家啦！]))`,
  },
  {
    id: 'u3-n3-l07',
    scaffoldMode: 'tap_inspect',
    sgf: `(;GM[1]FF[4]SZ[9]GN[双打吃 #7]C[角落里的双打吃！点在正中让两颗边角白棋同时发抖！]AB[db][cc][bd][ab]AW[cb][bc](;B[bb](;W[ca];B[ac]C[正解：角落双打吃，救上面就丢左边！])(;W[ac];B[ca]C[正解：救左边就丢上面，妙极啦！]))(;B[ca]C[失败];W[bb]C[失败：白棋在二二点一粘就全部安全咯！]))`,
  },
  {
    id: 'u3-n3-l08',
    scaffoldMode: 'tap_inspect',
    sgf: `(;GM[1]FF[4]SZ[9]GN[双打吃 #8]C[上下两颗小白各有两口气，一子同时把它们逼入绝境！]AB[dd][fd][df][ff]AW[ed][ef](;B[ee](;W[ec];B[eg]C[正解：上面逃跑，下面这颗就归黑棋啦！])(;W[eg];B[ec]C[正解：下面逃跑，上面这颗轻松拿下！]))(;B[ec]C[失败];W[ee]C[失败：被白棋抢占中心连接点啦！]))`,
  },
];

export const SGF101_NODE_3_4 = [
  // 3.4 征子与枷吃初探（3 关 9×9 扭羊头征子 + 3 关含 19×19 角落裁剪枷吃）
  {
    id: 'u3-n4-l01',
    scaffoldMode: 'atari_only',
    sgf: `(;GM[1]FF[4]SZ[9]GN[扭羊头征子 #1]C[学“征子”啦！像走楼梯一样左右交替连续追吃！]AB[bf][cg][dg][ed][fd][gf]AW[cf](;B[ce];W[df];B[ef];W[de];B[dd];W[ee];B[fe]C[正解：扭羊头一路追进黑棋埋伏圈，一网打尽！])(;B[df]C[失败];W[ce]C[失败：打吃方向错啦，白棋一下长出三口气逃走咯！]))`,
  },
  {
    id: 'u3-n4-l02',
    scaffoldMode: 'atari_only',
    sgf: `(;GM[1]FF[4]SZ[9]GN[扭羊头征子 #2]C[把小白往右下角黑墙追赶，连续 4 步扭羊头吃光它！]AB[bd][cc][dc][ef][ff][ge]AW[cd](;B[ce];W[dd];B[ed];W[de];B[df];W[ee];B[fe]C[正解：步步紧逼不留退路，大征子成功！])(;B[dd]C[失败];W[ce]C[失败：放白棋往外长气，征子就失败啦！]))`,
  },
  {
    id: 'u3-n4-l03',
    scaffoldMode: 'tap_inspect',
    sgf: `(;GM[1]FF[4]SZ[9]GN[扭羊头征子 #3]C[向左上黑棋接应阵地一路征子追击！]AB[fd][ge][gf][dc][cc][ce]AW[fe](;B[ff];W[ee];B[ef];W[de];B[dd];W[cd];B[bd]C[正解：像上楼梯一样完美征吃一整串白棋！])(;B[ee]C[失败];W[ff]C[失败：方向选反，白棋跑到宽敞地带逃脱啦！]))`,
  },
  {
    id: 'u3-n4-l04',
    scaffoldMode: 'atari_only',
    sgf: `(;GM[1]FF[4]SZ[9]GN[天罗地网枷吃 #1]C[“枷吃”绝招！不用贴身紧气，斜跨一步张开大网罩住白棋！]AB[cc][db][eb][fb][gc][cd][ce][df]AW[dc](;B[ed](;W[ec];B[fc];W[dd];B[de]C[正解：无论白棋往哪边撞，都逃不出天罗地网！])(;W[dd];B[de];W[ec];B[fc]C[正解：向下冲也被黑棋大网收走，太妙了！]))(;B[ec]C[失败];W[dd]C[失败：直接紧气会把白棋推向外面逃跑，试试远远罩住它！])(;B[dd]C[失败];W[ec]C[失败：直接紧气方向给白棋留出出口啦，试试斜跨枷吃！]))`,
  },
  {
    id: 'u3-n4-l05',
    scaffoldMode: 'tap_inspect',
    sgf: `(;GM[1]FF[4]SZ[19]GN[19路实战 · 角落枷吃 #1]C[19 路实战角落！别贴身打吃，一招“飞枷”把白子罩在网里！]AB[od][pc][qc][rc][sd][oe][of][pg]AW[pd](;B[qe](;W[qd];B[rd];W[pe];B[pf]C[正解：19 路经典枷吃！白棋左右两边都被天罗地网兜住！])(;W[pe];B[pf];W[qd];B[rd]C[正解：漂亮！往哪边冲都逃不出黑棋的枷吃阵！]))(;B[qd]C[失败];W[pe]C[失败：直接打吃反而把白棋推到中腹逃掉啦！])(;B[pe]C[失败];W[qd]C[失败：贴身紧气会让白棋借机冲出右上角！]))`,
  },
  {
    id: 'u3-n4-l06',
    scaffoldMode: 'tap_inspect',
    sgf: `(;GM[1]FF[4]SZ[19]GN[19路实战 · 角落枷吃 #2]C[19 路左下角实战！用“枷吃”远远封锁出路，全歼白子！]AB[do][cp][cq][cr][ds][eo][fo][gp]AW[dp](;B[eq](;W[dq];B[dr];W[ep];B[fp]C[正解：19 路实战小飞枷！完美封锁全部出路！])(;W[ep];B[fp];W[dq];B[dr]C[正解：天罗地网建功，左下角落大获全胜！]))(;B[dq]C[失败];W[ep]C[失败：直接打吃被白棋顺势冲向中腹长出气来啦！])(;B[ep]C[失败];W[dq]C[失败：先打吃这边，白棋立刻从另一侧突破出去！]))`,
  },
];
