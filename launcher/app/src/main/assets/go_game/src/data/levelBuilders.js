export function findLib(opts) {
  return {
    type: 'find_liberty',
    enableD4Transform: opts.d4 !== undefined && opts.d4 !== null ? opts.d4 : true,
    scaffoldMode: opts.scaffold !== undefined && opts.scaffold !== null ? opts.scaffold : 'tap_inspect',
    ...opts,
  };
}

export function findAtari(opts) {
  return {
    type: 'find_atari',
    enableD4Transform: opts.d4 !== undefined && opts.d4 !== null ? opts.d4 : true,
    scaffoldMode: opts.scaffold !== undefined && opts.scaffold !== null ? opts.scaffold : 'tap_inspect',
    ...opts,
  };
}

export function singleMove(opts) {
  return {
    type: 'single_move',
    enableD4Transform: opts.d4 !== undefined && opts.d4 !== null ? opts.d4 : true,
    scaffoldMode: opts.scaffold !== undefined && opts.scaffold !== null ? opts.scaffold : 'atari_only',
    ...opts,
  };
}

export function multiStep(opts) {
  return {
    type: 'multi_step',
    enableD4Transform: opts.d4 !== undefined && opts.d4 !== null ? opts.d4 : true,
    scaffoldMode: opts.scaffold !== undefined && opts.scaffold !== null ? opts.scaffold : 'atari_only',
    ...opts,
  };
}

export function bossLevel(opts) {
  return {
    type: 'boss_battle',
    enableD4Transform: false,
    scaffoldMode: opts.scaffold !== undefined && opts.scaffold !== null ? opts.scaffold : 'tap_inspect',
    ...opts,
  };
}
