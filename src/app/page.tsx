'use client';
import React, { useReducer, useCallback, useMemo, useEffect, useRef, useState } from 'react';
// ==================== TYPES ====================
type TerrainType = 'plains' | 'mountain' | 'forest' | 'water' | 'desert' | 'urban' | 'swamp' | 'oasis' | 'road' | 'ruins' | 'ice' | 'beach' | 'volcanic';
type UnitType = 'infantry' | 'armor' | 'artillery' | 'special_forces' | 'cavalry' | 'missiles' | 'medics' | 'engineers' | 'scouts' | 'marines' | 'rocket_artillery' | 'commando' | 'supply_truck';
type Owner = 'player' | 'ai';
type MapPreset = 'classic' | 'desert_storm' | 'mountain_pass' | 'island_hopping' | 'forest_ambush' | 'urban_warfare' | 'river_crossing';
type GameScreen = 'menu' | 'playing' | 'how_to_play' | 'game_over' | 'map_select';
type GamePhase = 'planning' | 'movement' | 'attack' | 'ai_turn';
type TacticCategory = 'attack' | 'defense' | 'special';
type LogType = 'info' | 'attack' | 'defense' | 'tactic' | 'movement' | 'system' | 'weather' | 'achievement';
type WeatherType = 'clear' | 'rain' | 'snow' | 'fog' | 'storm';
type Difficulty = 'easy' | 'normal' | 'hard' | 'legendary';
type BuildingType = 'factory' | 'hospital' | 'fortress' | 'tower';
interface Ability { nameAr: string; desc: string; cooldown: number; cooldownLeft: number; active: boolean; activeTurns: number; }
interface UnitDef { name: string; nameAr: string; hp: number; atk: number; def: number; mov: number; range: number; cost: number; icon: string; counters: UnitType[]; abilityNameAr: string; abilityDesc: string; abilityCooldown: number; }
interface TerrainDef { nameAr: string; color: string; atkBonus: number; defBonus: number; movCost: number; icon: string; }
interface BuildingDef { nameAr: string; icon: string; color: string; desc: string; }
interface TacticDef { id: string; name: string; desc: string; ref: string; category: TacticCategory; atkMod: number; defMod: number; movMod: number; special: string; }
interface Unit { id: string; type: UnitType; owner: Owner; hp: number; maxHp: number; atk: number; def: number; mov: number; range: number; col: number; row: number; moved: boolean; attacked: boolean; level: number; isFake: boolean; fakeTurns: number; exp: number; maxExp: number; abilityCooldownLeft: number; abilityActive: boolean; abilityActiveTurns: number; entrenched: boolean; }
interface HexCell { col: number; row: number; terrain: TerrainType; building: BuildingType | null; buildingOwner: Owner | null; }
interface PlayerState { supply: number; morale: number; training: number; }
interface LogEntry { turn: number; msg: string; type: LogType; }
interface BattleEffect { id: string; col: number; row: number; type: 'attack' | 'explosion' | 'heal'; startTime: number; }
interface GameState {
  screen: GameScreen; phase: GamePhase; turn: number; difficulty: Difficulty;
  grid: HexCell[][]; units: Unit[]; revealed: boolean[][];
  selectedId: string | null; tacticId: string | null; secondaryTacticId: string | null;
  validMoves: [number, number][]; validAttacks: [number, number][];
  hoverHex: [number, number] | null;
  player: PlayerState; ai: PlayerState;
  playerTactic: string | null; secondaryPlayerTactic: string | null; aiTactic: string | null; aiSecondaryTactic: string | null;
  log: LogEntry[]; winner: Owner | null;
  animating: boolean; deployMode: UnitType | null;
  playerUnitsKilled: number; aiUnitsKilled: number; totalDamageDealt: number; totalDamageReceived: number; tacticsUsed: string[];
  damagePreview: { col: number; row: number; dmg: number; counterDmg: number; } | null;
  previousState: GameState | null;
  weather: WeatherType; weatherTurnsLeft: number;
  effects: BattleEffect[]; shakeKey: number;
  achievements: string[]; playerUsedPincer: number; playerUsedBlitzkrieg: boolean; playerUsedGuerrilla: boolean; playerUsedSiege: boolean; artilleryKills: number; playerLostNoUnits: boolean;
  showBattleModal: { attacker: Unit; defender: Unit; dmg: number; counterDmg: number; } | null;
  mapPreset: MapPreset;
}
type Action =
  | { type: 'START_GAME'; difficulty: Difficulty; mapPreset: MapPreset }
  | { type: 'SET_SCREEN'; screen: GameScreen }
  | { type: 'SELECT_TACTIC'; id: string | null; secondary?: boolean }
  | { type: 'CONFIRM_TACTIC' }
  | { type: 'HEX_CLICK'; col: number; row: number }
  | { type: 'HEX_HOVER'; col: number; row: number | null }
  | { type: 'END_MOVEMENT' }
  | { type: 'END_ATTACK' }
  | { type: 'DEPLOY_UNIT'; unitType: UnitType }
  | { type: 'AI_TURN_COMPLETE' }
  | { type: 'UNDO' }
  | { type: 'USE_ABILITY'; unitId: string }
  | { type: 'CONFIRM_ATTACK' }
  | { type: 'CANCEL_ATTACK' }
  | { type: 'SAVE_GAME'; slot: number }
  | { type: 'LOAD_GAME'; slot: number }
  | { type: 'CLEAR_EFFECTS' };
// ==================== CONSTANTS ====================
const COLS = 14, ROWS = 10, HEX_SIZE = 24;
const SQRT3 = Math.sqrt(3);
const COUNTER_M = 0.5;
const WEATHER_NAMES: Record<WeatherType, { name: string; icon: string }> = {
  clear: { name: 'صافي', icon: '☀️' }, rain: { name: 'مطر', icon: '🌧️' }, snow: { name: 'ثلج', icon: '❄️' }, fog: { name: 'ضباب', icon: '🌫️' }, storm: { name: 'عاصفة', icon: '⛈️' },
};
const BUILDING_DEFS: Record<BuildingType, BuildingDef> = {
  factory: { nameAr: 'مصنع', icon: '🏭', color: '#f39c12', desc: '+5 إمداد/دور لمن يسيطر' },
  hospital: { nameAr: 'مستشفى', icon: '🏥', color: '#e74c3c', desc: 'يشفي الوحدات المجاورة +15 HP/دور' },
  fortress: { nameAr: 'حصن', icon: '🏰', color: '#3498db', desc: '+50% دفاع للوحدة المحتلة' },
  tower: { nameAr: 'برج مراقبة', icon: '📡', color: '#9b59b6', desc: 'يكشف 5 سداسيات حوله' },
};
const UNIT_DEFS: Record<UnitType, UnitDef> = {
  infantry: { name: 'Infantry', nameAr: 'مشاة', hp: 100, atk: 15, def: 20, mov: 2, range: 1, cost: 10, icon: '🗡️', counters: ['cavalry'], abilityNameAr: 'حفر خنادق', abilityDesc: '+40% دفاع لمدة دورين', abilityCooldown: 3 },
  armor: { name: 'Armor', nameAr: 'دروع', hp: 150, atk: 30, def: 25, mov: 3, range: 1, cost: 20, icon: '🛡️', counters: ['infantry'], abilityNameAr: 'صدمة', abilityDesc: 'الهجوم التالي ×2 ضرر', abilityCooldown: 4 },
  artillery: { name: 'Artillery', nameAr: 'مدفعية', hp: 60, atk: 40, def: 5, mov: 1, range: 3, cost: 15, icon: '💣', counters: ['armor'], abilityNameAr: 'قصف مكثف', abilityDesc: 'يهجم على كل الأعداء في نطاق 2', abilityCooldown: 5 },
  special_forces: { name: 'SpecOps', nameAr: 'قوات خاصة', hp: 80, atk: 25, def: 15, mov: 4, range: 1, cost: 15, icon: '⚔️', counters: ['artillery'], abilityNameAr: 'اغتيال', abilityDesc: '×3 ضرر لوحدة واحدة', abilityCooldown: 4 },
  cavalry: { name: 'Cavalry', nameAr: 'فرسان', hp: 90, atk: 20, def: 10, mov: 5, range: 1, cost: 12, icon: '🐴', counters: ['artillery'], abilityNameAr: 'هجوم سهم', abilityDesc: 'تحرك+هجوم، ×2 ضرر', abilityCooldown: 3 },
  missiles: { name: 'Missiles', nameAr: 'صواريخ', hp: 30, atk: 60, def: 0, mov: 0, range: 5, cost: 25, icon: '🚀', counters: [], abilityNameAr: '', abilityDesc: '', abilityCooldown: 0 },
  medics: { name: 'Medics', nameAr: 'طبيب ميداني', hp: 70, atk: 5, def: 10, mov: 3, range: 1, cost: 15, icon: '⚕️', counters: [], abilityNameAr: 'علاج طارئ', abilityDesc: 'يشفي وحدة مجاورة +40 HP', abilityCooldown: 3 },
  engineers: { name: 'Engineers', nameAr: 'مهندسين', hp: 80, atk: 10, def: 15, mov: 2, range: 1, cost: 12, icon: '🔧', counters: [], abilityNameAr: 'تحصين', abilityDesc: '+60% دفاع للوحدة نفسها لمدة 3 أدوار', abilityCooldown: 4 },
  scouts: { name: 'Scouts', nameAr: 'مستكشفين', hp: 50, atk: 10, def: 5, mov: 6, range: 1, cost: 8, icon: '🔭', counters: [], abilityNameAr: 'رصد', abilityDesc: 'يكشف كل خريطة المنطقة المحيطة بمدى 6', abilityCooldown: 2 },
  marines: { name: 'Marines', nameAr: 'مشاة بحرية', hp: 110, atk: 20, def: 18, mov: 3, range: 1, cost: 18, icon: '⚓', counters: ['special_forces'], abilityNameAr: 'إنزال بحري', abilityDesc: 'يمكن التحرك فوق الماء لمدة دورين', abilityCooldown: 4 },
  rocket_artillery: { name: 'Rocket Artillery', nameAr: 'مدفعية صاروخية', hp: 45, atk: 50, def: 3, mov: 1, range: 4, cost: 22, icon: '🎆', counters: ['armor', 'infantry'], abilityNameAr: 'قصف صاروخي', abilityDesc: 'يهجم على كل الأعداء في نطاق 3', abilityCooldown: 6 },
  commando: { name: 'Commando', nameAr: 'كوماندوز', hp: 90, atk: 30, def: 12, mov: 4, range: 1, cost: 18, icon: '🎯', counters: ['armor', 'artillery'], abilityNameAr: 'عملية خاصة', abilityDesc: 'الهجوم التالي ×2 ضرر ويشفي 20 HP', abilityCooldown: 4 },
  supply_truck: { name: 'Supply Truck', nameAr: 'شاحنة إمداد', hp: 40, atk: 0, def: 5, mov: 3, range: 0, cost: 10, icon: '🚛', counters: [], abilityNameAr: 'إمداد', abilityDesc: '+15 إمداد فوري للاعب', abilityCooldown: 3 },
};
const TERRAIN_DEFS: Record<TerrainType, TerrainDef> = {
  plains: { nameAr: 'سهل', color: '#4a6741', atkBonus: 0, defBonus: 0, movCost: 1, icon: '🌾' },
  mountain: { nameAr: 'جبل', color: '#8b7355', atkBonus: 0, defBonus: 0.5, movCost: 2, icon: '⛰️' },
  forest: { nameAr: 'غابة', color: '#2d5a27', atkBonus: 0, defBonus: 0.3, movCost: 2, icon: '🌲' },
  water: { nameAr: 'ماء', color: '#1a5276', atkBonus: 0, defBonus: 0, movCost: 99, icon: '🌊' },
  desert: { nameAr: 'صحراء', color: '#c2a83e', atkBonus: 0.1, defBonus: -0.1, movCost: 2, icon: '🏜️' },
  urban: { nameAr: 'مدينة', color: '#5d6d7e', atkBonus: -0.1, defBonus: 0.4, movCost: 2, icon: '🏙️' },
  swamp: { nameAr: 'مستنقع', color: '#3d5c3a', atkBonus: -0.2, defBonus: -0.1, movCost: 3, icon: '🐻' },
  oasis: { nameAr: 'واحة', color: '#48c9b0', atkBonus: 0, defBonus: 0.1, movCost: 1, icon: '🏞️' },
  road: { nameAr: 'طريق', color: '#8e8e8e', atkBonus: 0, defBonus: 0, movCost: 0.5, icon: '🛤️' },
  ruins: { nameAr: 'أطلال', color: '#7f8c8d', atkBonus: 0, defBonus: 0.35, movCost: 2, icon: '🏚️' },
  ice: { nameAr: 'جليد', color: '#a8d8ea', atkBonus: 0, defBonus: -0.2, movCost: 3, icon: '🧊' },
  beach: { nameAr: 'شاطئ', color: '#f5cba7', atkBonus: 0, defBonus: -0.2, movCost: 1, icon: '🏖️' },
  volcanic: { nameAr: 'بركاني', color: '#641e16', atkBonus: 0, defBonus: -0.3, movCost: 3, icon: '🌋' },
};
const TACTICS: TacticDef[] = [
  { id: 'pincer', name: 'الكماشة', desc: '+30% هجوم عند الهجوم من جهتين متجاورتين', ref: 'معركة كاناي - هنيبعل', category: 'attack', atkMod: 0, defMod: 0, movMod: 0, special: 'pincer' },
  { id: 'blitzkrieg', name: 'الحرب الخاطفة', desc: '+2 مدى حركة لجميع الوحدات', ref: 'ألمانيا - الحرب العالمية الثانية', category: 'attack', atkMod: 0, defMod: 0, movMod: 2, special: 'blitzkrieg' },
  { id: 'flanking', name: 'الالتفاف', desc: '+50% هجوم عند الهجوم من الجوانب', ref: 'تكتيكات الإسكندر الأكبر', category: 'attack', atkMod: 0, defMod: 0, movMod: 0, special: 'flanking' },
  { id: 'human_wave', name: 'الهجوم الموجي', desc: '+20% هجوم للمشاة', ref: 'تكتيكات الهجوم الشامل', category: 'attack', atkMod: 0, defMod: 0, movMod: 0, special: 'human_wave' },
  { id: 'fortification', name: 'التحصين', desc: '+50% دفاع لجميع الوحدات، -1 حركة', ref: 'خنادق الحرب العالمية الأولى', category: 'defense', atkMod: 0, defMod: 0.5, movMod: -1, special: 'fortification' },
  { id: 'tactical_retreat', name: 'الانسحاب التكتيكي', desc: 'الوحدات تنسحب بـ 50% صحة بدلاً من الموت', ref: 'تكتيك الانسحاب المنظم', category: 'defense', atkMod: 0, defMod: 0, movMod: 0, special: 'tactical_retreat' },
  { id: 'elastic_defense', name: 'الدفاع المرن', desc: 'دفاع +15% وهجوم مضاد +25%', ref: 'الدفاع العميق الألماني', category: 'defense', atkMod: 0.25, defMod: 0.15, movMod: 0, special: 'elastic_defense' },
  { id: 'guerrilla', name: 'حرب العصابات', desc: '+40% هجوم في الغابات', ref: 'حرب فيتنام', category: 'special', atkMod: 0, defMod: 0, movMod: 0, special: 'guerrilla' },
  { id: 'attrition', name: 'حرب الاستنزاف', desc: '-10 إمدادات خصم كل دور', ref: 'الاتحاد السوفيتي - الحرب العالمية الثانية', category: 'special', atkMod: 0, defMod: 0, movMod: 0, special: 'attrition' },
  { id: 'scorched_earth', name: 'الأرض المحروقة', desc: '-20 إمدادات خصم كل دور', ref: 'تكتيك الأرض المحروقة الروسي', category: 'special', atkMod: 0, defMod: 0, movMod: 0, special: 'scorched_earth' },
  { id: 'deception', name: 'الخداع الاستراتيجي', desc: 'إنشاء وحدتين وهميتين لمدة دورين', ref: 'سون تزو: "كل الحرب مبنية على الخداع"', category: 'special', atkMod: 0, defMod: 0, movMod: 0, special: 'deception' },
  { id: 'siege', name: 'الحصار', desc: '+20% هجوم ضد الوحدات المحاصرة', ref: 'الحصارات في العصور الوسطى', category: 'special', atkMod: 0, defMod: 0, movMod: 0, special: 'siege' },
];
const ACHIEVEMENT_DEFS: Record<string, { nameAr: string; desc: string; icon: string }> = {
  victor_cannae: { nameAr: 'فيكتور كاناي', desc: 'فز باستخدام الكماشة 3+ مرات', icon: '🏆' },
  rommel: { nameAr: 'روميل', desc: 'فز باستخدام الحرب الخاطفة', icon: '⚡' },
  grey_wolf: { nameAr: 'الذئب الرمادي', desc: 'فز باستخدام حرب العصابات', icon: '🐺' },
  war_hero: { nameAr: 'بطل الحرب', desc: 'فز بدون خسارة أي وحدة', icon: '🦸' },
  war_master: { nameAr: 'أسياد الحرب', desc: 'فز على صعوبة أستاذ الحرب', icon: '👑' },
  artillery_master: { nameAr: 'المدفعجي', desc: 'دمّر 5+ وحدات بالمدفعية', icon: '💣' },
  siege_master: { nameAr: 'حصار محكم', desc: 'فز باستخدام الحصار', icon: '🏰' },
};
const MAP_PRESET_INFO: Record<MapPreset, { name: string; icon: string; desc: string; color: string; difficulty: string }> = {
  classic: { name: 'كلاسيكي', icon: '🗺️', desc: 'خريطة متوازنة مع تضاريس متنوعة', color: '#4a6741', difficulty: 'عادي' },
  desert_storm: { name: 'عاصفة الصحراء', icon: '🏜️', desc: 'معارك صحراوية - فرسان ودروع تتفوق', color: '#c2a83e', difficulty: 'صعب' },
  mountain_pass: { name: 'ممر جبلي', icon: '⛰️', desc: 'معارك في الوديان والمناطق الوعرة', color: '#8b7355', difficulty: 'صعب' },
  island_hopping: { name: 'قفز الجزر', icon: '🏝️', desc: 'معارك بحرية وجزر - المشاة البحرية تتفوق', color: '#1a5276', difficulty: 'صعب' },
  forest_ambush: { name: 'كمين الغابة', icon: '🌲', desc: 'غابات كثافة - القوات الخاصة والمستكشفين', color: '#2d5a27', difficulty: 'عادي' },
  urban_warfare: { name: 'حرب المدن', icon: '🏙️', desc: 'قتال حضري في الشوارع والمباني', color: '#5d6d7e', difficulty: 'عادي' },
  river_crossing: { name: 'عبور النهر', icon: '🌊', desc: 'اعبر النهر وسيطر على الجسور', color: '#2980b9', difficulty: 'عادي' },
};
// ==================== HEX UTILITIES ====================
function hexCenter(col: number, row: number): [number, number] {
  const x = col * HEX_SIZE * 1.5 + HEX_SIZE + 10;
  const y = row * SQRT3 * HEX_SIZE + (col % 2 === 1 ? SQRT3 * HEX_SIZE / 2 : 0) + HEX_SIZE * SQRT3 / 2 + 10;
  return [x, y];
}
function hexPathStr(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i); pts.push(`${cx + size * Math.cos(a)},${cy + size * Math.sin(a)}`); }
  return `M${pts[0]} L${pts[1]} L${pts[2]} L${pts[3]} L${pts[4]} L${pts[5]} Z`;
}
const EVEN_DIRS: [number, number][] = [[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[0,1]];
const ODD_DIRS: [number, number][] = [[1,1],[1,0],[0,-1],[-1,0],[-1,1],[0,1]];
function getNeighbors(col: number, row: number): [number, number][] {
  const dirs = col % 2 === 0 ? EVEN_DIRS : ODD_DIRS;
  return dirs.map(([dc, dr]) => [col + dc, row + dr] as [number, number]).filter(([c, r]) => c >= 0 && c < COLS && r >= 0 && r < ROWS);
}
function hexToCube(col: number, row: number): [number, number, number] { const x = col; const z = row - (col - (col & 1)) / 2; return [x, -x - z, z]; }
function hexDist(c1: number, r1: number, c2: number, r2: number): number {
  const [x1, y1, z1] = hexToCube(c1, r1); const [x2, y2, z2] = hexToCube(c2, r2);
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2), Math.abs(z1 - z2));
}
function getUnitAt(units: Unit[], col: number, row: number): Unit | undefined { return units.find(u => u.col === col && u.row === row); }
function getTerrainAt(grid: HexCell[][], col: number, row: number): TerrainType { if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return 'water'; return grid[col][row].terrain; }
function isAdjacentToEnemy(units: Unit[], col: number, row: number, owner: Owner): boolean {
  return getNeighbors(col, row).some(([c, r]) => { const u = getUnitAt(units, c, r); return u && u.owner !== owner && !u.isFake; });
}
function calcValidMoves(unit: Unit, grid: HexCell[][], units: Unit[], tactic: TacticDef | null, secondary: TacticDef | null): [number, number][] {
  if (unit.mov === 0) return [];
  const tMod = (tactic?.movMod ?? 0) + (secondary ? (secondary.movMod ?? 0) * 0.5 : 0);
  const effMov = Math.max(1, unit.mov + tMod);
  const result: [number, number][] = [];
  const visited = new Map<string, number>();
  const queue: { col: number; row: number; cost: number }[] = [{ col: unit.col, row: unit.row, cost: 0 }];
  visited.set(`${unit.col},${unit.row}`, 0);
  while (queue.length > 0) {
    const { col, row, cost } = queue.shift()!;
    const neighbors = getNeighbors(col, row);
    for (const [nc, nr] of neighbors) {
      const key = `${nc},${nr}`;
      const terrain = getTerrainAt(grid, nc, nr);
      let movCost = TERRAIN_DEFS[terrain].movCost;
      // Marines with ability active can move on water
      if (unit.type === 'marines' && unit.abilityActive && terrain === 'water') movCost = 1;
      if (unit.type !== 'cavalry' && isAdjacentToEnemy(units, nc, nr, unit.owner)) movCost += 2;
      const newCost = cost + movCost;
      const prev = visited.get(key);
      if (prev !== undefined && newCost >= prev) continue;
      if (newCost > effMov) continue;
      if (getUnitAt(units, nc, nr)) continue;
      if (!visited.has(key) || newCost < (visited.get(key) ?? Infinity)) {
        visited.set(key, newCost);
        result.push([nc, nr]);
        queue.push({ col: nc, row: nr, cost: newCost });
      }
    }
  }
  return [...new Map(result.map(r => [`${r[0]},${r[1]}`, r])).values()];
}
function calcValidAttacks(unit: Unit, units: Unit[], tactic: TacticDef | null): [number, number][] {
  if (unit.range === 0) return [];
  const enemies = units.filter(u => u.owner !== unit.owner && !u.isFake && u.hp > 0);
  const tacticRange = (tactic?.special === 'siege') ? unit.range + 1 : unit.range;
  return enemies.filter(e => hexDist(unit.col, unit.row, e.col, e.row) <= tacticRange).map(e => [e.col, e.row] as [number, number]);
}
function isSurrounded(unit: Unit, units: Unit[]): boolean {
  return getNeighbors(unit.col, unit.row).filter(([c, r]) => { const u = getUnitAt(units, c, r); return u && u.owner !== unit.owner; }).length >= 3;
}
function getMoraleMult(morale: number): number { return 0.5 + morale / 200; }
function getWeatherAtkMod(w: WeatherType): number { return w === 'storm' ? -0.4 : w === 'rain' ? -0.15 : 0; }
function getWeatherMovMod(w: WeatherType): number { return w === 'snow' ? -2 : w === 'rain' || w === 'storm' ? -1 : 0; }
function getWeatherDefMod(w: WeatherType): number { return w === 'snow' ? 0.2 : 0; }
function getCounterBonus(atkType: UnitType, defType: UnitType): number { return UNIT_DEFS[atkType].counters.includes(defType) ? 0.5 : 0; }
function calcDamage(attacker: Unit, defender: Unit, tactic: TacticDef | null, secondary: TacticDef | null, grid: HexCell[][], weather: WeatherType, attackerMorale: number, defenderMorale: number, isCounter: boolean): number {
  const aTerrain = getTerrainAt(grid, attacker.col, attacker.row);
  const dTerrain = getTerrainAt(grid, defender.col, defender.row);
  let atkStat = attacker.atk * (1 + (tactic?.atkMod ?? 0) + (secondary ? (secondary.atkMod ?? 0) * 0.5 : 0));
  atkStat *= (1 + TERRAIN_DEFS[aTerrain].atkBonus);
  atkStat *= getMoraleMult(attackerMorale);
  atkStat *= (1 + attacker.level * 0.05);
  if (attacker.entrenched) atkStat *= 0.7;
  if (isCounter) atkStat *= COUNTER_M;
  if (attacker.abilityActive && !isCounter && attacker.type === 'armor') atkStat *= 2;
  if (attacker.abilityActive && !isCounter && attacker.type === 'cavalry') atkStat *= 2;
  if (attacker.abilityActive && !isCounter && attacker.type === 'special_forces') atkStat *= 3;
  if (attacker.abilityActive && !isCounter && attacker.type === 'commando') atkStat *= 2;
  atkStat *= (1 + getWeatherAtkMod(weather));
  let defStat = defender.def * (1 + (tactic?.defMod ?? 0) + (secondary ? (secondary.defMod ?? 0) * 0.5 : 0));
  defStat *= (1 + TERRAIN_DEFS[dTerrain].defBonus);
  defStat *= getMoraleMult(defenderMorale);
  defStat *= (1 + defender.level * 0.05);
  if (defender.entrenched) defStat *= 1.4;
  const cell = grid[defender.col]?.[defender.row];
  if (cell?.building === 'fortress' && cell.buildingOwner === defender.owner) defStat *= 1.5;
  defStat *= (1 + getWeatherDefMod(weather));
  let bonus = 0;
  if (tactic?.special === 'pincer' && checkPincer(attacker, defender)) bonus += 0.3;
  if (tactic?.special === 'flanking' && Math.random() > 0.4) bonus += 0.5;
  if (tactic?.special === 'human_wave' && attacker.type === 'infantry') bonus += 0.2;
  if (tactic?.special === 'guerrilla' && aTerrain === 'forest') bonus += 0.4;
  if (tactic?.special === 'siege' && isSurrounded(defender, [attacker, defender])) bonus += 0.2;
  bonus += getCounterBonus(attacker.type, defender.type);
  const totalAtk = atkStat * (1 + bonus);
  return Math.max(1, Math.round(totalAtk - defStat * 0.5 + (Math.random() - 0.5) * 6));
}
function checkPincer(attacker: Unit, defender: Unit): boolean {
  const attackerNeighbors = getNeighbors(attacker.col, attacker.row);
  let alliesNearTarget = 0;
  for (const [nc, nr] of attackerNeighbors) { if (hexDist(nc, nr, defender.col, defender.row) <= 2) alliesNearTarget++; }
  return alliesNearTarget >= 2;
}
function calcCounterDamage(attacker: Unit, defender: Unit, tactic: TacticDef | null, secondary: TacticDef | null, grid: HexCell[][], weather: WeatherType, aMorale: number, dMorale: number): number {
  if (defender.type === 'artillery' && hexDist(attacker.col, attacker.row, defender.col, defender.row) > 1) return 0;
  if (defender.range === 0) return 0;
  if (hexDist(attacker.col, attacker.row, defender.col, defender.row) > defender.range) return 0;
  return calcDamage(defender, attacker, tactic, secondary, grid, weather, dMorale, aMorale, true);
}
// ==================== RNG & MAP GENERATION ====================
function createRNG() { let s = Date.now(); return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
function makeGrid(): HexCell[][] {
  const grid: HexCell[][] = [];
  for (let c = 0; c < COLS; c++) { grid[c] = []; for (let r = 0; r < ROWS; r++) { grid[c][r] = { col: c, row: r, terrain: 'plains', building: null, buildingOwner: null }; } }
  return grid;
}
function scatterTerrain(grid: HexCell[][], rand: () => number, terrain: TerrainType, count: number, allowOn: TerrainType[] = ['plains'], clusterChance = 0.5) {
  for (let i = 0; i < count; i++) {
    const c = Math.floor(rand() * COLS);
    const r = Math.floor(rand() * ROWS);
    if (!allowOn.includes(grid[c][r].terrain)) continue;
    grid[c][r].terrain = terrain;
    if (rand() > (1 - clusterChance)) {
      const ns = getNeighbors(c, r);
      const [nc, nr] = ns[Math.floor(rand() * ns.length)];
      if (allowOn.includes(grid[nc]?.[nr]?.terrain)) grid[nc][nr].terrain = terrain;
    }
  }
}
function placeBuildings(grid: HexCell[][], rand: () => number, types: BuildingType[], forbidden: TerrainType[] = ['water', 'mountain']) {
  for (const bt of types) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const c = 3 + Math.floor(rand() * (COLS - 6));
      const r = Math.floor(rand() * ROWS);
      if (forbidden.includes(grid[c][r].terrain) || grid[c][r].building) continue;
      grid[c][r].building = bt;
      break;
    }
  }
}
function drawRiver(grid: HexCell[][], rand: () => number, startCol: number) {
  let rc = startCol;
  for (let r = 0; r < ROWS; r++) {
    grid[rc][r].terrain = 'water';
    if (rand() > 0.6 && rc + 1 < COLS) grid[rc + 1][r].terrain = 'water';
    rc += rand() > 0.6 ? (rand() > 0.5 ? 1 : -1) : 0;
    rc = Math.max(2, Math.min(COLS - 2, rc));
  }
}
function generateMapForPreset(preset: MapPreset): HexCell[][] {
  const rand = createRNG();
  const grid = makeGrid();
  switch (preset) {
    case 'desert_storm': {
      // Fill mostly desert with oases and ruins
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) grid[c][r].terrain = 'desert';
      scatterTerrain(grid, rand, 'oasis', 6, ['desert'], 0.7);
      scatterTerrain(grid, rand, 'ruins', 5, ['desert'], 0.3);
      scatterTerrain(grid, rand, 'mountain', 4, ['desert'], 0.2);
      scatterTerrain(grid, rand, 'road', 8, ['desert', 'oasis'], 0.4);
      scatterTerrain(grid, rand, 'plains', 4, ['desert'], 0.3);
      placeBuildings(grid, rand, ['factory', 'hospital', 'fortress']);
      break;
    }
    case 'mountain_pass': {
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) grid[c][r].terrain = 'mountain';
      // Create passes (valleys of plains/forest)
      for (let r = 2; r <= 4; r++) { grid[3][r].terrain = 'plains'; grid[4][r].terrain = 'plains'; grid[5][r].terrain = 'forest'; }
      for (let r = 5; r <= 7; r++) { grid[8][r].terrain = 'plains'; grid[9][r].terrain = 'forest'; grid[10][r].terrain = 'plains'; }
      for (let r = 1; r <= 3; r++) { grid[10][r].terrain = 'plains'; grid[11][r].terrain = 'road'; }
      scatterTerrain(grid, rand, 'forest', 8, ['mountain'], 0.6);
      scatterTerrain(grid, rand, 'road', 4, ['plains'], 0.5);
      placeBuildings(grid, rand, ['fortress', 'hospital', 'tower'], ['water', 'mountain']);
      // Fortress in a pass
      grid[5][3].building = 'fortress';
      break;
    }
    case 'island_hopping': {
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) grid[c][r].terrain = 'water';
      // Create islands (clusters of land)
      const islandCenters: [number, number][] = [[1, 2], [1, 6], [3, 4], [5, 1], [5, 8], [7, 4], [9, 2], [9, 7], [11, 4], [12, 1], [12, 8]];
      for (const [ic, ir] of islandCenters) {
        if (ic < COLS && ir < ROWS) {
          grid[ic][ir].terrain = 'plains';
          const ns = getNeighbors(ic, ir);
          for (const [nc, nr] of ns) { if (nc < COLS && nr < ROWS && rand() > 0.4) grid[nc][nr].terrain = 'plains'; }
        }
      }
      scatterTerrain(grid, rand, 'beach', 8, ['plains'], 0.6);
      scatterTerrain(grid, rand, 'forest', 5, ['plains'], 0.3);
      scatterTerrain(grid, rand, 'swamp', 3, ['plains'], 0.2);
      placeBuildings(grid, rand, ['factory', 'hospital', 'fortress', 'tower'], ['water']);
      break;
    }
    case 'forest_ambush': {
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) grid[c][r].terrain = 'forest';
      scatterTerrain(grid, rand, 'plains', 8, ['forest'], 0.7);
      scatterTerrain(grid, rand, 'swamp', 6, ['forest'], 0.5);
      scatterTerrain(grid, rand, 'road', 4, ['plains', 'forest'], 0.3);
      scatterTerrain(grid, rand, 'mountain', 3, ['forest'], 0.2);
      scatterTerrain(grid, rand, 'ruins', 3, ['forest', 'plains'], 0.3);
      placeBuildings(grid, rand, ['hospital', 'tower', 'fortress']);
      break;
    }
    case 'urban_warfare': {
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) grid[c][r].terrain = 'urban';
      scatterTerrain(grid, rand, 'road', 12, ['urban'], 0.7);
      scatterTerrain(grid, rand, 'plains', 4, ['urban'], 0.3);
      // Parks
      scatterTerrain(grid, rand, 'forest', 4, ['urban', 'plains'], 0.3);
      scatterTerrain(grid, rand, 'ruins', 4, ['urban'], 0.3);
      scatterTerrain(grid, rand, 'swamp', 2, ['urban'], 0.1);
      placeBuildings(grid, rand, ['factory', 'hospital', 'fortress', 'tower'], ['water']);
      break;
    }
    case 'river_crossing': {
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) grid[c][r].terrain = 'plains';
      // Large river down the middle
      drawRiver(grid, rand, 6);
      // Bridges (road tiles crossing the river)
      for (let r = 2; r < ROWS; r += 3) { grid[6][r].terrain = 'road'; if (r + 1 < ROWS) grid[6][r + 1].terrain = 'road'; }
      scatterTerrain(grid, rand, 'urban', 6, ['plains'], 0.4);
      scatterTerrain(grid, rand, 'forest', 5, ['plains'], 0.4);
      scatterTerrain(grid, rand, 'mountain', 3, ['plains'], 0.3);
      placeBuildings(grid, rand, ['fortress', 'factory', 'hospital', 'tower']);
      // Place fortress on a bridge
      grid[6][2].building = 'fortress';
      break;
    }
    case 'classic':
    default: {
      drawRiver(grid, rand, 6 + Math.floor(rand() * 2));
      scatterTerrain(grid, rand, 'mountain', 12, ['plains'], 0.5);
      scatterTerrain(grid, rand, 'forest', 14, ['plains'], 0.4);
      scatterTerrain(grid, rand, 'desert', 8, ['plains'], 0.3);
      scatterTerrain(grid, rand, 'urban', 3, ['plains'], 0.2);
      scatterTerrain(grid, rand, 'road', 4, ['plains'], 0.3);
      placeBuildings(grid, rand, ['factory', 'hospital', 'fortress', 'tower']);
      break;
    }
  }
  return grid;
}
// ==================== UNIT CREATION ====================
function initRevealed(): boolean[][] { return Array.from({ length: COLS }, () => Array(ROWS).fill(false)); }
function revealAround(grid: HexCell[][], revealed: boolean[][], col: number, row: number, range: number) {
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { if (hexDist(col, row, c, r) <= range) revealed[c][r] = true; }
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { if (grid[c][r].building === 'tower' && revealed[c][r]) revealAround(grid, revealed, c, r, 5); }
}
function createUnit(id: number, type: UnitType, owner: Owner, col: number, row: number): Unit {
  const d = UNIT_DEFS[type];
  return { id: `u${id}`, type, owner, hp: d.hp, maxHp: d.hp, atk: d.atk, def: d.def, mov: d.mov, range: d.range, col, row, moved: false, attacked: false, level: 1, isFake: false, fakeTurns: 0, exp: 0, maxExp: 20, abilityCooldownLeft: 0, abilityActive: false, abilityActiveTurns: 0, entrenched: false };
}
function findSafeSpawn(grid: HexCell[][], units: Unit[], colRange: [number, number], owner: Owner): [number, number][] {
  const positions: [number, number][] = [];
  for (let c = colRange[0]; c <= colRange[1]; c++) {
    for (let r = 0; r < ROWS; r++) {
      const t = grid[c][r].terrain;
      if (t === 'water' || t === 'mountain' || getUnitAt(units, c, r)) continue;
      positions.push([c, r]);
    }
  }
  return positions;
}
function createUnitsForMap(preset: MapPreset): Unit[] {
  let id = 0;
  const p = (t: UnitType, c: number, r: number) => createUnit(id++, t, 'player', c, r);
  const a = (t: UnitType, c: number, r: number) => createUnit(id++, t, 'ai', c, r);
  switch (preset) {
    case 'desert_storm':
      return [
        p('cavalry', 0, 1), p('cavalry', 0, 4), p('armor', 0, 7),
        p('armor', 1, 2), p('scouts', 0, 5), p('missiles', 1, 8),
        a('cavalry', 13, 2), a('cavalry', 13, 5), a('armor', 13, 8),
        a('armor', 12, 3), a('scouts', 13, 6), a('missiles', 12, 0),
      ];
    case 'mountain_pass':
      return [
        p('infantry', 0, 1), p('infantry', 0, 4), p('artillery', 0, 7),
        p('engineers', 1, 2), p('infantry', 0, 5), p('artillery', 1, 8),
        a('infantry', 13, 2), a('infantry', 13, 5), a('artillery', 13, 8),
        a('engineers', 12, 3), a('infantry', 13, 6), a('artillery', 12, 0),
      ];
    case 'island_hopping':
      return [
        p('marines', 0, 1), p('marines', 0, 4), p('scouts', 0, 7),
        p('marines', 1, 2), p('scouts', 0, 5), p('armor', 1, 8),
        a('marines', 13, 2), a('marines', 13, 5), a('scouts', 13, 8),
        a('marines', 12, 3), a('scouts', 13, 6), a('armor', 12, 0),
      ];
    case 'forest_ambush':
      return [
        p('special_forces', 0, 1), p('cavalry', 0, 4), p('scouts', 0, 7),
        p('special_forces', 1, 2), p('cavalry', 0, 5), p('scouts', 1, 8),
        a('special_forces', 13, 2), a('cavalry', 13, 5), a('scouts', 13, 8),
        a('special_forces', 12, 3), a('cavalry', 13, 6), a('scouts', 12, 0),
      ];
    case 'urban_warfare':
      return [
        p('armor', 0, 1), p('infantry', 0, 4), p('medics', 0, 7),
        p('infantry', 1, 2), p('engineers', 0, 5), p('armor', 1, 8),
        a('armor', 13, 2), a('infantry', 13, 5), a('medics', 13, 8),
        a('infantry', 12, 3), a('engineers', 13, 6), a('armor', 12, 0),
      ];
    case 'river_crossing':
      return [
        p('infantry', 0, 1), p('armor', 0, 4), p('engineers', 0, 7),
        p('infantry', 1, 2), p('artillery', 0, 5), p('armor', 1, 8),
        a('infantry', 13, 2), a('armor', 13, 5), a('engineers', 13, 8),
        a('infantry', 12, 3), a('artillery', 13, 6), a('armor', 12, 0),
      ];
    case 'classic':
    default:
      return [
        p('infantry', 0, 1), p('infantry', 0, 4), p('infantry', 0, 7),
        p('armor', 1, 2), p('artillery', 0, 5), p('special_forces', 1, 8),
        a('infantry', 13, 2), a('infantry', 13, 5), a('infantry', 13, 8),
        a('armor', 12, 3), a('artillery', 13, 6), a('special_forces', 12, 0),
      ];
  }
}
function getWeather(): WeatherType { const r = Math.random(); return r < 0.4 ? 'clear' : r < 0.6 ? 'rain' : r < 0.75 ? 'snow' : r < 0.9 ? 'fog' : 'storm'; }
// ==================== GAME REDUCER ====================
const initialState: GameState = {
  screen: 'menu', phase: 'planning', turn: 1, difficulty: 'normal',
  grid: [], units: [], revealed: [],
  selectedId: null, tacticId: null, secondaryTacticId: null,
  validMoves: [], validAttacks: [], hoverHex: null,
  player: { supply: 20, morale: 100, training: 0 }, ai: { supply: 20, morale: 100, training: 0 },
  playerTactic: null, secondaryPlayerTactic: null, aiTactic: null, aiSecondaryTactic: null,
  log: [], winner: null, animating: false, deployMode: null,
  playerUnitsKilled: 0, aiUnitsKilled: 0, totalDamageDealt: 0, totalDamageReceived: 0, tacticsUsed: [],
  damagePreview: null, previousState: null, weather: 'clear', weatherTurnsLeft: 3,
  effects: [], shakeKey: 0,
  achievements: [], playerUsedPincer: 0, playerUsedBlitzkrieg: false, playerUsedGuerrilla: false, playerUsedSiege: false, artilleryKills: 0, playerLostNoUnits: true,
  showBattleModal: null, mapPreset: 'classic',
};
function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const grid = generateMapForPreset(action.mapPreset);
      const units = createUnitsForMap(action.mapPreset);
      const revealed = initRevealed();
      units.filter(u => u.owner === 'player').forEach(u => revealAround(grid, revealed, u.col, u.row, u.type === 'cavalry' || u.type === 'scouts' ? 3 : u.type === 'artillery' || u.type === 'rocket_artillery' ? 1 : 2));
      return { ...initialState, screen: 'playing', phase: 'planning', turn: 1, difficulty: action.difficulty, mapPreset: action.mapPreset, grid, units, revealed, weather: getWeather(), weatherTurnsLeft: 3, log: [{ turn: 1, msg: '⚔️ بدأت المعركة! اختر تكتيكك الأساسي والثانوي', type: 'system' }] };
    }
    case 'SET_SCREEN': return { ...state, screen: action.screen };
    case 'SELECT_TACTIC': return action.secondary ? { ...state, secondaryTacticId: action.id } : { ...state, tacticId: action.id };
    case 'CONFIRM_TACTIC': {
      const tactic = TACTICS.find(t => t.id === state.tacticId);
      const secondary = TACTICS.find(t => t.id === state.secondaryTacticId);
      const newLog = [...state.log];
      let newUnits = [...state.units];
      if (tactic) {
        newLog.push({ turn: state.turn, msg: `🎯 التكتيك: ${tactic.name}`, type: 'tactic' });
        if (!state.tacticsUsed.includes(tactic.id)) { state.tacticsUsed.push(tactic.id); }
        if (tactic.id === 'pincer') state.playerUsedPincer++;
        if (tactic.id === 'blitzkrieg') state.playerUsedBlitzkrieg = true;
        if (tactic.id === 'guerrilla') state.playerUsedGuerrilla = true;
        if (tactic.id === 'siege') state.playerUsedSiege = true;
      }
      if (secondary) newLog.push({ turn: state.turn, msg: `🔧 تكتيك ثانوي: ${secondary.name} (50%)`, type: 'tactic' });
      if (tactic?.special === 'deception') { for (let i = 0; i < 2; i++) { for (let c = 0; c <= 2; c++) { for (let r = 0; r < ROWS; r++) { if (!getUnitAt(newUnits, c, r) && getTerrainAt(state.grid, c, r) !== 'water') { newUnits.push({ ...createUnit(Date.now() + i, 'infantry', 'player', c, r), isFake: true, fakeTurns: 2, moved: true, attacked: true }); break; } } } } newLog.push({ turn: state.turn, msg: '🎭 تم إنشاء وحدات وهمية!', type: 'tactic' }); }
      if (tactic?.special === 'attrition') newLog.push({ turn: state.turn, msg: '📉 استنزاف: -10 إمدادات للعدو', type: 'tactic' });
      if (tactic?.special === 'scorched_earth') newLog.push({ turn: state.turn, msg: '🔥 الأرض المحروقة: -20 إمدادات للعدو', type: 'tactic' });
      return { ...state, phase: 'movement', playerTactic: state.tacticId, secondaryPlayerTactic: state.secondaryTacticId, units: newUnits, log: newLog, selectedId: null, validMoves: [], validAttacks: [], deployMode: null, tacticsUsed: state.tacticsUsed, playerUsedPincer: state.playerUsedPincer, playerUsedBlitzkrieg: state.playerUsedBlitzkrieg, playerUsedGuerrilla: state.playerUsedGuerrilla, playerUsedSiege: state.playerUsedSiege };
    }
    case 'HEX_CLICK': return handleHexClick(state, action.col, action.row);
    case 'HEX_HOVER': return { ...state, hoverHex: action.col !== null && action.row !== null ? [action.col, action.row] : null };
    case 'END_MOVEMENT': return { ...state, phase: 'attack', selectedId: null, validMoves: [], validAttacks: [], damagePreview: null, log: [...state.log, { turn: state.turn, msg: '🎯 مرحلة الهجوم', type: 'info' }] };
    case 'END_ATTACK': return { ...state, phase: 'ai_turn', selectedId: null, validMoves: [], validAttacks: [], damagePreview: null, animating: true, log: [...state.log, { turn: state.turn, msg: '🤖 دور العدو...', type: 'info' }] };
    case 'DEPLOY_UNIT': return { ...state, deployMode: action.unitType };
    case 'UNDO': return state.previousState ? { ...state.previousState } : state;
    case 'USE_ABILITY': return handleAbilityUse(state, action.unitId);
    case 'CONFIRM_ATTACK': return handleConfirmAttack(state);
    case 'CANCEL_ATTACK': return { ...state, showBattleModal: null };
    case 'AI_TURN_COMPLETE': return handleAIComplete(state);
    case 'SAVE_GAME': { try { if (typeof window !== 'undefined') localStorage.setItem(`warGame_save_${action.slot}`, JSON.stringify(state)); } catch {} return state; }
    case 'LOAD_GAME': { try { if (typeof window !== 'undefined') { const d = localStorage.getItem(`warGame_save_${action.slot}`); if (d) return JSON.parse(d); } } catch {} return state; }
    case 'CLEAR_EFFECTS': return { ...state, effects: state.effects.filter(e => Date.now() - e.startTime < 1000) };
    default: return state;
  }
}
function handleAbilityUse(state: GameState, unitId: string): GameState {
  const uIdx = state.units.findIndex(u => u.id === unitId);
  if (uIdx < 0) return state;
  const unit = state.units[uIdx];
  if (unit.owner !== 'player' || unit.abilityCooldownLeft > 0 || unit.type === 'missiles') return state;
  const def = UNIT_DEFS[unit.type];
  const log = [...state.log];
  let newUnit = { ...unit };
  let newUnits = state.units;
  if (unit.type === 'infantry') { newUnit.entrenched = true; newUnit.abilityActive = true; newUnit.abilityActiveTurns = 2; newUnit.abilityCooldownLeft = def.abilityCooldown; log.push({ turn: state.turn, msg: `🏗️ ${def.nameAr} حفر خنادق! +40% دفاع لمدة دورين`, type: 'defense' }); }
  else if (unit.type === 'armor') { newUnit.abilityActive = true; newUnit.abilityActiveTurns = 1; newUnit.abilityCooldownLeft = def.abilityCooldown; log.push({ turn: state.turn, msg: `💥 ${def.nameAr} يجهز صدمة! الهجوم التالي ×2`, type: 'tactic' }); }
  else if (unit.type === 'artillery') {
    const tactic = TACTICS.find(t => t.id === state.playerTactic);
    const secondary = TACTICS.find(t => t.id === state.secondaryPlayerTactic);
    const enemies = state.units.filter(e => e.owner !== 'player' && !e.isFake && hexDist(unit.col, unit.row, e.col, e.row) <= 2);
    newUnits = state.units.map(u => u.id === unitId ? { ...newUnit } : u);
    newUnits[uIdx] = newUnit;
    for (const e of enemies) {
      const dmg = Math.round(calcDamage(unit, e, tactic, secondary, state.grid, state.weather, state.player.morale, state.ai.morale, false) * 0.6);
      const eIdx = newUnits.findIndex(u => u.id === e.id);
      if (eIdx >= 0) {
        let hp = newUnits[eIdx].hp - dmg;
        log.push({ turn: state.turn, msg: `💣 قصف مكثف على ${UNIT_DEFS[e.type].nameAr} - ${dmg} ضرر`, type: 'attack' });
        if (hp <= 0) { log.push({ turn: state.turn, msg: `  ✗ ${UNIT_DEFS[e.type].nameAr} دُمر!`, type: 'system' }); newUnits = newUnits.filter(u => u.id !== e.id); } else { newUnits[eIdx] = { ...newUnits[eIdx], hp }; }
      }
    }
    newUnit.abilityCooldownLeft = def.abilityCooldown;
    return { ...state, units: newUnits, log, effects: [...state.effects, ...enemies.map(e => ({ id: `fx_${Date.now()}_${e.id}`, col: e.col, row: e.row, type: 'explosion' as const, startTime: Date.now() }))], shakeKey: state.shakeKey + 1 };
  }
  else if (unit.type === 'special_forces') { newUnit.abilityActive = true; newUnit.abilityActiveTurns = 1; newUnit.abilityCooldownLeft = def.abilityCooldown; log.push({ turn: state.turn, msg: `🎯 ${def.nameAr} يجهز اغتيال! الهجوم التالي ×3`, type: 'tactic' }); }
  else if (unit.type === 'cavalry') { newUnit.abilityActive = true; newUnit.abilityActiveTurns = 1; newUnit.abilityCooldownLeft = def.abilityCooldown; log.push({ turn: state.turn, msg: `🐎 ${def.nameAr} يجهز هجوم سهم! تحرك+هجوم ×2`, type: 'tactic' }); }
  // === NEW UNIT ABILITIES ===
  else if (unit.type === 'medics') {
    const allies = state.units.filter(u => u.owner === 'player' && !u.isFake && u.hp > 0 && u.id !== unitId && hexDist(unit.col, unit.row, u.col, u.row) <= 2);
    if (allies.length > 0) {
      allies.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
      const target = allies[0];
      const tIdx = state.units.findIndex(u => u.id === target.id);
      const healed = Math.min(40, target.maxHp - target.hp);
      if (tIdx >= 0 && healed > 0) {
        newUnits = state.units.map(u => u.id === unitId ? newUnit : u);
        newUnits = newUnits.map((u, i) => i === tIdx ? { ...u, hp: Math.min(u.maxHp, u.hp + 40) } : u);
        newUnits[uIdx] = newUnit;
        log.push({ turn: state.turn, msg: `⚕️ ${def.nameAr} عالج ${UNIT_DEFS[target.type].nameAr} +${healed} HP`, type: 'defense' });
        newUnit.abilityCooldownLeft = def.abilityCooldown;
        return { ...state, units: newUnits, log, effects: [...state.effects, { id: `fx_heal_${Date.now()}`, col: target.col, row: target.row, type: 'heal' as const, startTime: Date.now() }] };
      }
    }
    log.push({ turn: state.turn, msg: `⚕️ لا يوجد حلفاء جرحى في النطاق`, type: 'info' });
    return state;
  }
  else if (unit.type === 'engineers') {
    newUnit.entrenched = true; newUnit.abilityActive = true; newUnit.abilityActiveTurns = 3; newUnit.abilityCooldownLeft = def.abilityCooldown;
    log.push({ turn: state.turn, msg: `🔧 ${def.nameAr} تحصين! +60% دفاع لمدة 3 أدوار`, type: 'defense' });
  }
  else if (unit.type === 'scouts') {
    const revealed = state.revealed.map(r => [...r]);
    revealAround(state.grid, revealed, unit.col, unit.row, 6);
    newUnit.abilityCooldownLeft = def.abilityCooldown;
    log.push({ turn: state.turn, msg: `🔭 ${def.nameAr} رصد! كشف المنطقة المحيطة بمدى 6`, type: 'info' });
    newUnits = state.units.map(u => u.id === unitId ? newUnit : u);
    return { ...state, units: newUnits, log, revealed };
  }
  else if (unit.type === 'marines') {
    newUnit.abilityActive = true; newUnit.abilityActiveTurns = 2; newUnit.abilityCooldownLeft = def.abilityCooldown;
    log.push({ turn: state.turn, msg: `⚓ ${def.nameAr} إنزال بحري! يمكن التحرك فوق الماء لمدة دورين`, type: 'tactic' });
  }
  else if (unit.type === 'rocket_artillery') {
    const tactic = TACTICS.find(t => t.id === state.playerTactic);
    const secondary = TACTICS.find(t => t.id === state.secondaryPlayerTactic);
    const enemies = state.units.filter(e => e.owner !== 'player' && !e.isFake && hexDist(unit.col, unit.row, e.col, e.row) <= 3);
    newUnits = state.units.map(u => u.id === unitId ? { ...newUnit } : u);
    newUnits[uIdx] = newUnit;
    for (const e of enemies) {
      const dmg = Math.round(calcDamage(unit, e, tactic, secondary, state.grid, state.weather, state.player.morale, state.ai.morale, false) * 0.5);
      const eIdx = newUnits.findIndex(u => u.id === e.id);
      if (eIdx >= 0) {
        let hp = newUnits[eIdx].hp - dmg;
        log.push({ turn: state.turn, msg: `🎆 قصف صاروخي على ${UNIT_DEFS[e.type].nameAr} - ${dmg} ضرر`, type: 'attack' });
        if (hp <= 0) { log.push({ turn: state.turn, msg: `  ✗ ${UNIT_DEFS[e.type].nameAr} دُمر!`, type: 'system' }); newUnits = newUnits.filter(u => u.id !== e.id); } else { newUnits[eIdx] = { ...newUnits[eIdx], hp }; }
      }
    }
    newUnit.abilityCooldownLeft = def.abilityCooldown;
    return { ...state, units: newUnits, log, effects: [...state.effects, ...enemies.map(e => ({ id: `fx_rocket_${Date.now()}_${e.id}`, col: e.col, row: e.row, type: 'explosion' as const, startTime: Date.now() }))], shakeKey: state.shakeKey + 1 };
  }
  else if (unit.type === 'commando') {
    newUnit.abilityActive = true; newUnit.abilityActiveTurns = 1; newUnit.abilityCooldownLeft = def.abilityCooldown;
    log.push({ turn: state.turn, msg: `🎯 ${def.nameAr} عملية خاصة! الهجوم التالي ×2 ضرر +يشفي 20 HP`, type: 'tactic' });
  }
  else if (unit.type === 'supply_truck') {
    newUnit.abilityCooldownLeft = def.abilityCooldown;
    log.push({ turn: state.turn, msg: `🚛 ${def.nameAr} إمداد! +15 إمداد فوري`, type: 'tactic' });
    newUnits = state.units.map(u => u.id === unitId ? newUnit : u);
    return { ...state, units: newUnits, log, player: { ...state.player, supply: state.player.supply + 15 } };
  }
  newUnits = state.units.map(u => u.id === unitId ? newUnit : u);
  return { ...state, units: newUnits, log };
}
function handleConfirmAttack(state: GameState): GameState {
  if (!state.showBattleModal) return state;
  const { attacker, defender, dmg, counterDmg } = state.showBattleModal;
  const tactic = TACTICS.find(t => t.id === state.playerTactic);
  const secondary = TACTICS.find(t => t.id === state.secondaryPlayerTactic);
  const aiTactic = TACTICS.find(t => t.id === state.aiTactic);
  let newUnits = state.units.map(u => ({ ...u }));
  const log = [...state.log];
  log.push({ turn: state.turn, msg: `⚔️ ${UNIT_DEFS[attacker.type].nameAr} هاجم ${UNIT_DEFS[defender.type].nameAr} - ${dmg} ضرر`, type: 'attack' });
  let pKilled = state.playerUnitsKilled, aKilled = state.aiUnitsKilled;
  let totalDmgDealt = state.totalDamageDealt + dmg, totalDmgReceived = state.totalDamageReceived;
  let defIdx = newUnits.findIndex(u => u.id === defender.id);
  let newHp = defender.hp - dmg;
  if (aiTactic?.special === 'tactical_retreat' && defender.owner === 'ai' && newHp <= 0) { newHp = Math.floor(defender.maxHp * 0.5); log.push({ turn: state.turn, msg: '  ⚡ الانسحاب التكتيكي للعدو!', type: 'defense' }); }
  if (newHp <= 0) { newUnits = newUnits.filter(u => u.id !== defender.id); if (defender.owner === 'ai') { pKilled++; if (attacker.type === 'artillery' || attacker.type === 'rocket_artillery') state.artilleryKills++; log.push({ turn: state.turn, msg: `  ✗ ${UNIT_DEFS[defender.type].nameAr} (عدو) دُمر!`, type: 'system' }); } else { aKilled++; state.playerLostNoUnits = false; } } else { newUnits[defIdx] = { ...newUnits[defIdx], hp: newHp }; }
  let atkIdx = newUnits.findIndex(u => u.id === attacker.id);
  if (atkIdx >= 0) {
    let au = { ...newUnits[atkIdx] };
    au.exp += 8; if (newHp <= 0) au.exp += 12;
    if (au.exp >= au.maxExp) { au.level++; au.exp = 0; au.maxExp += 10; au.atk += 2; au.def += 1; if (au.level === 3) au.mov += 1; if (au.level === 5) { au.hp = Math.min(au.maxHp, au.hp + 20); } log.push({ turn: state.turn, msg: `  ⬆️ ${UNIT_DEFS[au.type].nameAr} ارتفع للمستوى ${au.level}!`, type: 'info' }); }
    au.attacked = true;
    // Commando heals after attack when ability active
    if (au.abilityActive && au.type === 'commando') {
      au.hp = Math.min(au.maxHp, au.hp + 20);
      au.abilityActive = false; au.abilityActiveTurns = 0;
      log.push({ turn: state.turn, msg: `  💚 ${UNIT_DEFS[au.type].nameAr} شُفي +20 HP`, type: 'defense' });
    }
    if (au.type === 'missiles') { newUnits = newUnits.filter(u => u.id !== au.id); log.push({ turn: state.turn, msg: '  💥 الصواريخ استُهلكت!', type: 'system' }); } else { newUnits[atkIdx] = au; }
  }
  if (newHp > 0 && counterDmg > 0) {
    log.push({ turn: state.turn, msg: `  🔄 هجوم مضاد: ${UNIT_DEFS[defender.type].nameAr} رد بـ ${counterDmg} ضرر`, type: 'defense' });
    totalDmgReceived += counterDmg;
    atkIdx = newUnits.findIndex(u => u.id === attacker.id);
    if (atkIdx >= 0) {
      let aHp = newUnits[atkIdx].hp - counterDmg;
      if (aHp <= 0) { newUnits = newUnits.filter(u => u.id !== attacker.id); aKilled++; state.playerLostNoUnits = false; log.push({ turn: state.turn, msg: `  ✗ ${UNIT_DEFS[attacker.type].nameAr} دُمر بهجوم مضاد!`, type: 'system' }); }
      else { newUnits[atkIdx] = { ...newUnits[atkIdx], hp: aHp }; }
    }
  }
  const aiAlive = newUnits.filter(u => u.owner === 'ai' && !u.isFake && u.hp > 0).length;
  const playerAlive = newUnits.filter(u => u.owner === 'player' && !u.isFake && u.hp > 0).length;
  const newEffects = [...state.effects, { id: `fx_${Date.now()}`, col: defender.col, row: defender.row, type: 'attack' as const, startTime: Date.now() }];
  if (newHp <= 0) newEffects.push({ id: `fx2_${Date.now()}`, col: defender.col, row: defender.row, type: 'explosion' as const, startTime: Date.now() });
  return { ...state, units: newUnits, selectedId: null, validAttacks: [], validMoves: [], log, damagePreview: null, showBattleModal: null, playerUnitsKilled: pKilled, aiUnitsKilled: aKilled, totalDamageDealt: totalDmgDealt, totalDamageReceived: totalDmgReceived, effects: newEffects, shakeKey: attacker.type === 'artillery' || attacker.type === 'missiles' || attacker.type === 'rocket_artillery' ? state.shakeKey + 1 : state.shakeKey, winner: aiAlive === 0 ? 'player' : playerAlive === 0 ? 'ai' : null, phase: aiAlive === 0 || playerAlive === 0 ? 'ai_turn' : state.phase };
}
function handleHexClick(state: GameState, col: number, row: number): GameState {
  if (state.phase !== 'movement' && state.phase !== 'attack') return state;
  if (state.deployMode) {
    const cost = UNIT_DEFS[state.deployMode].cost;
    if (state.player.supply < cost || col > 2 || getTerrainAt(state.grid, col, row) === 'water' || getUnitAt(state.units, col, row)) return state;
    const def = UNIT_DEFS[state.deployMode];
    const newUnit = createUnit(Date.now(), state.deployMode, 'player', col, row);
    return { ...state, units: [...state.units, { ...newUnit, moved: true, attacked: true }], player: { ...state.player, supply: state.player.supply - cost }, deployMode: null, log: [...state.log, { turn: state.turn, msg: `✦ تم نشر ${def.nameAr}`, type: 'tactic' }] };
  }
  const clicked = getUnitAt(state.units, col, row);
  const tactic = TACTICS.find(t => t.id === state.playerTactic);
  const secondary = TACTICS.find(t => t.id === state.secondaryPlayerTactic);
  if (state.phase === 'movement') {
    if (state.selectedId) {
      const sel = state.units.find(u => u.id === state.selectedId);
      if (sel && state.validMoves.some(([mc, mr]) => mc === col && mr === row)) {
        const prev = JSON.parse(JSON.stringify(state));
        const newUnits = state.units.map(u => u.id === sel.id ? { ...u, col, row, moved: true } : u);
        const attacks = calcValidAttacks({ ...sel, col, row }, newUnits, tactic);
        return { ...state, units: newUnits, selectedId: sel.id, validMoves: [], validAttacks: attacks, previousState: prev, log: [...state.log, { turn: state.turn, msg: `▸ ${UNIT_DEFS[sel.type].nameAr} تحرك`, type: 'movement' }] };
      }
      if (clicked && clicked.owner === 'player' && !clicked.isFake && !clicked.moved) return { ...state, selectedId: clicked.id, validMoves: calcValidMoves(clicked, state.grid, state.units, tactic, secondary), validAttacks: calcValidAttacks(clicked, state.units, tactic), damagePreview: null };
      return { ...state, selectedId: null, validMoves: [], validAttacks: [], damagePreview: null };
    }
    if (clicked && clicked.owner === 'player' && !clicked.isFake && !clicked.moved) return { ...state, selectedId: clicked.id, validMoves: calcValidMoves(clicked, state.grid, state.units, tactic, secondary), validAttacks: calcValidAttacks(clicked, state.units, tactic), damagePreview: null };
  }
  if (state.phase === 'attack') {
    if (state.selectedId) {
      const sel = state.units.find(u => u.id === state.selectedId);
      if (sel && !sel.attacked && clicked && clicked.owner !== 'player' && state.validAttacks.some(([ac, ar]) => ac === col && ar === row)) {
        const dmg = calcDamage(sel, clicked, tactic, secondary, state.grid, state.weather, state.player.morale, state.ai.morale, false);
        const cDmg = calcCounterDamage(sel, clicked, tactic, secondary, state.grid, state.weather, state.player.morale, state.ai.morale);
        return { ...state, showBattleModal: { attacker: sel, defender: clicked, dmg, counterDmg: cDmg } };
      }
      if (clicked && clicked.owner === 'player' && !clicked.isFake && !clicked.attacked) return { ...state, selectedId: clicked.id, validAttacks: calcValidAttacks(clicked, state.units, tactic), validMoves: [], damagePreview: null };
      return { ...state, selectedId: null, validAttacks: [], validMoves: [], damagePreview: null };
    }
    if (clicked && clicked.owner === 'player' && !clicked.isFake && !clicked.attacked) return { ...state, selectedId: clicked.id, validAttacks: calcValidAttacks(clicked, state.units, tactic), validMoves: [], damagePreview: null };
  }
  return state;
}
// ==================== AI LOGIC ====================
function aiSelectTactic(state: GameState): string {
  const aiU = state.units.filter(u => u.owner === 'ai' && !u.isFake);
  const pU = state.units.filter(u => u.owner === 'player' && !u.isFake);
  const ratio = aiU.length / Math.max(1, pU.length);
  const isHard = state.difficulty === 'hard' || state.difficulty === 'legendary';
  if (ratio > 1.3 || (isHard && ratio > 1.1)) { const off = TACTICS.filter(t => t.category === 'attack'); return off[Math.floor(Math.random() * off.length)].id; }
  if (ratio < 0.8 || (!isHard && ratio < 1)) { const def = TACTICS.filter(t => t.category === 'defense'); return def[Math.floor(Math.random() * def.length)].id; }
  const fU = aiU.filter(u => getTerrainAt(state.grid, u.col, u.row) === 'forest');
  if (fU.length >= 2 && isHard) return 'guerrilla';
  return TACTICS[Math.floor(Math.random() * TACTICS.length)].id;
}
function aiExecuteTurn(state: GameState): { units: Unit[]; log: LogEntry[]; ai: PlayerState; playerSupplyDelta: number } {
  const log: LogEntry[] = [];
  let units = state.units.map(u => ({ ...u, moved: false, attacked: false }));
  const aiTactic = TACTICS.find(t => t.id === state.aiTactic);
  const playerTactic = TACTICS.find(t => t.id === state.playerTactic);
  let ai = { ...state.ai };
  let playerSupplyDelta = 0;
  const diffMult = state.difficulty === 'easy' ? 0.8 : state.difficulty === 'hard' ? 1.1 : state.difficulty === 'legendary' ? 1.25 : 1;
  if (aiTactic?.special === 'attrition') { playerSupplyDelta -= 10; log.push({ turn: state.turn, msg: '▸ استنزاف العدو: -10 إمدادات', type: 'tactic' }); }
  if (aiTactic?.special === 'scorched_earth') { playerSupplyDelta -= 20; log.push({ turn: state.turn, msg: '▸ الأرض المحروقة: -20 إمدادات', type: 'tactic' }); }
  if (aiTactic?.special === 'deception') { for (let i = 0; i < 2; i++) { for (let c = 11; c <= 13; c++) { for (let r = 0; r < ROWS; r++) { if (!getUnitAt(units, c, r) && getTerrainAt(state.grid, c, r) !== 'water') { units.push({ ...createUnit(Date.now() + i, 'infantry', 'ai', c, r), isFake: true, fakeTurns: 2, moved: true, attacked: true }); break; } } } } log.push({ turn: state.turn, msg: '▸ وحدات وهمية!', type: 'tactic' }); }
  units = units.filter(u => !u.isFake || u.fakeTurns > 0).map(u => u.isFake ? { ...u, fakeTurns: u.fakeTurns - 1 } : u);
  const aiUnits = units.filter(u => u.owner === 'ai' && !u.isFake && u.hp > 0);
  const pU = () => units.filter(u => u.owner === 'player' && !u.isFake && u.hp > 0);
  // Sort with priority values for new units
  const sorted = [...aiUnits].sort((a, b) => {
    const p: Record<string, number> = {
      rocket_artillery: -2, artillery: -1, supply_truck: 0, armor: 1, infantry: 2,
      special_forces: 3, cavalry: 4, missiles: 5, engineers: 6, medics: 7,
      commando: 8, marines: 9, scouts: 10,
    };
    return (p[a.type] ?? 3) - (p[b.type] ?? 3);
  });
  for (const unit of sorted) {
    if (unit.hp <= 0 || !units.find(u => u.id === unit.id)) continue;
    const enemies = pU();
    if (enemies.length === 0) break;
    // Medics: heal wounded allies first
    if (unit.type === 'medics' && unit.abilityCooldownLeft <= 0) {
      const allies = units.filter(u => u.owner === 'ai' && !u.isFake && u.hp > 0 && u.id !== unit.id && u.hp < u.maxHp && hexDist(unit.col, unit.row, u.col, u.row) <= 2);
      if (allies.length > 0) {
        allies.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
        const target = allies[0];
        const tIdx = units.findIndex(u => u.id === target.id);
        if (tIdx >= 0) {
          units[tIdx] = { ...units[tIdx], hp: Math.min(units[tIdx].maxHp, units[tIdx].hp + 40) };
          const uIdx = units.findIndex(u => u.id === unit.id);
          if (uIdx >= 0) units[uIdx] = { ...units[uIdx], abilityCooldownLeft: 3 };
          log.push({ turn: state.turn, msg: `▸ ${UNIT_DEFS[unit.type].nameAr} (عدو) عالج ${UNIT_DEFS[target.type].nameAr}`, type: 'defense' });
        }
        continue;
      }
    }
    // Supply truck: stay safe
    if (unit.type === 'supply_truck') {
      if (unit.abilityCooldownLeft <= 0) {
        ai = { ...ai, supply: ai.supply + 15 };
        const uIdx = units.findIndex(u => u.id === unit.id);
        if (uIdx >= 0) units[uIdx] = { ...units[uIdx], abilityCooldownLeft: 3 };
        log.push({ turn: state.turn, msg: `▸ ${UNIT_DEFS[unit.type].nameAr} (عدو) إمداد +15`, type: 'tactic' });
      }
      // Move away from enemies
      const moves = calcValidMoves(unit, state.grid, units, aiTactic, null);
      const retreatMoves = moves.filter(([mc, mr]) => mc > unit.col);
      if (retreatMoves.length > 0) {
        const [bc, br] = retreatMoves[Math.floor(Math.random() * retreatMoves.length)];
        const uidx = units.findIndex(u => u.id === unit.id);
        if (uidx >= 0) units[uidx] = { ...units[uidx], col: bc, row: br, moved: true };
      }
      continue;
    }
    // Scouts: move forward to reveal
    if (unit.type === 'scouts') {
      const moves = calcValidMoves(unit, state.grid, units, aiTactic, null);
      if (moves.length > 0) {
        const forwardMoves = moves.filter(([mc]) => mc < unit.col);
        if (forwardMoves.length > 0) {
          const [bc, br] = forwardMoves[Math.floor(Math.random() * forwardMoves.length)];
          const uidx = units.findIndex(u => u.id === unit.id);
          if (uidx >= 0) units[uidx] = { ...units[uidx], col: bc, row: br, moved: true };
          log.push({ turn: state.turn, msg: `▸ ${UNIT_DEFS[unit.type].nameAr} (عدو) استكشف`, type: 'movement' });
        }
      }
      continue;
    }
    // Engineers: fortify near allies
    if (unit.type === 'engineers') {
      if (unit.abilityCooldownLeft <= 0) {
        const uIdx = units.findIndex(u => u.id === unit.id);
        if (uIdx >= 0) {
          units[uIdx] = { ...units[uIdx], entrenched: true, abilityActive: true, abilityActiveTurns: 3, abilityCooldownLeft: 4 };
          log.push({ turn: state.turn, msg: `▸ ${UNIT_DEFS[unit.type].nameAr} (عدو) تحصين`, type: 'defense' });
        }
      }
      continue;
    }
    // Wounded retreat
    if (unit.hp < unit.maxHp * 0.3 && unit.type !== 'artillery' && unit.type !== 'rocket_artillery') {
      const moves = calcValidMoves(unit, state.grid, units, aiTactic, null);
      const retreatMoves = moves.filter(([mc, mr]) => mc > unit.col);
      if (retreatMoves.length > 0) { const [bc, br] = retreatMoves[0]; const uidx = units.findIndex(u => u.id === unit.id); if (uidx >= 0) { units[uidx] = { ...units[uidx], col: bc, row: br, moved: true }; log.push({ turn: state.turn, msg: `▸ ${UNIT_DEFS[unit.type].nameAr} (عدو) انسحب`, type: 'movement' }); } continue; }
    }
    const tryAttack = () => {
      const currentUnit = units.find(u => u.id === unit.id);
      if (!currentUnit || currentUnit.attacked) return false;
      const eTargets = enemies.filter(e => hexDist(currentUnit.col, currentUnit.row, e.col, e.row) <= currentUnit.range + (aiTactic?.special === 'siege' ? 1 : 0));
      // Commando: target high value units
      if (currentUnit.type === 'commando') {
        eTargets.sort((a, b) => UNIT_DEFS[b.type].cost - UNIT_DEFS[a.type].cost);
      } else {
        eTargets.sort((a, b) => a.hp - b.hp);
      }
      for (const target of eTargets) {
        const dmg = calcDamage(currentUnit, target, aiTactic, null, state.grid, state.weather, ai.morale, state.player.morale, false);
        const tidx = units.findIndex(u => u.id === target.id);
        if (tidx >= 0) {
          let hp = units[tidx].hp - dmg;
          log.push({ turn: state.turn, msg: `▸ ${UNIT_DEFS[currentUnit.type].nameAr} (عدو) هاجم ${UNIT_DEFS[target.type].nameAr} - ${dmg}`, type: 'attack' });
          if (playerTactic?.special === 'tactical_retreat' && hp <= 0 && target.owner === 'player') { hp = Math.floor(target.maxHp * 0.5); log.push({ turn: state.turn, msg: '  ⚡ انسحاب تكتيكي!', type: 'defense' }); }
          units[tidx] = { ...units[tidx], hp };
          if (hp > 0 && target.range >= hexDist(currentUnit.col, currentUnit.row, target.col, target.row) && target.type !== 'artillery' && target.type !== 'rocket_artillery') {
            const cDmg = calcDamage(target, currentUnit, playerTactic, null, state.grid, state.weather, state.player.morale, ai.morale, true);
            const uidx2 = units.findIndex(u => u.id === currentUnit.id);
            if (uidx2 >= 0) { units[uidx2] = { ...units[uidx2], hp: Math.max(0, units[uidx2].hp - cDmg) }; }
          }
          if (hp <= 0) { units = units.filter(u => u.id !== target.id); log.push({ turn: state.turn, msg: `  ✗ ${UNIT_DEFS[target.type].nameAr} دُمر!`, type: 'system' }); }
          const uidx3 = units.findIndex(u => u.id === currentUnit.id);
          if (uidx3 >= 0) {
            let au = { ...units[uidx3], attacked: true };
            // Commando ability: activate if available
            if (currentUnit.type === 'commando' && currentUnit.abilityCooldownLeft <= 0 && !currentUnit.abilityActive) {
              au.abilityActive = true; au.abilityActiveTurns = 1; au.abilityCooldownLeft = UNIT_DEFS.commando.abilityCooldown;
              log.push({ turn: state.turn, msg: `  🎯 كوماندوز عدو: عملية خاصة!`, type: 'tactic' });
            }
            units[uidx3] = au;
          }
          if (currentUnit.type === 'missiles') { units = units.filter(u => u.id !== currentUnit.id); }
          return true;
        }
      }
      return false;
    };
    if (tryAttack()) continue;
    // Move
    if (!unit.moved) {
      const moves = calcValidMoves(unit, state.grid, units, aiTactic, null);
      if (moves.length > 0) {
        let bestMove: [number, number] | null = null; let bestScore = -Infinity;
        for (const [mc, mr] of moves) {
          const minEd = Math.min(...enemies.map(e => hexDist(mc, mr, e.col, e.row)));
          const t = getTerrainAt(state.grid, mc, mr);
          let score = -minEd * 2 + TERRAIN_DEFS[t].defBonus * 15;
          if (unit.type === 'artillery' || unit.type === 'rocket_artillery') score -= minEd < 2 ? 100 : 0;
          if (unit.type === 'artillery' || unit.type === 'rocket_artillery') score += (minEd > 2 && minEd <= unit.range) ? 20 : 0;
          // Marines try to cross water to flank
          if (unit.type === 'marines') score += (getTerrainAt(state.grid, mc, mr) === 'beach' ? 5 : 0);
          if (unit.hp < unit.maxHp * 0.5) score += (mc > unit.col ? 10 : -5);
          score += Math.random() * 3;
          if (score > bestScore) { bestScore = score; bestMove = [mc, mr]; }
        }
        if (bestMove) {
          const uidx = units.findIndex(u => u.id === unit.id);
          if (uidx >= 0) { units[uidx] = { ...units[uidx], col: bestMove[0], row: bestMove[1], moved: true }; log.push({ turn: state.turn, msg: `▸ ${UNIT_DEFS[unit.type].nameAr} (عدو) تحرك`, type: 'movement' }); }
          tryAttack();
        }
      }
    }
  }
  // Deploy
  const deployable: UnitType[] = ['infantry', 'armor', 'artillery', 'cavalry', 'medics', 'engineers'];
  for (let d = 0; d < 2; d++) {
    if (ai.supply < 10) break;
    const infCount = aiUnits.filter(u => u.type === 'infantry').length;
    const artCount = aiUnits.filter(u => u.type === 'artillery').length;
    let type: UnitType = infCount < artCount ? 'infantry' : deployable[Math.floor(Math.random() * deployable.length)];
    const cost = UNIT_DEFS[type].cost;
    if (ai.supply < cost) continue;
    for (let c = 13; c >= 11; c--) { for (let r = 0; r < ROWS; r++) { if (!getUnitAt(units, c, r) && getTerrainAt(state.grid, c, r) !== 'water') { units.push({ ...createUnit(Date.now() + d, type, 'ai', c, r), moved: true, attacked: true }); ai = { ...ai, supply: ai.supply - cost }; log.push({ turn: state.turn, msg: `▸ العدو نشر ${UNIT_DEFS[type].nameAr}`, type: 'tactic' }); break; } } if (ai.supply < cost) break; }
  }
  return { units, log, ai, playerSupplyDelta };
}
function handleAIComplete(state: GameState): GameState {
  const { units: newUnits, log: aiLog, ai: newAi, playerSupplyDelta } = aiExecuteTurn(state);
  const finalUnits = newUnits.filter(u => !u.isFake || u.fakeTurns > 0).map(u => u.isFake ? { ...u, fakeTurns: u.fakeTurns - 1 } : u);
  const aiAlive = finalUnits.filter(u => u.owner === 'ai' && !u.isFake && u.hp > 0).length;
  const playerAlive = finalUnits.filter(u => u.owner === 'player' && !u.isFake && u.hp > 0).length;
  if (aiAlive === 0 || playerAlive === 0) {
    const w: GameState = { ...state, units: finalUnits, ai: newAi, animating: false, log: [...state.log, ...aiLog], winner: aiAlive === 0 ? 'player' : 'ai', screen: 'game_over', playerUnitsKilled: state.playerUnitsKilled, aiUnitsKilled: state.aiUnitsKilled, playerUsedPincer: state.playerUsedPincer, playerUsedBlitzkrieg: state.playerUsedBlitzkrieg, playerUsedGuerrilla: state.playerUsedGuerrilla, playerUsedSiege: state.playerUsedSiege, artilleryKills: state.artilleryKills, playerLostNoUnits: state.playerLostNoUnits, tacticsUsed: state.tacticsUsed, totalDamageDealt: state.totalDamageDealt, totalDamageReceived: state.totalDamageReceived };
    if (w.winner === 'player') checkAchievements(w);
    return w;
  }
  const newTurn = state.turn + 1;
  const pTactic = TACTICS.find(t => t.id === state.playerTactic);
  let aiSupplyRed = 0;
  if (pTactic?.special === 'attrition') aiSupplyRed += 10;
  if (pTactic?.special === 'scorched_earth') aiSupplyRed += 20;
  const leveled = finalUnits.map(u => {
    if (u.owner === 'ai' && newAi.training >= 20 && u.level < 5) { const nu = { ...u, level: u.level + 1, atk: u.atk + 2, def: u.def + 1 }; if (nu.level === 3) nu.mov += 1; return nu; }
    return u;
  });
  let weather = state.weather;
  let wTurnsLeft = state.weatherTurnsLeft - 1;
  if (wTurnsLeft <= 0) { weather = getWeather(); wTurnsLeft = 3; }
  const healed = leveled.map(u => {
    if (u.hp <= 0 || u.isFake) return u;
    const cell = state.grid[u.col]?.[u.row];
    if (cell?.building === 'hospital' && cell.buildingOwner === u.owner) return { ...u, hp: Math.min(u.maxHp, u.hp + 15) };
    for (const [nc, nr] of getNeighbors(u.col, u.row)) {
      const n = state.grid[nc]?.[nr];
      if (n?.building === 'hospital' && n.buildingOwner === u.owner) return { ...u, hp: Math.min(u.maxHp, u.hp + 15) };
    }
    return u;
  });
  const updated = healed.map(u => {
    let nu = { ...u };
    if (nu.abilityCooldownLeft > 0 && !nu.abilityActive) nu.abilityCooldownLeft--;
    if (nu.abilityActiveTurns > 0) { nu.abilityActiveTurns--; if (nu.abilityActiveTurns <= 0) { nu.abilityActive = false; nu.entrenched = false; } }
    if (nu.abilityActive && nu.abilityActiveTurns <= 0) { nu.abilityCooldownLeft = UNIT_DEFS[nu.type].abilityCooldown; nu.abilityActive = false; }
    return nu;
  });
  const buildingUnits = updated.map(u => {
    const cell = state.grid[u.col]?.[u.row];
    if (cell?.building && cell.buildingOwner !== u.owner) return { ...u };
    return u;
  });
  let pFactoryBonus = 0, aFactoryBonus = 0;
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const cell = state.grid[c][r];
    if (cell.building === 'factory') {
      const unit = getUnitAt(buildingUnits, c, r);
      if (unit?.owner === 'player') pFactoryBonus += 5;
      if (unit?.owner === 'ai') aFactoryBonus += 5;
    }
  }
  const newGrid = state.grid.map(col => col.map(cell => {
    const u = getUnitAt(buildingUnits, cell.col, cell.row);
    if (u && cell.building) return { ...cell, buildingOwner: u.owner };
    return cell;
  }));
  let pMorale = state.player.morale;
  let aMorale = state.ai.morale;
  pMorale += pMorale > 50 ? 3 : 5;
  aMorale += aMorale > 50 ? 3 : 5;
  if (weather === 'rain') { pMorale -= 2; aMorale -= 2; }
  if (weather === 'storm') { pMorale -= 5; aMorale -= 5; }
  pMorale = Math.max(0, Math.min(100, pMorale));
  aMorale = Math.max(0, Math.min(100, aMorale));
  const pLeveled = updated.map(u => {
    if (u.owner === 'player' && state.player.training >= 20 && u.level < 5) { const nu = { ...u, level: u.level + 1, atk: u.atk + 2, def: u.def + 1 }; if (nu.level === 3) nu.mov += 1; return nu; }
    return u;
  });
  const stormDmg = weather === 'storm' ? pLeveled.map(u => { if (Math.random() > 0.8 && !u.isFake) return { ...u, hp: Math.max(1, u.hp - 5) }; return u; }) : pLeveled;
  const revealed = state.revealed.map(r => [...r]);
  const visionRange = weather === 'fog' ? 1 : 2;
  stormDmg.filter(u => u.owner === 'player' && !u.isFake && u.hp > 0).forEach(u => revealAround(newGrid, revealed, u.col, u.row, u.type === 'cavalry' || u.type === 'scouts' ? visionRange + 1 : u.type === 'artillery' || u.type === 'rocket_artillery' ? Math.max(1, visionRange - 1) : visionRange));
  const aiNewTactic = aiSelectTactic({ ...state, units: stormDmg, turn: newTurn });
  const supplyGain = 10 + pFactoryBonus;
  const aiSupplyGain = 10 + aFactoryBonus + (state.difficulty === 'hard' ? 5 : state.difficulty === 'legendary' ? 10 : 0);
  const nextLog = [...state.log, ...aiLog, { turn: newTurn, msg: `═══ الدور ${newTurn} ═══`, type: 'info' }, { turn: newTurn, msg: `📦 +${supplyGain} إمداد, +5 تدريب | ${WEATHER_NAMES[weather].icon} ${WEATHER_NAMES[weather].name}`, type: 'info' }];
  if (playerSupplyDelta < 0) nextLog.push({ turn: newTurn, msg: `📉 -${Math.abs(playerSupplyDelta)} إمداد (تأثير العدو)`, type: 'tactic' });
  try { if (typeof window !== 'undefined') localStorage.setItem('warGame_auto', JSON.stringify({ ...state, units: stormDmg, grid: newGrid, revealed, turn: newTurn })); } catch {}
  return {
    ...state, units: stormDmg, grid: newGrid, revealed, ai: { ...newAi, supply: Math.max(0, newAi.supply + aiSupplyGain - aiSupplyRed), training: newAi.training >= 20 ? newAi.training - 20 + 5 : newAi.training + 5, morale: aMorale },
    phase: 'planning', turn: newTurn, animating: false,
    playerTactic: null, secondaryPlayerTactic: null, aiTactic: aiNewTactic, tacticId: null, secondaryTacticId: null,
    selectedId: null, validMoves: [], validAttacks: [], deployMode: null, log: nextLog,
    player: { supply: Math.max(0, state.player.supply + supplyGain + playerSupplyDelta), morale: pMorale, training: state.player.training >= 20 ? state.player.training - 20 + 5 : state.player.training + 5 },
    weather, weatherTurnsLeft: wTurnsLeft,
    previousState: null,
  };
}
function checkAchievements(state: GameState) {
  const a = [...state.achievements];
  const add = (id: string) => { if (!a.includes(id)) a.push(id); };
  if (state.playerUsedPincer >= 3) add('victor_cannae');
  if (state.playerUsedBlitzkrieg) add('rommel');
  if (state.playerUsedGuerrilla) add('grey_wolf');
  if (state.playerLostNoUnits) add('war_hero');
  if (state.difficulty === 'legendary') add('war_master');
  if (state.artilleryKills >= 5) add('artillery_master');
  if (state.playerUsedSiege) add('siege_master');
  try { if (typeof window !== 'undefined') localStorage.setItem('warGame_achievements', JSON.stringify(a)); } catch {}
  state.achievements = a;
}
// ==================== COMPONENTS ====================
function MainMenu({ onStart, onHelp, onLoad }: { onStart: (d: Difficulty) => void; onHelp: () => void; onLoad: () => void }) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const difficulties: { key: Difficulty; name: string; desc: string; color: string }[] = [
    { key: 'easy', name: 'جندي', desc: 'سهل - مناسب للمبتدئين', color: '#27ae60' },
    { key: 'normal', name: 'قائد', desc: 'عادي - تحدي متوازن', color: '#f39c12' },
    { key: 'hard', name: 'استراتيجي', desc: 'صعب - AI ذكي', color: '#e67e22' },
    { key: 'legendary', name: 'أستاذ الحرب', desc: 'أسطوري - للخبراء فقط', color: '#e74c3c' },
  ];
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #53d769 1px, transparent 1px), radial-gradient(circle at 75% 75%, #e94560 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      <div className="relative z-10 text-center space-y-6 p-4">
        <div className="space-y-2">
          <div className="text-6xl mb-2">⚔️</div>
          <h1 className="text-4xl md:text-5xl font-bold text-white" style={{ textShadow: '0 0 30px rgba(233,69,96,0.5)' }}>معركة الاستراتيجية</h1>
          <p className="text-lg text-gray-300">حرب تكتيكية باستخدام استراتيجيات عسكرية حقيقية</p>
        </div>
        <div className="space-y-3">
          <div className="text-white font-bold text-lg mb-2">🎮 اختر مستوى الصعوبة</div>
          <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
            {difficulties.map(d => (
              <button key={d.key} onClick={() => { setSelectedDifficulty(d.key); onStart(d.key); }} className="py-3 px-4 rounded-lg text-white font-bold transition-all hover:scale-105 cursor-pointer border-2" style={{ borderColor: d.color, background: selectedDifficulty === d.key ? `${d.color}44` : `${d.color}22` }}>
                <div className="text-lg">{d.name}</div>
                <div className="text-xs text-gray-300">{d.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2 justify-center mt-4">
            <button onClick={onHelp} className="py-2 px-6 rounded-lg text-gray-200 border border-gray-500 hover:bg-white/5 cursor-pointer text-sm">📖 كيف تلعب</button>
            <button onClick={onLoad} className="py-2 px-6 rounded-lg text-gray-200 border border-gray-500 hover:bg-white/5 cursor-pointer text-sm">📂 تحميل لعبة</button>
          </div>
        </div>
        <div className="mt-4 text-gray-500 text-xs space-y-1">
          <p>⚔️ 13 وحدة | 🗺️ 7 خرائط | 🏗️ مباني | 🌦️ طقس</p>
          <p>🏰 12 تكتيك عسكري | 🎯 هجمات خاصة | 🏆 إنجازات</p>
        </div>
      </div>
    </div>
  );
}
function MapSelectScreen({ onSelect, onBack, difficulty }: { onSelect: (preset: MapPreset) => void; onBack: () => void; difficulty: Difficulty }) {
  const presets: MapPreset[] = ['classic', 'desert_storm', 'mountain_pass', 'island_hopping', 'forest_ambush', 'urban_warfare', 'river_crossing'];
  const terrainPreview: Record<MapPreset, { colors: string[] }> = {
    classic: { colors: ['#4a6741', '#1a5276', '#8b7355', '#2d5a27', '#c2a83e'] },
    desert_storm: { colors: ['#c2a83e', '#48c9b0', '#7f8c8d', '#8b7355', '#8e8e8e'] },
    mountain_pass: { colors: ['#8b7355', '#2d5a27', '#4a6741', '#8e8e8e', '#4a6741'] },
    island_hopping: { colors: ['#1a5276', '#4a6741', '#f5cba7', '#2d5a27', '#1a5276'] },
    forest_ambush: { colors: ['#2d5a27', '#3d5c3a', '#4a6741', '#7f8c8d', '#8e8e8e'] },
    urban_warfare: { colors: ['#5d6d7e', '#8e8e8e', '#2d5a27', '#7f8c8d', '#3d5c3a'] },
    river_crossing: { colors: ['#4a6741', '#1a5276', '#8e8e8e', '#5d6d7e', '#2d5a27'] },
  };
  return (
    <div className="min-h-screen p-4 md:p-6 overflow-y-auto" dir="rtl" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">🗺️ اختر الخريطة</h1>
          <button onClick={onBack} className="py-2 px-4 rounded-lg bg-gray-700 text-white hover:bg-gray-600 cursor-pointer text-sm">→ رجوع</button>
        </div>
        <div className="text-gray-400 text-sm">الصعوبة: {{ easy: 'جندي', normal: 'قائد', hard: 'استراتيجي', legendary: 'أستاذ الحرب' }[difficulty]}</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {presets.map(preset => {
            const info = MAP_PRESET_INFO[preset];
            const preview = terrainPreview[preset];
            return (
              <button key={preset} onClick={() => onSelect(preset)} className="rounded-xl p-4 text-right cursor-pointer transition-all hover:scale-105 border-2" style={{ background: '#16213e', borderColor: info.color + '66' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <div className="text-white font-bold text-sm">{info.name}</div>
                    <div className="text-gray-400" style={{ fontSize: '10px' }}>{info.difficulty}</div>
                  </div>
                </div>
                <div className="text-gray-300 text-xs mb-3 leading-relaxed">{info.desc}</div>
                <div className="flex gap-0.5 rounded overflow-hidden h-4">
                  {preview.colors.map((c, i) => (
                    <div key={i} className="flex-1" style={{ background: c }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
function HowToPlay({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen p-4 md:p-6 overflow-y-auto" dir="rtl" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-white">📖 كيف تلعب</h1><button onClick={onBack} className="py-2 px-4 rounded-lg bg-gray-700 text-white hover:bg-gray-600 cursor-pointer text-sm">→ رجوع</button></div>
        <div className="space-y-3 text-gray-200 text-sm leading-relaxed">
          <div className="p-3 rounded-lg" style={{ background: '#16213e' }}><h2 className="text-lg font-bold text-yellow-400 mb-1">🎯 الهدف</h2><p>دمّر كل وحدات العدو أو احصل على سيطرة كاملة على المباني للفوز</p></div>
          <div className="p-3 rounded-lg" style={{ background: '#16213e' }}><h2 className="text-lg font-bold text-yellow-400 mb-1">🔄 مراحل الدور</h2><ol className="list-decimal list-inside space-y-1"><li><strong>التخطيط:</strong> اختر تكتيك أساسي + ثانوي (50% قوة)</li><li><strong>الحركة:</strong> انقر وحدة ثم الوجهة | استخدم القدرة الخاصة</li><li><strong>الهجوم:</strong> اختر هدف، شاهد المقارنة، أكّد الهجوم</li><li><strong>نهاية:</strong> العدو يلعب دوره تلقائياً</li></ol></div>
          <div className="p-3 rounded-lg" style={{ background: '#16213e' }}><h2 className="text-lg font-bold text-yellow-400 mb-1">⚔️ هجوم مضاد</h2><p>المدافع يرد بـ 50% من قوته إذا كان في المدى. المدفعية لا ترد من المسافة القريبة!</p></div>
          <div className="p-3 rounded-lg" style={{ background: '#16213e' }}><h2 className="text-lg font-bold text-yellow-400 mb-1">🛡️ منطقة السيطرة</h2><p>المرور بجوار عدو يكلف حركة إضافية. الفرسان يتجاهلون ذلك!</p></div>
          <div className="p-3 rounded-lg" style={{ background: '#16213e' }}><h2 className="text-lg font-bold text-yellow-400 mb-1">🏔️ ضباب الحرب</h2><p>لا ترى سوى منطقة حول وحداتك. البرج يكشف مساحة واسعة</p></div>
          <div className="p-3 rounded-lg" style={{ background: '#16213e' }}><h2 className="text-lg font-bold text-yellow-400 mb-1">🌧️ الطقس</h2><p>يتغير كل 3 أدوار ويؤثر على الحركة والهجوم والمعنويات</p></div>
          <div className="p-3 rounded-lg" style={{ background: '#16213e' }}><h2 className="text-lg font-bold text-yellow-400 mb-1">🏗️ المباني</h2><p>تحرك إلى المبنى للسيطرة عليه: مصنع (+إمداد) | مستشفى (+شفاء) | حصن (+دفاع) | برج (كشف)</p></div>
          <div className="p-3 rounded-lg" style={{ background: '#16213e' }}><h2 className="text-lg font-bold text-yellow-400 mb-1">✂️ نقاط ضعف</h2><p>مشاة&gt;فرسان&gt;مدفعية&gt;دروع&gt;مشاة | قوات خاصة&gt;مدفعية | كوماندوز&gt;دروع,مدفعية | مشاة بحرية&gt;قوات خاصة | مدفعية صاروخية&gt;دروع,مشاة</p></div>
          <div className="p-3 rounded-lg" style={{ background: '#16213e' }}><h2 className="text-lg font-bold text-yellow-400 mb-1">⭐ الخبرة القتالية</h2><p>الوحدات تكسب خبرة من القتال وترتفع مستوياتها لتصبح أقوى</p></div>
          <div className="p-3 rounded-lg" style={{ background: '#16213e' }}><h2 className="text-lg font-bold text-yellow-400 mb-1">⚡ القدرات الخاصة</h2>
            <div className="space-y-1 mt-1">
              <div>🗡️ مشاة: حفر خنادق (+40% دفاع) | 🛡️ دروع: صدمة (×2 ضرر)</div>
              <div>💣 مدفعية: قصف مكثف (نطاق 2) | ⚔️ قوات خاصة: اغتيال (×3 ضرر)</div>
              <div>🐎 فرسان: هجوم سهم (تحرك+×2) | 🚀 صواريخ: هجوم بعيد المدى</div>
              <div className="text-green-400 font-bold mt-2">🆕 الوحدات الجديدة:</div>
              <div>⚕️ طبيب ميداني: علاج طارئ (+40 HP لحليف) | 🔧 مهندسين: تحصين (+60% دفاع لمدة 3 أدوار)</div>
              <div>🔭 مستكشفين: رصد (كشف مدى 6) | ⚓ مشاة بحرية: إنزال بحري (تحرك على الماء)</div>
              <div>🎆 مدفعية صاروخية: قصف صاروخي (نطاق 3) | 🎯 كوماندوز: عملية خاصة (×2 ضرر+شفاء)</div>
              <div>🚛 شاحنة إمداد: إمداد (+15 إمداد فوري)</div>
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: '#16213e' }}><h2 className="text-lg font-bold text-yellow-400 mb-1">🗺️ الخرائط</h2>
            <div className="space-y-1 mt-1">
              <div>🗺️ كلاسيكي: تضاريس متنوعة | 🏜️ عاصفة الصحراء: فرسان ودروع تتفوق</div>
              <div>⛰️ ممر جبلي: مشاة ومدفعية | 🏝️ قفز الجزر: مشاة بحرية تتفوق</div>
              <div>🌲 كمين الغابة: قوات خاصة | 🏙️ حرب المدن: دروع ومهندسين</div>
              <div>🌊 عبور النهر: سيطرة على الجسور</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function GameOverScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  const isWin = state.winner === 'player';
  const stars = isWin ? (state.playerLostNoUnits ? 5 : state.totalDamageDealt > state.totalDamageReceived * 2 ? 4 : 3) : 0;
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      <div className="text-center space-y-4 p-6 rounded-2xl max-w-md w-full" style={{ background: '#16213e', border: `2px solid ${isWin ? '#53d769' : '#e94560'}` }}>
        <div className="text-6xl">{isWin ? '🏆' : '💀'}</div>
        <h1 className="text-3xl font-bold" style={{ color: isWin ? '#53d769' : '#e94560' }}>{isWin ? '🎉 انتصار!' : '💀 هزيمة!'}</h1>
        <div className="text-2xl">{'⭐'.repeat(stars)}{'☆'.repeat(5 - stars)}</div>
        <div className="text-gray-300 text-sm space-y-1">
          <p>الدور: {state.turn} | الخريطة: {MAP_PRESET_INFO[state.mapPreset].name} | الصعوبة: {{ easy: 'جندي', normal: 'قائد', hard: 'استراتيجي', legendary: 'أستاذ' }[state.difficulty]}</p>
          <p>وحدات دُمرت: {state.playerUnitsKilled} | وحدات خُسرت: {state.aiUnitsKilled}</p>
          <p>ضرر أُلحق: {state.totalDamageDealt} | ضرر استُقبل: {state.totalDamageReceived}</p>
        </div>
        {state.achievements.length > 0 && (
          <div className="p-3 rounded-lg" style={{ background: '#0d1117' }}>
            <div className="text-yellow-400 font-bold text-sm mb-1">🏆 إنجازات جديدة</div>
            {state.achievements.map(a => { const ad = ACHIEVEMENT_DEFS[a]; return ad ? <div key={a} className="text-xs text-gray-300">{ad.icon} {ad.nameAr}: {ad.desc}</div> : null; })}
          </div>
        )}
        <button onClick={onRestart} className="py-3 px-8 rounded-lg text-lg font-bold text-white cursor-pointer w-full" style={{ background: 'linear-gradient(135deg, #e94560, #c0392b)' }}>🔄 العب مرة أخرى</button>
      </div>
    </div>
  );
}
function GameHeader({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const phaseNames: Record<GamePhase, string> = { planning: '📋 التخطيط', movement: '🚶 الحركة', attack: '⚔️ الهجوم', ai_turn: '🤖 العدو' };
  const tactic = TACTICS.find(t => t.id === state.playerTactic);
  const w = WEATHER_NAMES[state.weather];
  return (
    <div className="p-2 rounded-lg mb-2 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ background: '#16213e', borderBottom: '2px solid #0f3460' }}>
      <div className="flex items-center gap-3 text-white flex-wrap">
        <span className="text-yellow-400">📅 <strong>{state.turn}</strong></span>
        <span className="text-blue-300">{w.icon} {w.name}</span>
        <span>📦 <strong className="text-yellow-400">{state.player.supply}</strong></span>
        <span>💪 <strong className={state.player.morale > 60 ? 'text-green-400' : state.player.morale > 30 ? 'text-yellow-400' : 'text-red-400'}>{state.player.morale}%</strong></span>
        <span>🎖️ <strong className="text-blue-400">{state.player.training}</strong></span>
        <span className="text-gray-400" style={{ fontSize: '10px' }}>{MAP_PRESET_INFO[state.mapPreset].icon} {MAP_PRESET_INFO[state.mapPreset].name}</span>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <div className="text-gray-300 px-2 py-1 rounded" style={{ background: '#0f3460' }}>{phaseNames[state.phase]}</div>
        {tactic && <div className="text-yellow-400 px-2 py-1 rounded" style={{ background: '#0f3460', fontSize: '10px' }}>{tactic.name}</div>}
        <button onClick={() => dispatch({ type: 'UNDO' })} disabled={!state.previousState} className="px-2 py-1 rounded text-white hover:bg-white/10 cursor-pointer disabled:opacity-30" title="تراجع">↩️</button>
        <button onClick={() => dispatch({ type: 'SAVE_GAME', slot: 0 })} className="px-2 py-1 rounded text-white hover:bg-white/10 cursor-pointer" title="حفظ">💾</button>
        {(state.phase === 'movement' || state.phase === 'attack') && (
          <button onClick={() => dispatch({ type: state.phase === 'movement' ? 'END_MOVEMENT' : 'END_ATTACK' })} className="py-1 px-3 rounded text-xs font-bold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #e94560, #c0392b)' }}>
            {state.phase === 'movement' ? '⚔️ هجوم' : '⏭️ نهاية'}
          </button>
        )}
      </div>
    </div>
  );
}
function HexGridComp({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const svgW = COLS * HEX_SIZE * 1.5 + HEX_SIZE + 20;
  const svgH = ROWS * SQRT3 * HEX_SIZE + SQRT3 * HEX_SIZE / 2 + 20;
  const tactic = TACTICS.find(t => t.id === state.playerTactic) ?? null;
  const secondary = TACTICS.find(t => t.id === state.secondaryPlayerTactic) ?? null;
  const validMoveSet = new Set(state.validMoves.map(([c, r]) => `${c},${r}`));
  const validAttackSet = new Set(state.validAttacks.map(([c, r]) => `${c},${r}`));
  const selected = state.selectedId ? state.units.find(u => u.id === state.selectedId) : null;
  let dmgPreview: { col: number; row: number; dmg: number; counterDmg: number } | null = null;
  if (state.hoverHex && selected && validAttackSet.has(`${state.hoverHex[0]},${state.hoverHex[1]}`)) {
    const target = getUnitAt(state.units, state.hoverHex[0], state.hoverHex[1]);
    if (target) {
      const dmg = calcDamage(selected, target, tactic, secondary, state.grid, state.weather, state.player.morale, state.ai.morale, false);
      const cDmg = calcCounterDamage(selected, target, tactic, secondary, state.grid, state.weather, state.player.morale, state.ai.morale);
      dmgPreview = { col: state.hoverHex[0], row: state.hoverHex[1], dmg, counterDmg: cDmg };
    }
  }
  return (
    <div className={`relative rounded-xl overflow-auto ${state.shakeKey % 2 === 1 ? 'animate-shake' : ''}`} style={{ background: '#0d1117', border: '2px solid #1e3a5f', maxHeight: '60vh' }}>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="block" style={{ minWidth: svgW }}>
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="selGlow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {state.grid.map((col, ci) => col.map((cell, ri) => {
          const [cx, cy] = hexCenter(ci, ri);
          const terrain = TERRAIN_DEFS[cell.terrain];
          const unit = getUnitAt(state.units, ci, ri);
          const isRevealed = state.revealed[ci]?.[ri] ?? false;
          const isSelected = selected?.col === ci && selected?.row === ri;
          const isValidMove = validMoveSet.has(`${ci},${ri}`);
          const isValidAttack = validAttackSet.has(`${ci},${ri}`);
          const isHovered = state.hoverHex?.[0] === ci && state.hoverHex?.[1] === ri;
          const isDeploy = state.deployMode && ci <= 2 && !unit && cell.terrain !== 'water';
          const showEnemy = unit && unit.owner === 'ai' && !unit.isFake && isRevealed;
          const isFog = !isRevealed;
          let fill = isFog ? '#111118' : terrain.color;
          if (isValidMove) fill = '#3498db';
          if (isValidAttack) fill = '#e74c3c';
          if (isDeploy && isHovered) fill = '#2ecc71';
          const bldg = cell.building ? BUILDING_DEFS[cell.building] : null;
          return (
            <g key={`${ci}-${ri}`}>
              <path d={hexPathStr(cx, cy, HEX_SIZE - 1)} fill={fill} stroke={isSelected ? '#ffd700' : isHovered && !isFog ? '#fff' : '#2c3e50'} strokeWidth={isSelected ? 3 : isHovered ? 1.5 : 0.5} style={{ cursor: isFog ? 'default' : 'pointer' }} filter={isSelected ? 'url(#selGlow)' : isValidMove || isValidAttack ? 'url(#glow)' : undefined} onClick={() => !isFog && dispatch({ type: 'HEX_CLICK', col: ci, row: ri })} onMouseEnter={() => dispatch({ type: 'HEX_HOVER', col: ci, row: ri })} onMouseLeave={() => dispatch({ type: 'HEX_HOVER', col: -1, row: null })} opacity={isValidMove ? 0.6 : isValidAttack ? 0.6 : 1} />
              {isFog && <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fill="#333" style={{ pointerEvents: 'none' }}>?</text>}
              {!isFog && <text x={cx} y={cy + HEX_SIZE * 0.35} textAnchor="middle" fontSize="10" style={{ pointerEvents: 'none' }}>{terrain.icon}</text>}
              {!isFog && bldg && <text x={cx - 8} y={cy - HEX_SIZE * 0.25} textAnchor="middle" fontSize="10" style={{ pointerEvents: 'none' }}>{bldg.icon}</text>}
              {!isFog && bldg && cell.buildingOwner && <circle cx={cx + 8} cy={cy - HEX_SIZE * 0.3} r={3} fill={cell.buildingOwner === 'player' ? '#27ae60' : '#c0392b'} style={{ pointerEvents: 'none' }} />}
              {unit && (unit.owner === 'player' || showEnemy) && (
                <g filter={unit.owner === 'player' ? 'url(#glow)' : undefined}>
                  <circle cx={cx} cy={cy} r={HEX_SIZE * 0.32} fill={unit.owner === 'player' ? '#27ae60' : '#c0392b'} stroke={unit.isFake ? '#9b59b6' : unit.entrenched ? '#ffd700' : '#fff'} strokeWidth={unit.entrenched ? 2 : 1} opacity={unit.isFake ? 0.6 : 1} />
                  <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" style={{ pointerEvents: 'none' }}>{UNIT_DEFS[unit.type].icon}</text>
                  <rect x={cx - 10} y={cy - HEX_SIZE * 0.5} width={20} height={2.5} fill="#333" rx={1} /><rect x={cx - 10} y={cy - HEX_SIZE * 0.5} width={20 * (unit.hp / unit.maxHp)} height={2.5} fill={unit.hp / unit.maxHp > 0.5 ? '#2ecc71' : unit.hp / unit.maxHp > 0.25 ? '#f39c12' : '#e74c3c'} rx={1} />
                  {unit.level > 1 && !unit.isFake && <text x={cx + 8} y={cy - 7} textAnchor="middle" fontSize="6" fill="#ffd700" style={{ pointerEvents: 'none' }}>⭐{unit.level}</text>}
                  {unit.abilityCooldownLeft > 0 && !unit.isFake && <text x={cx - 8} y={cy - 7} textAnchor="middle" fontSize="6" fill="#e74c3c" style={{ pointerEvents: 'none' }}>⏳</text>}
                  {(unit.moved && unit.attacked) && unit.owner === 'player' && <text x={cx} y={cy + 11} textAnchor="middle" fontSize="5" fill="#aaa" style={{ pointerEvents: 'none' }}>✓</text>}
                </g>
              )}
              {dmgPreview && dmgPreview.col === ci && dmgPreview.row === ri && (
                <g><rect x={cx - 18} y={cy - HEX_SIZE - 8} width={36} height={22} fill="#e74c3c" rx={4} /><text x={cx} y={cy - HEX_SIZE + 4} textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">-{dmgPreview.dmg}</text>{dmgPreview.counterDmg > 0 && <text x={cx} y={cy - HEX_SIZE + 12} textAnchor="middle" fontSize="6" fill="#ffa">↩-{dmgPreview.counterDmg}</text>}</g>
              )}
            </g>
          );
        }))}
        {state.effects.map(fx => {
          const [cx, cy] = hexCenter(fx.col, fx.row);
          const age = (Date.now() - fx.startTime) / 1000;
          if (age > 1) return null;
          const opacity = 1 - age;
          const r = fx.type === 'explosion' ? 15 + age * 20 : 10 + age * 10;
          return <circle key={fx.id} cx={cx} cy={cy} r={r} fill="none" stroke={fx.type === 'heal' ? '#2ecc71' : '#e74c3c'} strokeWidth={3 * opacity} opacity={opacity} style={{ pointerEvents: 'none' }} />;
        })}
      </svg>
      {state.hoverHex && !!(state.revealed[state.hoverHex[0]]?.[state.hoverHex[1]]) && <HexTooltip state={state} col={state.hoverHex[0]} row={state.hoverHex[1]} />}
    </div>
  );
}
function HexTooltip({ state, col, row }: { state: GameState; col: number; row: number }) {
  const cell = state.grid[col]?.[row]; const unit = getUnitAt(state.units, col, row);
  if (!cell) return null;
  const terrain = TERRAIN_DEFS[cell.terrain]; const [cx, cy] = hexCenter(col, row);
  const bldg = cell.building ? BUILDING_DEFS[cell.building] : null;
  return (
    <div className="absolute z-50 p-2 rounded-lg text-xs text-white pointer-events-none" style={{ background: 'rgba(22,33,62,0.95)', border: '1px solid #0f3460', left: `${(cx / (COLS * HEX_SIZE * 1.5 + HEX_SIZE + 20)) * 100}%`, top: `${(cy / (ROWS * SQRT3 * HEX_SIZE + SQRT3 * HEX_SIZE / 2 + 20)) * 100}%`, transform: 'translate(-50%, -120%)' }}>
      <div className="font-bold">{terrain.icon} {terrain.nameAr} | دفاع: {terrain.defBonus > 0 ? '+' : ''}{Math.round(terrain.defBonus * 100)}%</div>
      {bldg && <div className="text-yellow-400">{bldg.icon} {bldg.nameAr}: {bldg.desc}</div>}
      {unit && (unit.owner === 'player' || state.revealed[col]?.[row]) && (
        <div className="mt-1 pt-1 border-t border-gray-600">
          <div className="font-bold" style={{ color: unit.owner === 'player' ? '#53d769' : '#e94560' }}>{UNIT_DEFS[unit.type].icon} {UNIT_DEFS[unit.type].nameAr} {unit.isFake ? '(وهمية)' : `(${unit.owner === 'player' ? 'أنت' : 'عدو'}) ⭐${unit.level}`}</div>
          <div>HP: {unit.hp}/{unit.maxHp} | ⚔️{unit.atk} 🛡️{unit.def} 🚶{unit.mov} 🎯{unit.range}</div>
          {unit.entrenched && <div className="text-yellow-400">🏗️ محصّن</div>}
          {unit.abilityActive && <div className="text-red-400">⚡ قدرة نشطة</div>}
          {UNIT_DEFS[unit.type].counters.length > 0 && <div className="text-green-400">✂️ متفوق على: {UNIT_DEFS[unit.type].counters.map(c => UNIT_DEFS[c].nameAr).join(', ')}</div>}
        </div>
      )}
    </div>
  );
}
function BattleModal({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  if (!state.showBattleModal) return null;
  const { attacker, defender, dmg, counterDmg } = state.showBattleModal;
  const aDef = UNIT_DEFS[attacker.type]; const dDef = UNIT_DEFS[defender.type];
  const counterBonus = getCounterBonus(attacker.type, defender.type);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => dispatch({ type: 'CANCEL_ATTACK' })}>
      <div className="p-5 rounded-xl max-w-sm w-full mx-4" style={{ background: '#16213e', border: '2px solid #e94560' }} onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold text-lg text-center mb-3">⚔️ مقارنة القتال</h3>
        <div className="flex items-center justify-around mb-3">
          <div className="text-center"><div className="text-3xl">{aDef.icon}</div><div className="text-green-400 text-xs font-bold">{aDef.nameAr} ⭐{attacker.level}</div><div className="text-gray-400 text-xs">⚔️ {attacker.atk} 🛡️ {attacker.def}</div></div>
          <div className="text-2xl text-red-400 font-bold">VS</div>
          <div className="text-center"><div className="text-3xl">{dDef.icon}</div><div className="text-red-400 text-xs font-bold">{dDef.nameAr} ⭐{defender.level}</div><div className="text-gray-400 text-xs">⚔️ {defender.atk} 🛡️ {defender.def}</div></div>
        </div>
        <div className="space-y-1 text-xs text-gray-300 mb-4" style={{ background: '#0d1117', padding: '8px', borderRadius: '8px' }}>
          <div className="flex justify-between"><span>الضرر المتوقع:</span><span className="text-red-400 font-bold">-{dmg}</span></div>
          {counterDmg > 0 && <div className="flex justify-between"><span>⚠️ هجوم مضاد متوقع:</span><span className="text-orange-400 font-bold">-{counterDmg}</span></div>}
          {counterBonus > 0 && <div className="text-green-400">✂️ نقطة ضعف: +{Math.round(counterBonus * 100)}% ضرر</div>}
          {attacker.abilityActive && <div className="text-yellow-400">⚡ قدرة خاصة نشطة</div>}
          {defender.hp - dmg <= 0 && <div className="text-red-400 font-bold">💀 سيتم تدمير الوحدة!</div>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => dispatch({ type: 'CANCEL_ATTACK' })} className="flex-1 py-2 rounded-lg text-white border border-gray-500 hover:bg-white/5 cursor-pointer text-sm">❌ إلغاء</button>
          <button onClick={() => dispatch({ type: 'CONFIRM_ATTACK' })} className="flex-1 py-2 rounded-lg text-white font-bold cursor-pointer text-sm" style={{ background: 'linear-gradient(135deg, #e94560, #c0392b)' }}>⚔️ هجوم!</button>
        </div>
      </div>
    </div>
  );
}
function TacticSelector({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  if (state.phase !== 'planning') return null;
  const cats: { key: TacticCategory; label: string; color: string }[] = [
    { key: 'attack', label: '🗡️ هجوم', color: '#e94560' }, { key: 'defense', label: '🛡️ دفاع', color: '#3498db' }, { key: 'special', label: '⚡ خاص', color: '#f39c12' },
  ];
  return (
    <div className="space-y-2">
      <div className="text-white font-bold text-sm">🎯 التكتيك الأساسي</div>
      {cats.map(cat => (
        <div key={cat.key} className="space-y-1">
          <div className="text-xs font-bold" style={{ color: cat.color }}>{cat.label}</div>
          <div className="grid grid-cols-2 gap-1">
            {TACTICS.filter(t => t.category === cat.key).map(t => (
              <button key={t.id} onClick={() => dispatch({ type: 'SELECT_TACTIC', id: t.id })} className={`p-1.5 rounded text-xs text-right cursor-pointer ${state.tacticId === t.id ? 'ring-2' : ''}`} style={{ background: state.tacticId === t.id ? '#0f3460' : '#1a2332', borderColor: cat.color, ringColor: cat.color }}>
                <div className="font-bold text-white" style={{ fontSize: '11px' }}>{t.name}</div>
                <div className="text-gray-400" style={{ fontSize: '9px' }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="border-t border-gray-700 pt-2 mt-2">
        <div className="text-white font-bold text-xs">🔧 التكتيك الثانوي (50% قوة)</div>
        <div className="grid grid-cols-3 gap-1 mt-1">
          {TACTICS.map(t => (
            <button key={t.id} onClick={() => dispatch({ type: 'SELECT_TACTIC', id: state.secondaryTacticId === t.id ? null : t.id, secondary: true })} className={`p-1 rounded text-center cursor-pointer ${state.secondaryTacticId === t.id ? 'ring-1 ring-yellow-400' : ''}`} style={{ background: state.secondaryTacticId === t.id ? '#0f3460' : '#1a2332', fontSize: '9px', color: state.secondaryTacticId === t.id ? '#ffd700' : '#999' }}>
              {t.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => dispatch({ type: 'SELECT_TACTIC', id: null })} className="flex-1 py-1.5 rounded text-xs text-gray-300 border border-gray-600 hover:bg-white/5 cursor-pointer">بدون</button>
        <button onClick={() => dispatch({ type: 'CONFIRM_TACTIC' })} className="flex-1 py-1.5 rounded text-xs font-bold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #e94560, #c0392b)' }}>تأكيد ▶</button>
      </div>
      <div className="border-t border-gray-700 pt-2">
        <div className="text-white font-bold text-xs mb-1">📦 نشر وحدة</div>
        <div className="grid grid-cols-4 gap-1">
          {(Object.keys(UNIT_DEFS) as UnitType[]).map(ut => {
            const d = UNIT_DEFS[ut]; const can = state.player.supply >= d.cost;
            return <button key={ut} onClick={() => can ? dispatch({ type: 'DEPLOY_UNIT', unitType: ut }) : undefined} disabled={!can} className={`p-1 rounded text-center cursor-pointer ${state.deployMode === ut ? 'ring-1 ring-green-400' : ''} ${!can ? 'opacity-40' : 'hover:bg-white/5'}`} style={{ background: '#1a2332' }}>
              <div style={{ fontSize: '12px' }}>{d.icon}</div><div className="text-gray-300" style={{ fontSize: '7px' }}>{d.nameAr}</div><div className="text-yellow-400" style={{ fontSize: '7px' }}>{d.cost}</div>
            </button>;
          })}
        </div>
        {state.deployMode && <p className="text-green-400 text-xs mt-1 text-center">🎯 انقر في منطقتك (الأعمدة 0-2)</p>}
      </div>
    </div>
  );
}
function UnitCardPanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const unit = state.selectedId ? state.units.find(u => u.id === state.selectedId) : null;
  if (!unit) return <div className="p-2 rounded-lg text-gray-500 text-xs text-center" style={{ background: '#16213e' }}>اختر وحدة</div>;
  const def = UNIT_DEFS[unit.type];
  const hpPct = unit.hp / unit.maxHp;
  const canUseAbility = unit.owner === 'player' && unit.abilityCooldownLeft <= 0 && !unit.abilityActive && def.abilityCooldown > 0 && (state.phase === 'movement' || state.phase === 'attack');
  return (
    <div className="p-3 rounded-lg space-y-2" style={{ background: '#16213e', border: `1px solid ${unit.owner === 'player' ? '#27ae60' : '#c0392b'}` }}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{def.icon}</span>
        <div>
          <div className="font-bold text-white text-sm">{def.nameAr} <span className="text-xs text-gray-400">⭐{unit.level}</span></div>
          <div className="text-xs" style={{ color: unit.owner === 'player' ? '#53d769' : '#e94560' }}>{unit.owner === 'player' ? 'أنت' : 'عدو'}</div>
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-400 mb-1">HP: {unit.hp}/{unit.maxHp}</div>
        <div className="w-full h-2 rounded-full bg-gray-700"><div className="h-2 rounded-full transition-all" style={{ width: `${hpPct * 100}%`, background: hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c' }} /></div>
      </div>
      <div className="grid grid-cols-4 gap-1 text-xs text-center">
        <div className="p-1 rounded" style={{ background: '#0d1117' }}><div className="text-gray-400">⚔️</div><div className="text-white font-bold">{unit.atk}</div></div>
        <div className="p-1 rounded" style={{ background: '#0d1117' }}><div className="text-gray-400">🛡️</div><div className="text-white font-bold">{unit.def}</div></div>
        <div className="p-1 rounded" style={{ background: '#0d1117' }}><div className="text-gray-400">🚶</div><div className="text-white font-bold">{unit.mov}</div></div>
        <div className="p-1 rounded" style={{ background: '#0d1117' }}><div className="text-gray-400">🎯</div><div className="text-white font-bold">{unit.range}</div></div>
      </div>
      <div className="text-xs space-y-1">
        <div>🎖️ الخبرة: {unit.exp}/{unit.maxExp}</div>
        {def.counters.length > 0 && <div className="text-green-400">✂️ يتفوق على: {def.counters.map(c => UNIT_DEFS[c].nameAr).join(', ')}</div>}
        {unit.entrenched && <div className="text-yellow-400">🏗️ محصّن (+{unit.type === 'engineers' ? 60 : 40}% دفاع)</div>}
        {unit.abilityActive && <div className="text-red-400">⚡ {def.abilityNameAr} نشطة ({unit.abilityActiveTurns} أدوار)</div>}
      </div>
      {canUseAbility && (
        <button onClick={() => dispatch({ type: 'USE_ABILITY', unitId: unit.id })} className="w-full py-2 rounded-lg text-xs font-bold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #f39c12, #e67e22)' }}>
          {def.abilityNameAr}: {def.abilityDesc}
        </button>
      )}
      {unit.abilityCooldownLeft > 0 && <div className="text-xs text-gray-400 text-center">⏳ إعادة تحميل: {unit.abilityCooldownLeft} أدوار</div>}
    </div>
  );
}
function GameLog({ state }: { state: GameState }) {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [state.log.length]);
  return (
    <div className="rounded-lg p-2" style={{ background: '#16213e', maxHeight: '20vh' }}>
      <div className="text-white text-xs font-bold mb-1">📜 سجل الأحداث</div>
      <div ref={logRef} className="space-y-0.5 overflow-y-auto max-h-48 text-xs">
        {state.log.slice(-30).reverse().map((entry, i) => (
          <div key={i} className="text-gray-300 leading-tight" style={{ opacity: 1 - i * 0.02 }}>
            {entry.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
// ==================== MAIN EXPORT ====================
export default function WarGame() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty>('normal');
  const effectTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    effectTimer.current = setInterval(() => { if (state.effects.length > 0) dispatch({ type: 'CLEAR_EFFECTS' }); }, 500);
    return () => { if (effectTimer.current) clearInterval(effectTimer.current); };
  }, [state.effects.length]);
  useEffect(() => {
    if (state.phase === 'ai_turn' && state.animating) {
      const timer = setTimeout(() => dispatch({ type: 'AI_TURN_COMPLETE' }), 1200);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.animating]);
  if (state.screen === 'menu') return <MainMenu onStart={(d) => { setPendingDifficulty(d); dispatch({ type: 'SET_SCREEN', screen: 'map_select' }); }} onHelp={() => dispatch({ type: 'SET_SCREEN', screen: 'how_to_play' })} onLoad={() => dispatch({ type: 'LOAD_GAME', slot: 0 })} />;
  if (state.screen === 'map_select') return <MapSelectScreen onSelect={(preset) => dispatch({ type: 'START_GAME', difficulty: pendingDifficulty, mapPreset: preset })} onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} difficulty={pendingDifficulty} />;
  if (state.screen === 'how_to_play') return <HowToPlay onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} />;
  if (state.screen === 'game_over') return <GameOverScreen state={state} onRestart={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} />;
  return (
    <div className="min-h-screen p-2 md:p-3" dir="rtl" style={{ background: '#0d1117' }}>
      <GameHeader state={state} dispatch={dispatch} />
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="flex-1">
          <HexGridComp state={state} dispatch={dispatch} />
          <div className="mt-2">
            <GameLog state={state} />
          </div>
        </div>
        <div className="w-full lg:w-64 space-y-2">
          {state.phase === 'planning' ? <TacticSelector state={state} dispatch={dispatch} /> : <UnitCardPanel state={state} dispatch={dispatch} />}
          <div className="p-2 rounded-lg text-xs" style={{ background: '#16213e' }}>
            <div className="text-white font-bold mb-1">📊 ملخص</div>
            <div className="text-gray-300 space-y-0.5">
              <div>🏆 وحداتك: {state.units.filter(u => u.owner === 'player' && !u.isFake && u.hp > 0).length}</div>
              <div>💀 أعداء: {state.units.filter(u => u.owner === 'ai' && !u.isFake && u.hp > 0).length}</div>
              <div>📦 إمداد عدو: ~{state.ai.supply}</div>
            </div>
          </div>
        </div>
      </div>
      <BattleModal state={state} dispatch={dispatch} />
    </div>
  );
}
