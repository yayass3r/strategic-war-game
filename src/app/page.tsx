'use client';
import React, { useReducer, useCallback, useMemo, useEffect, useRef, useState } from 'react';
// ==================== TYPES ====================
type TerrainType = 'plains' | 'mountain' | 'forest' | 'water' | 'desert' | 'urban' | 'swamp' | 'oasis' | 'road' | 'ruins' | 'ice' | 'beach' | 'volcanic';
type UnitType = 'infantry' | 'armor' | 'artillery' | 'special_forces' | 'cavalry' | 'missiles' | 'medics' | 'engineers' | 'scouts' | 'marines' | 'rocket_artillery' | 'commando' | 'supply_truck' | 'helicopter' | 'fighter_jet' | 'destroyer' | 'transport_ship';
type Owner = 'player' | 'ai';
type MapPreset = 'classic' | 'desert_storm' | 'mountain_pass' | 'island_hopping' | 'forest_ambush' | 'urban_warfare' | 'river_crossing';
type GameScreen = 'menu' | 'playing' | 'how_to_play' | 'game_over' | 'map_select' | 'profile' | 'campaign' | 'daily' | 'map_editor';
type AIPersonality = 'aggressive' | 'defensive' | 'balanced';
type GameMode = 'skirmish' | 'campaign' | 'daily';
type MapSize = 'small' | 'medium' | 'large';
type GamePhase = 'planning' | 'movement' | 'attack' | 'ai_turn';
type TacticCategory = 'attack' | 'defense' | 'special';
type LogType = 'info' | 'attack' | 'defense' | 'tactic' | 'movement' | 'system' | 'weather' | 'achievement';
type WeatherType = 'clear' | 'rain' | 'snow' | 'fog' | 'storm';
type Difficulty = 'easy' | 'normal' | 'hard' | 'legendary';
type BuildingType = 'factory' | 'hospital' | 'fortress' | 'tower' | 'barracks' | 'defense_tower' | 'ammo_depot' | 'bunker' | 'hq';
type StrategicPointType = 'supply_cache' | 'weapons_depot' | 'training_camp' | 'gold_mine' | 'command_post';
type VictoryType = 'annihilation' | 'hq_capture' | 'domination' | 'survival';
type StatusEffectType = 'burning' | 'frozen' | 'poisoned' | 'stunned';
type MapEditorTool = 'terrain' | 'building' | 'strategic_point' | 'erase';
interface StatusEffect { type: StatusEffectType; turnsLeft: number; source: string }
interface Ability { nameAr: string; desc: string; cooldown: number; cooldownLeft: number; active: boolean; activeTurns: number }
interface UnitDef { name: string; nameAr: string; hp: number; atk: number; def: number; mov: number; range: number; cost: number; icon: string; counters: UnitType[]; abilityNameAr: string; abilityDesc: string; abilityCooldown: number; isAir?: boolean; isNaval?: boolean }
interface TerrainDef { nameAr: string; color: string; atkBonus: number; defBonus: number; movCost: number; icon: string }
interface BuildingDef { nameAr: string; icon: string; color: string; desc: string }
interface TacticDef { id: string; name: string; desc: string; ref: string; category: TacticCategory; atkMod: number; defMod: number; movMod: number; special: string }
interface Unit { id: string; type: UnitType; owner: Owner; hp: number; maxHp: number; atk: number; def: number; mov: number; range: number; col: number; row: number; moved: boolean; attacked: boolean; level: number; isFake: boolean; fakeTurns: number; exp: number; maxExp: number; abilityCooldownLeft: number; abilityActive: boolean; abilityActiveTurns: number; entrenched: boolean; statusEffects: StatusEffect[]; carriedUnitId: string | null }
interface HexCell { col: number; row: number; terrain: TerrainType; building: BuildingType | null; buildingOwner: Owner | null; strategicPoint: StrategicPointType | null; strategicOwner: Owner | null; garrisonTurn: number; buildingLevel: number }
interface PlayerProfile { name: string; level: number; xp: number; xpToNext: number; totalWins: number; totalLosses: number; totalGames: number; totalKills: number; totalDamageDealt: number; achievements: string[]; unlockedPerks: string[]; rank: string }
interface PlayerState { supply: number; morale: number; training: number }
interface LogEntry { turn: number; msg: string; type: LogType }
interface BattleEffect { id: string; col: number; row: number; type: 'attack' | 'explosion' | 'heal' | 'death'; startTime: number }
interface DiplomacyEvent { type: string; msg: string; options: { text: string; effect: string }[] }
interface ToastNotif { id: string; msg: string; icon: string; time: number }
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
  damagePreview: { col: number; row: number; dmg: number; counterDmg: number } | null;
  previousState: GameState | null;
  weather: WeatherType; weatherTurnsLeft: number;
  effects: BattleEffect[]; shakeKey: number;
  achievements: string[]; playerUsedPincer: number; playerUsedBlitzkrieg: boolean; playerUsedGuerrilla: boolean; playerUsedSiege: boolean; artilleryKills: number; playerLostNoUnits: boolean;
  showBattleModal: { attacker: Unit; defender: Unit; dmg: number; counterDmg: number } | null;
  mapPreset: MapPreset;
  buildMode: BuildingType | null;
  validBuildPlacements: [number, number][];
  playerBuildCount: number;
  playerDeployCount: number;
  strategicPointsCaptured: number;
  showStats: boolean;
  aiPersonality: AIPersonality;
  gameMode: GameMode;
  campaignMission: number;
  mapSize: MapSize;
  upgradeMode: boolean;
  soundEnabled: boolean;
  victoryType: VictoryType;
  diplomacyEvent: DiplomacyEvent | null;
  dominationPlayerTurns: number; dominationAiTurns: number;
  showMiniMap: boolean;
  toasts: ToastNotif[];
  ceasefireActive: boolean;
  phaseTransition: string | null;
  tutorialActive: boolean; tutorialStep: number;
  customMapData: HexCell[][] | null;
}
type Action =
  | { type: 'START_GAME'; difficulty: Difficulty; mapPreset: MapPreset; aiPersonality?: AIPersonality; gameMode?: GameMode; campaignMission?: number; mapSize?: MapSize; victoryType?: VictoryType; customGrid?: HexCell[][] }
  | { type: 'UPGRADE_BUILDING'; col: number; row: number }
  | { type: 'ENTER_UPGRADE_MODE' }
  | { type: 'EXIT_UPGRADE_MODE' }
  | { type: 'TOGGLE_SOUND' }
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
  | { type: 'CLEAR_EFFECTS' }
  | { type: 'ENTER_BUILD_MODE'; buildingType: BuildingType }
  | { type: 'BUILD_BUILDING'; col: number; row: number }
  | { type: 'CANCEL_BUILD' }
  | { type: 'RETREAT_UNIT' }
  | { type: 'TOGGLE_STATS' }
  | { type: 'TOGGLE_MINIMAP' }
  | { type: 'DISMISS_DIPLOMACY'; effect: string }
  | { type: 'CLEAR_PHASE_TRANSITION' }
  | { type: 'DISMISS_TOAST'; id: string };
// ==================== CONSTANTS ====================
let COLS = 14, ROWS = 10;
const HEX_SIZE = 24;
const SQRT3 = Math.sqrt(3);
// ==================== SOUND SYSTEM ====================
const audioCtxRef = { current: null as AudioContext | null };
function getAudioCtx(): AudioContext | null { if (typeof window === 'undefined') return null; if (!audioCtxRef.current) audioCtxRef.current = new AudioContext(); return audioCtxRef.current; }
function playSound(type: 'attack' | 'move' | 'deploy' | 'build' | 'capture' | 'victory' | 'defeat' | 'levelup' | 'critical' | 'miss' | 'ability') {
  const ctx = getAudioCtx(); if (!ctx) return;
  try {
    const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); const now = ctx.currentTime;
    switch (type) {
      case 'attack': osc.type='sawtooth'; osc.frequency.setValueAtTime(200,now); osc.frequency.linearRampToValueAtTime(80,now+0.15); gain.gain.setValueAtTime(0.15,now); gain.gain.linearRampToValueAtTime(0,now+0.15); osc.start(now); osc.stop(now+0.15); break;
      case 'critical': osc.type='square'; osc.frequency.setValueAtTime(300,now); osc.frequency.linearRampToValueAtTime(600,now+0.1); gain.gain.setValueAtTime(0.2,now); gain.gain.linearRampToValueAtTime(0,now+0.2); osc.start(now); osc.stop(now+0.2); break;
      case 'miss': osc.type='sine'; osc.frequency.setValueAtTime(400,now); osc.frequency.linearRampToValueAtTime(200,now+0.1); gain.gain.setValueAtTime(0.08,now); gain.gain.linearRampToValueAtTime(0,now+0.1); osc.start(now); osc.stop(now+0.1); break;
      case 'move': osc.type='sine'; osc.frequency.setValueAtTime(300,now); osc.frequency.linearRampToValueAtTime(400,now+0.05); gain.gain.setValueAtTime(0.05,now); gain.gain.linearRampToValueAtTime(0,now+0.05); osc.start(now); osc.stop(now+0.05); break;
      case 'deploy': osc.type='triangle'; osc.frequency.setValueAtTime(400,now); osc.frequency.linearRampToValueAtTime(600,now+0.1); gain.gain.setValueAtTime(0.1,now); gain.gain.linearRampToValueAtTime(0,now+0.1); osc.start(now); osc.stop(now+0.1); break;
      case 'build': osc.type='triangle'; osc.frequency.setValueAtTime(200,now); osc.frequency.linearRampToValueAtTime(300,now+0.15); gain.gain.linearRampToValueAtTime(400,now+0.3); gain.gain.setValueAtTime(0.1,now); gain.gain.linearRampToValueAtTime(0,now+0.3); osc.start(now); osc.stop(now+0.3); break;
      case 'capture': osc.type='square'; osc.frequency.setValueAtTime(500,now); osc.frequency.linearRampToValueAtTime(700,now+0.15); gain.gain.setValueAtTime(0.12,now); gain.gain.linearRampToValueAtTime(500,now+0.3); osc.start(now); osc.stop(now+0.3); break;
      case 'levelup': osc.type='sine'; osc.frequency.setValueAtTime(400,now); osc.frequency.linearRampToValueAtTime(800,now+0.15); gain.gain.setValueAtTime(0.15,now); gain.gain.linearRampToValueAtTime(1000,now+0.3); osc.start(now); osc.stop(now+0.3); break;
      case 'ability': osc.type='sawtooth'; osc.frequency.setValueAtTime(300,now); osc.frequency.linearRampToValueAtTime(500,now+0.2); gain.gain.setValueAtTime(0.12,now); gain.gain.linearRampToValueAtTime(0,now+0.2); osc.start(now); osc.stop(now+0.2); break;
      case 'victory': osc.type='sine'; osc.frequency.setValueAtTime(400,now); osc.frequency.linearRampToValueAtTime(600,now+0.2); gain.gain.linearRampToValueAtTime(800,now+0.4); gain.gain.setValueAtTime(0.15,now); gain.gain.linearRampToValueAtTime(0,now+0.5); osc.start(now); osc.stop(now+0.5); break;
      case 'defeat': osc.type='sawtooth'; osc.frequency.setValueAtTime(300,now); osc.frequency.linearRampToValueAtTime(100,now+0.4); gain.gain.setValueAtTime(0.12,now); gain.gain.linearRampToValueAtTime(0,now+0.4); osc.start(now); osc.stop(now+0.4); break;
    }
  } catch {}
}
const AI_PERSONALITIES: Record<AIPersonality, { nameAr: string; icon: string; desc: string; atkBonus: number; defBonus: number; supplyBonus: number; deployBias: UnitType[] }> = {
  aggressive: { nameAr: 'القائد المهاجم', icon: '🔥', desc: 'يركز على الهجوم بقوة ويتجاهل الدفاع', atkBonus: 0.15, defBonus: -0.1, supplyBonus: -5, deployBias: ['armor', 'cavalry', 'commando', 'rocket_artillery', 'helicopter', 'fighter_jet'] },
  defensive: { nameAr: 'الاستراتيجي الدفاعي', icon: '🛡️', desc: 'يبني دفاعات قوية وينتظر الهجوم', atkBonus: -0.1, defBonus: 0.2, supplyBonus: 5, deployBias: ['infantry', 'engineers', 'medics', 'artillery', 'destroyer'] },
  balanced: { nameAr: 'القائد المتوازن', icon: '⚖️', desc: 'توازن بين الهجوم والدفاع', atkBonus: 0, defBonus: 0, supplyBonus: 0, deployBias: ['infantry', 'armor', 'artillery', 'helicopter'] },
};
const MAP_SIZES: Record<MapSize, { cols: number; rows: number; nameAr: string; icon: string }> = {
  small: { cols: 10, rows: 8, nameAr: 'صغيرة', icon: '📋' },
  medium: { cols: 14, rows: 10, nameAr: 'متوسطة', icon: '🗺️' },
  large: { cols: 18, rows: 12, nameAr: 'كبيرة', icon: '🌐' },
};
const BUILDING_LEVEL_BONUSES: Record<BuildingType, { l2: string; l3: string }> = {
  factory: { l2: '+8 إمداد/دور', l3: '+12 إمداد/دور +3 تدريب' },
  hospital: { l2: 'يشفي +25 HP/دور', l3: 'يشفي +35 HP/دور' },
  fortress: { l2: '+75% دفاع', l3: '+100% دفاع +10% هجوم' },
  tower: { l2: 'يكشف 7 سداسيات', l3: 'يكشف 10 سداسيات' },
  barracks: { l2: 'خصم 40%', l3: 'خصم 50% +2 وحدات/دور' },
  defense_tower: { l2: 'ضرر 25 نطاق 3', l3: 'ضرر 35 نطاق 3 يهاجم مرتين' },
  ammo_depot: { l2: '+18 إمداد +10% هجوم', l3: '+25 إمداد +15% هجوم' },
  bunker: { l2: '+60% دفاع +30% مجاور', l3: '+80% دفاع +40% مجاور' },
  hq: { l2: '+20% دفاع للجوار', l3: '+30% دفاع +5% هجوم للجوار' },
};
const VICTORY_DEFS: Record<VictoryType, { nameAr: string; icon: string; desc: string }> = {
  annihilation: { nameAr: 'إبادة', icon: '💀', desc: 'دمّر كل وحدات العدو' },
  hq_capture: { nameAr: 'اقتحام المقر', icon: '🏰', desc: 'احتل مقر قيادة العدو' },
  domination: { nameAr: 'سيطرة', icon: '🏛️', desc: 'سيطر على 75%+ النقاط الاستراتيجية لمدة 3 أدوار' },
  survival: { nameAr: 'صمود', icon: '🛡️', desc: 'صمد لمدة 20 دور' },
};
const STATUS_EFFECT_DEFS: Record<StatusEffectType, { nameAr: string; icon: string; color: string }> = {
  burning: { nameAr: 'محترق', icon: '🔥', color: '#e74c3c' },
  frozen: { nameAr: 'متجمد', icon: '🧊', color: '#3498db' },
  poisoned: { nameAr: 'مسموم', icon: '☠️', color: '#27ae60' },
  stunned: { nameAr: 'مصدوم', icon: '💫', color: '#9b59b6' },
};
interface CampaignMission { id: number; nameAr: string; desc: string; mapPreset: MapPreset; difficulty: Difficulty; aiPersonality: AIPersonality; objectives: string[]; reward: number }
const CAMPAIGN_MISSIONS: CampaignMission[] = [
  { id: 1, nameAr: 'الفصل الأول: البداية', desc: 'تعلم أساسيات القتال في معركة تدريبية', mapPreset: 'classic', difficulty: 'easy', aiPersonality: 'balanced', objectives: ['فوز بالمعركة'], reward: 30 },
  { id: 2, nameAr: 'الفصل الثاني: الصحراء', desc: 'اجتز واحتل واحة في قلب الصحراء', mapPreset: 'desert_storm', difficulty: 'easy', aiPersonality: 'aggressive', objectives: ['فوز', 'احتل مخزن إمدادات'], reward: 40 },
  { id: 3, nameAr: 'الفصل الثالث: الجبال', desc: 'اعبر الممر الجبلي واقتحم الحصن', mapPreset: 'mountain_pass', difficulty: 'normal', aiPersonality: 'defensive', objectives: ['فوز', 'لا تخسر أي وحدة'], reward: 50 },
  { id: 4, nameAr: 'الفصل الرابع: الغابة', desc: 'نج من الكمين في غابة كثيفة', mapPreset: 'forest_ambush', difficulty: 'normal', aiPersonality: 'balanced', objectives: ['فوز', 'احتل نقطتين استراتيجيتين'], reward: 60 },
  { id: 5, nameAr: 'الفصل الخامس: المدينة', desc: 'سيطر على المدينة في قتال حضري', mapPreset: 'urban_warfare', difficulty: 'hard', aiPersonality: 'aggressive', objectives: ['فوز', 'ابن مبنين'], reward: 70 },
  { id: 6, nameAr: 'الفصل الأخير: المعركة النهائية', desc: 'الهجوم الكبير على قلعة العدو الأخيرة', mapPreset: 'river_crossing', difficulty: 'legendary', aiPersonality: 'aggressive', objectives: ['فوز', 'احتل 3+ نقاط', 'لا تخسر أكثر من وحدتين'], reward: 100 },
];
function getDailyChallenge(): { seed: number; mapPreset: MapPreset; difficulty: Difficulty; aiPersonality: AIPersonality; bonusXP: number } {
  const today = new Date(); const dayNum = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const presets: MapPreset[] = ['classic', 'desert_storm', 'mountain_pass', 'island_hopping', 'forest_ambush', 'urban_warfare', 'river_crossing'];
  const difficulties: Difficulty[] = ['normal', 'hard', 'legendary'];
  const personalities: AIPersonality[] = ['aggressive', 'defensive', 'balanced'];
  let s = dayNum; s = (s * 16807) % 2147483647; const r1 = s / 2147483647; s = (s * 16807) % 2147483647; const r2 = s / 2147483647; s = (s * 16807) % 2147483647; const r3 = s / 2147483647;
  return { seed: dayNum, mapPreset: presets[Math.floor(r1 * presets.length)], difficulty: difficulties[Math.floor(r2 * difficulties.length)], aiPersonality: personalities[Math.floor(r3 * personalities.length)], bonusXP: 50 };
}
function getBuildingUpgradeCost(bType: BuildingType, currentLevel: number): number {
  const base = BUILDING_COSTS[bType] || 20;
  if (currentLevel >= 2) return Math.ceil(base * 1.0);
  return Math.ceil(base * 0.6);
}
const COUNTER_M = 0.5;
const WEATHER_NAMES: Record<WeatherType, { name: string; icon: string }> = {
  clear: { name: 'صافي', icon: '☀️' }, rain: { name: 'مطر', icon: '🌧️' }, snow: { name: 'ثلج', icon: '❄️' }, fog: { name: 'ضباب', icon: '🌫️' }, storm: { name: 'عاصفة', icon: '⛈️' },
};
const BUILDING_DEFS: Record<BuildingType, BuildingDef> = {
  factory: { nameAr: 'مصنع', icon: '🏭', color: '#f39c12', desc: '+5 إمداد/دور لمن يسيطر' },
  hospital: { nameAr: 'مستشفى', icon: '🏥', color: '#e74c3c', desc: 'يشفي الوحدات المجاورة +15 HP/دور' },
  fortress: { nameAr: 'حصن', icon: '🏰', color: '#3498db', desc: '+50% دفاع للوحدة المحتلة' },
  tower: { nameAr: 'برج مراقبة', icon: '📡', color: '#9b59b6', desc: 'يكشف 5 سداسيات حوله' },
  barracks: { nameAr: 'ثكنة تجنيد', icon: '🏗️', color: '#2ecc71', desc: 'تجنيد وحدات بتكلفة مخفضة 25% | +3 وحدة/دور إضافية' },
  defense_tower: { nameAr: 'برج دفاعي', icon: '🗼', color: '#e74c3c', desc: 'يهجم تلقائياً على الأعداء في نطاق 2 بـ 15 ضرر/دور' },
  ammo_depot: { nameAr: 'مستودع ذخيرة', icon: '📦', color: '#f39c12', desc: '+12 إمداد/دور لمن يسيطر | +5% هجوم للوحدات المجاورة' },
  bunker: { nameAr: 'ملجأ دفاعي', icon: '🛡️', color: '#95a5a6', desc: '+40% دفاع للوحدة المحتلة | +20% دفاع للوحدات المجاورة' },
  hq: { nameAr: 'مقر قيادة', icon: '🏗️', color: '#e74c3c', desc: 'احتل مقر العدو للفوز! +15% دفاع للجوار' },
};
const BUILDING_COSTS: Record<BuildingType, number> = {
  factory: 0, hospital: 0, fortress: 0, tower: 0,
  barracks: 25, defense_tower: 20, ammo_depot: 15, bunker: 18, hq: 0,
};
const BUILDABLE_TYPES: BuildingType[] = ['barracks', 'defense_tower', 'ammo_depot', 'bunker'];
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
  helicopter: { name: 'Helicopter', nameAr: 'مروحية', hp: 80, atk: 25, def: 8, mov: 6, range: 2, cost: 22, icon: '🚁', counters: ['artillery', 'rocket_artillery'], abilityNameAr: 'قصف جوي', abilityDesc: 'يهجم على كل الأعداء في نطاق 2 بـ 60% ضرر', abilityCooldown: 4, isAir: true },
  fighter_jet: { name: 'Fighter Jet', nameAr: 'طائرة مقاتلة', hp: 60, atk: 45, def: 5, mov: 8, range: 3, cost: 30, icon: '✈️', counters: ['helicopter', 'armor'], abilityNameAr: 'قنبلة', abilityDesc: '×2 ضرر لوحدة واحدة', abilityCooldown: 5, isAir: true },
  destroyer: { name: 'Destroyer', nameAr: 'مدمر', hp: 130, atk: 28, def: 20, mov: 4, range: 3, cost: 24, icon: '🚢', counters: ['marines'], abilityNameAr: 'قصف ساحلي', abilityDesc: 'يهجم على الوحدات البرية في نطاق 3', abilityCooldown: 4, isNaval: true },
  transport_ship: { name: 'Transport Ship', nameAr: 'سفينة نقل', hp: 100, atk: 0, def: 15, mov: 5, range: 0, cost: 18, icon: '🛳️', counters: [], abilityNameAr: 'إنزال', abilityDesc: 'ينشر وحدة من السفينة إلى أرض مجاورة', abilityCooldown: 3, isNaval: true },
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
  air_ace: { nameAr: 'بطل الطيران', desc: 'دمّر 5+ وحدات بطائرة مقاتلة', icon: '✈️' },
  naval_commander: { nameAr: 'قائد بحري', desc: 'دمّر 3+ وحدات بمدمر', icon: '🚢' },
  survivor: { nameAr: 'الصامد', desc: 'فز بشرط الصمود', icon: '🛡️' },
  diplomat: { nameAr: 'الدبلوماسي', desc: 'قبل عرض هدنة من العدو', icon: '🤝' },
  map_maker: { nameAr: 'صانع الخرائط', desc: 'أنشئ خريطة مخصصة', icon: '🗺️' },
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
const STRATEGIC_POINT_DEFS: Record<StrategicPointType, { nameAr: string; icon: string; color: string; desc: string; bonus: string }> = {
  supply_cache: { nameAr: 'مخزن إمدادات', icon: '📦', color: '#f1c40f', desc: '+8 إمداد/دور لمن يسيطر', bonus: 'supply' },
  weapons_depot: { nameAr: 'مخزن أسلحة', icon: '🔥', color: '#e74c3c', desc: '+15% هجوم للوحدات المجاورة', bonus: 'attack' },
  training_camp: { nameAr: 'معسكر تدريب', icon: '🎖️', color: '#3498db', desc: '+10 تدريب/دور لمن يسيطر', bonus: 'training' },
  gold_mine: { nameAr: 'منجم ذهب', icon: '💰', color: '#f39c12', desc: '+15 إمداد + 5 تدريب/دور', bonus: 'gold' },
  command_post: { nameAr: 'نقطة قيادة', icon: '⚜️', color: '#9b59b6', desc: '+5% هجوم + 10% دفاع + 3 إمداد/دور', bonus: 'command' },
};
const PERK_DEFS: Record<string, { nameAr: string; desc: string; icon: string; level: number }> = {
  extra_supply: { nameAr: 'إمدادات إضافية', desc: '+5 إمداد إضافي في بداية كل دور', icon: '📦', level: 3 },
  rapid_build: { nameAr: 'بناء سريع', desc: 'يمكنك بناء مبنين بدل واحد كل دور', icon: '🏗️', level: 5 },
  veteran_start: { nameAr: 'قوات محاربة', desc: 'جميع الوحدات تبدأ بمستوى 2', icon: '⭐', level: 7 },
  supply_master: { nameAr: 'سيد الإمداد', desc: '+50% إمداد من جميع المصادر', icon: '💰', level: 10 },
  warlord: { nameAr: 'أمر الحرب', desc: '+10% هجوم ودفاع لجميع الوحدات', icon: '👑', level: 15 },
};
function getDefaultProfile(): PlayerProfile {
  return { name: 'قائد', level: 1, xp: 0, xpToNext: 100, totalWins: 0, totalLosses: 0, totalGames: 0, totalKills: 0, totalDamageDealt: 0, achievements: [], unlockedPerks: [], rank: 'جندي' };
}
function loadProfile(): PlayerProfile {
  try { if (typeof window !== 'undefined') { const d = localStorage.getItem('warGame_profile'); return d ? JSON.parse(d) : getDefaultProfile(); } } catch {} return getDefaultProfile();
}
function saveProfile(p: PlayerProfile) { try { if (typeof window !== 'undefined') localStorage.setItem('warGame_profile', JSON.stringify(p)); } catch {} }
function addXP(profile: PlayerProfile, amount: number): PlayerProfile {
  let p = { ...profile, xp: p.xp + amount };
  while (p.xp >= p.xpToNext) {
    p.xp -= p.xpToNext; p.level++; p.xpToNext = Math.floor(p.xpToNext * 1.4);
    if (p.level === 3 && !p.unlockedPerks.includes('extra_supply')) p.unlockedPerks = [...p.unlockedPerks, 'extra_supply'];
    if (p.level === 5 && !p.unlockedPerks.includes('rapid_build')) p.unlockedPerks = [...p.unlockedPerks, 'rapid_build'];
    if (p.level === 7 && !p.unlockedPerks.includes('veteran_start')) p.unlockedPerks = [...p.unlockedPerks, 'veteran_start'];
    if (p.level === 10 && !p.unlockedPerks.includes('supply_master')) p.unlockedPerks = [...p.unlockedPerks, 'supply_master'];
    if (p.level === 15 && !p.unlockedPerks.includes('warlord')) p.unlockedPerks = [...p.unlockedPerks, 'warlord'];
  }
  if (p.level >= 20) p.rank = 'أستاذ الحرب'; else if (p.level >= 15) p.rank = 'قائد أعلى'; else if (p.level >= 10) p.rank = 'قائد'; else if (p.level >= 7) p.rank = 'ضابط'; else if (p.level >= 5) p.rank = 'رقيب'; else if (p.level >= 3) p.rank = 'جندي أول'; else p.rank = 'جندي';
  return p;
}
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
function isAirUnit(type: UnitType): boolean { return UNIT_DEFS[type].isAir === true; }
function isNavalUnit(type: UnitType): boolean { return UNIT_DEFS[type].isNaval === true; }
function calcValidMoves(unit: Unit, grid: HexCell[][], units: Unit[], tactic: TacticDef | null, secondary: TacticDef | null): [number, number][] {
  if (unit.mov === 0) return [];
  // Frozen units cannot move
  if (unit.statusEffects.some(e => e.type === 'frozen' || e.type === 'stunned')) return [];
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
      // Air units ignore terrain cost
      if (isAirUnit(unit.type)) { movCost = 1; }
      // Naval units: only water and beach
      else if (isNavalUnit(unit.type)) {
        if (terrain !== 'water' && terrain !== 'beach') continue;
        movCost = 1;
      }
      // Marines with ability active can move on water
      else if (unit.type === 'marines' && unit.abilityActive && terrain === 'water') movCost = 1;
      if (unit.type !== 'cavalry' && !isAirUnit(unit.type) && isAdjacentToEnemy(units, nc, nr, unit.owner)) movCost += 2;
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
  // Frozen/stunned units cannot attack
  if (unit.statusEffects.some(e => e.type === 'frozen' || e.type === 'stunned')) return [];
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
function getStatusEffectAtkMod(unit: Unit): number {
  if (unit.statusEffects.some(e => e.type === 'burning')) return -0.15;
  return 0;
}
function getStatusEffectDefMod(unit: Unit): number { return 0; }
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
  if (attacker.abilityActive && !isCounter && attacker.type === 'fighter_jet') atkStat *= 2;
  atkStat *= (1 + getWeatherAtkMod(weather));
  // Fighter jet -30% defense on ground penalty (attacker penalty, so negative)
  if (isAirUnit(attacker.type)) atkStat *= 1.1; // air units get slight attack bonus
  let defStat = defender.def * (1 + (tactic?.defMod ?? 0) + (secondary ? (secondary.defMod ?? 0) * 0.5 : 0));
  defStat *= (1 + TERRAIN_DEFS[dTerrain].defBonus);
  defStat *= getMoraleMult(defenderMorale);
  defStat *= (1 + defender.level * 0.05);
  if (defender.entrenched) defStat *= 1.4;
  // Fighter jet on ground: -30% defense
  if (defender.type === 'fighter_jet') defStat *= 0.7;
  const cell = grid[defender.col]?.[defender.row];
  if (cell?.building === 'fortress' && cell.buildingOwner === defender.owner) {
    const fLv = cell.buildingLevel || 1;
    defStat *= fLv >= 3 ? 2.0 : fLv >= 2 ? 1.75 : 1.5;
    if (fLv >= 3) atkStat *= 1.1;
  }
  if (cell?.building === 'hq' && cell.buildingOwner === defender.owner) {
    const hLv = cell.buildingLevel || 1;
    defStat *= hLv >= 3 ? 1.3 : hLv >= 2 ? 1.2 : 1.15;
  }
  const dCell = grid[defender.col]?.[defender.row];
  if (dCell?.building === 'bunker' && dCell.buildingOwner === defender.owner) {
    const bLv = dCell.buildingLevel || 1;
    defStat *= bLv >= 3 ? 1.8 : bLv >= 2 ? 1.6 : 1.4;
  }
  for (const [nc, nr] of getNeighbors(defender.col, defender.row)) {
    const n = grid[nc]?.[nr];
    if (n?.building === 'bunker' && n.buildingOwner === defender.owner) { const nbLv = n.buildingLevel || 1; defStat *= nbLv >= 3 ? 1.4 : nbLv >= 2 ? 1.3 : 1.2; break; }
  }
  for (const [nc, nr] of getNeighbors(attacker.col, attacker.row)) {
    const n = grid[nc]?.[nr];
    if (n?.building === 'ammo_depot' && n.buildingOwner === attacker.owner) { const aLv = n.buildingLevel || 1; atkStat *= aLv >= 3 ? 1.15 : aLv >= 2 ? 1.10 : 1.05; break; }
    if (n?.strategicPoint === 'weapons_depot' && n.strategicOwner === attacker.owner) { atkStat *= 1.15; break; }
    if (n?.strategicPoint === 'command_post' && n.strategicOwner === attacker.owner) { atkStat *= 1.05; break; }
  }
  for (const [nc, nr] of getNeighbors(defender.col, defender.row)) {
    const n = grid[nc]?.[nr];
    if (n?.strategicPoint === 'command_post' && n.strategicOwner === defender.owner) { defStat *= 1.10; break; }
  }
  // Status effects
  atkStat *= (1 + getStatusEffectAtkMod(attacker));
  defStat *= (1 + getStatusEffectDefMod(defender));
  const profile = loadProfile();
  if (profile.unlockedPerks.includes('warlord')) { if (attacker.owner === 'player') atkStat *= 1.1; if (defender.owner === 'player') defStat *= 1.1; }
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
  for (let c = 0; c < COLS; c++) { grid[c] = []; for (let r = 0; r < ROWS; r++) { grid[c][r] = { col: c, row: r, terrain: 'plains', building: null, buildingOwner: null, strategicPoint: null, strategicOwner: null, garrisonTurn: 0, buildingLevel: 1 }; } }
  return grid;
}
function generateStrategicPoints(grid: HexCell[][]): HexCell[][] {
  const newGrid = grid.map(col => col.map(cell => ({ ...cell })));
  const types: StrategicPointType[] = ['supply_cache', 'weapons_depot', 'training_camp', 'gold_mine', 'command_post'];
  const count = 4 + Math.floor(Math.random() * 3); const placed: [number, number][] = [];
  for (let i = 0; i < count; i++) { for (let attempt = 0; attempt < 100; attempt++) {
    const c = 3 + Math.floor(Math.random() * 8); const r = Math.floor(Math.random() * ROWS);
    const terrain = newGrid[c][r].terrain;
    if (terrain === 'water' || terrain === 'mountain') continue;
    if (newGrid[c][r].building || newGrid[c][r].strategicPoint) continue;
    if (placed.some(([pc, pr]) => hexDist(c, r, pc, pr) < 3)) continue;
    newGrid[c][r].strategicPoint = types[i % types.length]; newGrid[c][r].strategicOwner = null;
    newGrid[c][r].garrisonTurn = 0; placed.push([c, r]); break;
  }}
  return newGrid;
}
function scatterTerrain(grid: HexCell[][], rand: () => number, terrain: TerrainType, count: number, allowOn: TerrainType[] = ['plains'], clusterChance = 0.5) {
  for (let i = 0; i < count; i++) {
    const c = Math.floor(rand() * COLS); const r = Math.floor(rand() * ROWS);
    if (!allowOn.includes(grid[c][r].terrain)) continue;
    grid[c][r].terrain = terrain;
    if (rand() > (1 - clusterChance)) { const ns = getNeighbors(c, r); const [nc, nr] = ns[Math.floor(rand() * ns.length)]; if (allowOn.includes(grid[nc]?.[nr]?.terrain)) grid[nc][nr].terrain = terrain; }
  }
}
function placeBuildings(grid: HexCell[][], rand: () => number, types: BuildingType[], forbidden: TerrainType[] = ['water', 'mountain']) {
  for (const bt of types) { for (let attempt = 0; attempt < 50; attempt++) {
    const c = 3 + Math.floor(rand() * (COLS - 6)); const r = Math.floor(rand() * ROWS);
    if (forbidden.includes(grid[c][r].terrain) || grid[c][r].building) continue;
    grid[c][r].building = bt; grid[c][r].buildingLevel = 1; break;
  }}
}
function drawRiver(grid: HexCell[][], rand: () => number, startCol: number) {
  let rc = startCol;
  for (let r = 0; r < ROWS; r++) {
    grid[rc][r].terrain = 'water';
    if (rand() > 0.6 && rc + 1 < COLS) grid[rc + 1][r].terrain = 'water';
    rc += rand() > 0.6 ? (rand() > 0.5 ? 1 : -1) : 0; rc = Math.max(2, Math.min(COLS - 2, rc));
  }
}
function generateMapForPreset(preset: MapPreset): HexCell[][] {
  const rand = createRNG(); const grid = makeGrid();
  switch (preset) {
    case 'desert_storm': {
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) grid[c][r].terrain = 'desert';
      scatterTerrain(grid, rand, 'oasis', 6, ['desert'], 0.7); scatterTerrain(grid, rand, 'ruins', 5, ['desert'], 0.3);
      scatterTerrain(grid, rand, 'mountain', 4, ['desert'], 0.2); scatterTerrain(grid, rand, 'road', 8, ['desert', 'oasis'], 0.4);
      scatterTerrain(grid, rand, 'plains', 4, ['desert'], 0.3); placeBuildings(grid, rand, ['factory', 'hospital', 'fortress']); break;
    }
    case 'mountain_pass': {
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) grid[c][r].terrain = 'mountain';
      for (let r = 2; r <= 4; r++) { grid[3][r].terrain = 'plains'; grid[4][r].terrain = 'plains'; grid[5][r].terrain = 'forest'; }
      for (let r = 5; r <= 7; r++) { grid[8][r].terrain = 'plains'; grid[9][r].terrain = 'forest'; grid[10][r].terrain = 'plains'; }
      for (let r = 1; r <= 3; r++) { grid[10][r].terrain = 'plains'; grid[11][r].terrain = 'road'; }
      scatterTerrain(grid, rand, 'forest', 8, ['mountain'], 0.6); scatterTerrain(grid, rand, 'road', 4, ['plains'], 0.5);
      placeBuildings(grid, rand, ['fortress', 'hospital', 'tower'], ['water', 'mountain']); grid[5][3].building = 'fortress'; break;
    }
    case 'island_hopping': {
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) grid[c][r].terrain = 'water';
      const islandCenters: [number, number][] = [[1,2],[1,6],[3,4],[5,1],[5,8],[7,4],[9,2],[9,7],[11,4],[12,1],[12,8]];
      for (const [ic, ir] of islandCenters) {
        if (ic < COLS && ir < ROWS) { grid[ic][ir].terrain = 'plains'; for (const [nc, nr] of getNeighbors(ic, ir)) { if (nc < COLS && nr < ROWS && rand() > 0.4) grid[nc][nr].terrain = 'plains'; } }
      }
      scatterTerrain(grid, rand, 'beach', 8, ['plains'], 0.6); scatterTerrain(grid, rand, 'forest', 5, ['plains'], 0.3);
      scatterTerrain(grid, rand, 'swamp', 3, ['plains'], 0.2); placeBuildings(grid, rand, ['factory', 'hospital', 'fortress', 'tower'], ['water']); break;
    }
    case 'forest_ambush': {
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) grid[c][r].terrain = 'forest';
      scatterTerrain(grid, rand, 'plains', 8, ['forest'], 0.7); scatterTerrain(grid, rand, 'swamp', 6, ['forest'], 0.5);
      scatterTerrain(grid, rand, 'road', 4, ['plains', 'forest'], 0.3); scatterTerrain(grid, rand, 'mountain', 3, ['forest'], 0.2);
      scatterTerrain(grid, rand, 'ruins', 3, ['forest', 'plains'], 0.3); placeBuildings(grid, rand, ['hospital', 'tower', 'fortress']); break;
    }
    case 'urban_warfare': {
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) grid[c][r].terrain = 'urban';
      scatterTerrain(grid, rand, 'road', 12, ['urban'], 0.7); scatterTerrain(grid, rand, 'plains', 4, ['urban'], 0.3);
      scatterTerrain(grid, rand, 'forest', 4, ['urban', 'plains'], 0.3); scatterTerrain(grid, rand, 'ruins', 4, ['urban'], 0.3);
      scatterTerrain(grid, rand, 'swamp', 2, ['urban'], 0.1); placeBuildings(grid, rand, ['factory', 'hospital', 'fortress', 'tower'], ['water']); break;
    }
    case 'river_crossing': {
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) grid[c][r].terrain = 'plains';
      drawRiver(grid, rand, 6);
      for (let r = 2; r < ROWS; r += 3) { grid[6][r].terrain = 'road'; if (r + 1 < ROWS) grid[6][r + 1].terrain = 'road'; }
      scatterTerrain(grid, rand, 'urban', 6, ['plains'], 0.4); scatterTerrain(grid, rand, 'forest', 5, ['plains'], 0.4);
      scatterTerrain(grid, rand, 'mountain', 3, ['plains'], 0.3); placeBuildings(grid, rand, ['fortress', 'factory', 'hospital', 'tower']);
      grid[6][2].building = 'fortress'; break;
    }
    default: {
      drawRiver(grid, rand, 6 + Math.floor(rand() * 2));
      scatterTerrain(grid, rand, 'mountain', 12, ['plains'], 0.5); scatterTerrain(grid, rand, 'forest', 14, ['plains'], 0.4);
      scatterTerrain(grid, rand, 'desert', 8, ['plains'], 0.3); scatterTerrain(grid, rand, 'urban', 3, ['plains'], 0.2);
      scatterTerrain(grid, rand, 'road', 4, ['plains'], 0.3); placeBuildings(grid, rand, ['factory', 'hospital', 'fortress', 'tower']); break;
    }
  }
  return generateStrategicPoints(grid);
}
// ==================== UNIT CREATION ====================
function initRevealed(): boolean[][] { return Array.from({ length: COLS }, () => Array(ROWS).fill(false)); }
function revealAround(grid: HexCell[][], revealed: boolean[][], col: number, row: number, range: number) {
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { if (hexDist(col, row, c, r) <= range) revealed[c][r] = true; }
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { if (grid[c][r].building === 'tower' && revealed[c][r]) { const tLv = grid[c][r].buildingLevel || 1; revealAround(grid, revealed, c, r, tLv >= 3 ? 10 : tLv >= 2 ? 7 : 5); } }
}
function createUnit(id: number, type: UnitType, owner: Owner, col: number, row: number): Unit {
  const d = UNIT_DEFS[type];
  return { id: `u${id}`, type, owner, hp: d.hp, maxHp: d.hp, atk: d.atk, def: d.def, mov: d.mov, range: d.range, col, row, moved: false, attacked: false, level: 1, isFake: false, fakeTurns: 0, exp: 0, maxExp: 20, abilityCooldownLeft: 0, abilityActive: false, abilityActiveTurns: 0, entrenched: false, statusEffects: [], carriedUnitId: null };
}
function findSafeSpawn(grid: HexCell[][], units: Unit[], colRange: [number, number], owner: Owner, forType?: UnitType): [number, number][] {
  const positions: [number, number][] = [];
  for (let c = colRange[0]; c <= colRange[1]; c++) { for (let r = 0; r < ROWS; r++) {
    const t = grid[c][r].terrain;
    if (forType && isAirUnit(forType)) { /* air can spawn anywhere non-water */ if (t !== 'water' || getUnitAt(units, c, r)) continue; positions.push([c, r]); continue; }
    if (forType && isNavalUnit(forType)) { if (t !== 'water' && t !== 'beach') continue; if (getUnitAt(units, c, r)) continue; positions.push([c, r]); continue; }
    if (t === 'water' || t === 'mountain' || getUnitAt(units, c, r)) continue;
    positions.push([c, r]);
  }}
  return positions;
}
function createUnitsForMap(preset: MapPreset): Unit[] {
  let id = 0;
  const p = (t: UnitType, c: number, r: number) => createUnit(id++, t, 'player', c, r);
  const a = (t: UnitType, c: number, r: number) => createUnit(id++, t, 'ai', c, r);
  switch (preset) {
    case 'desert_storm': return [p('cavalry',0,1),p('cavalry',0,4),p('armor',0,7),p('armor',1,2),p('scouts',0,5),p('missiles',1,8),a('cavalry',13,2),a('cavalry',13,5),a('armor',13,8),a('armor',12,3),a('scouts',13,6),a('missiles',12,0)];
    case 'mountain_pass': return [p('infantry',0,1),p('infantry',0,4),p('artillery',0,7),p('engineers',1,2),p('infantry',0,5),p('artillery',1,8),a('infantry',13,2),a('infantry',13,5),a('artillery',13,8),a('engineers',12,3),a('infantry',13,6),a('artillery',12,0)];
    case 'island_hopping': return [p('marines',0,1),p('marines',0,4),p('scouts',0,7),p('marines',1,2),p('scouts',0,5),p('armor',1,8),a('marines',13,2),a('marines',13,5),a('scouts',13,8),a('marines',12,3),a('scouts',13,6),a('armor',12,0)];
    case 'forest_ambush': return [p('special_forces',0,1),p('cavalry',0,4),p('scouts',0,7),p('special_forces',1,2),p('cavalry',0,5),p('scouts',1,8),a('special_forces',13,2),a('cavalry',13,5),a('scouts',13,8),a('special_forces',12,3),a('cavalry',13,6),a('scouts',12,0)];
    case 'urban_warfare': return [p('armor',0,1),p('infantry',0,4),p('medics',0,7),p('infantry',1,2),p('engineers',0,5),p('armor',1,8),a('armor',13,2),a('infantry',13,5),a('medics',13,8),a('infantry',12,3),a('engineers',13,6),a('armor',12,0)];
    case 'river_crossing': return [p('infantry',0,1),p('armor',0,4),p('engineers',0,7),p('infantry',1,2),p('artillery',0,5),p('armor',1,8),a('infantry',13,2),a('armor',13,5),a('engineers',13,8),a('infantry',12,3),a('artillery',13,6),a('armor',12,0)];
    default: return [p('infantry',0,1),p('infantry',0,4),p('infantry',0,7),p('armor',1,2),p('artillery',0,5),p('special_forces',1,8),a('infantry',13,2),a('infantry',13,5),a('infantry',13,8),a('armor',12,3),a('artillery',13,6),a('special_forces',12,0)];
  }
}
function createUnitsForCustomMap(grid: HexCell[][]): Unit[] {
  let id = 0;
  const units: Unit[] = [];
  const playerSpawn = findSafeSpawn(grid, [], [0, 2], 'player');
  const aiSpawn = findSafeSpawn(grid, [], [COLS - 3, COLS - 1], 'ai');
  const types: UnitType[] = ['infantry', 'infantry', 'armor', 'artillery', 'scouts', 'medics'];
  for (let i = 0; i < Math.min(6, playerSpawn.length); i++) {
    units.push(createUnit(id++, types[i], 'player', playerSpawn[i][0], playerSpawn[i][1]));
  }
  for (let i = 0; i < Math.min(6, aiSpawn.length); i++) {
    units.push(createUnit(id++, types[i], 'ai', aiSpawn[i][0], aiSpawn[i][1]));
  }
  return units;
}
function getWeather(): WeatherType { const r = Math.random(); return r < 0.4 ? 'clear' : r < 0.6 ? 'rain' : r < 0.75 ? 'snow' : r < 0.9 ? 'fog' : 'storm'; }
function processStatusEffects(units: Unit[], log: LogEntry[], turn: number): { units: Unit[]; log: LogEntry[] } {
  let newUnits = units.map(u => ({ ...u, statusEffects: [...u.statusEffects] }));
  const newLog = [...log];
  for (const unit of newUnits) {
    if (unit.hp <= 0 || unit.isFake) continue;
    const newEffects: StatusEffect[] = [];
    for (const effect of unit.statusEffects) {
      // Entrenched units resist frozen
      if (effect.type === 'frozen' && unit.entrenched) { newLog.push({ turn, msg: `🧊 ${UNIT_DEFS[unit.type].nameAr} مقاوم التجمد (محصّن)!`, type: 'system' }); continue; }
      switch (effect.type) {
        case 'burning': unit.hp = Math.max(0, unit.hp - 8); newLog.push({ turn, msg: `🔥 ${UNIT_DEFS[unit.type].nameAr} يحترق! -8 HP`, type: 'system' }); break;
        case 'poisoned': unit.hp = Math.max(0, unit.hp - 5); newLog.push({ turn, msg: `☠️ ${UNIT_DEFS[unit.type].nameAr} مسموم! -5 HP`, type: 'system' }); break;
        case 'frozen': newLog.push({ turn, msg: `🧊 ${UNIT_DEFS[unit.type].nameAr} متجمد! لا يستطيع التحرك`, type: 'system' }); break;
        case 'stunned': newLog.push({ turn, msg: `💫 ${UNIT_DEFS[unit.type].nameAr} مصدوم! يتخطى دوره`, type: 'system' }); break;
      }
      const remaining = effect.turnsLeft - 1;
      if (remaining > 0) newEffects.push({ ...effect, turnsLeft: remaining });
    }
    unit.statusEffects = newEffects;
  }
  return { units: newUnits.filter(u => u.hp > 0 || u.isFake), log: newLog };
}
function applyTerrainStatusEffects(state: GameState, units: Unit[]): Unit[] {
  return units.map(u => {
    if (u.hp <= 0 || u.isFake) return u;
    const terrain = getTerrainAt(state.grid, u.col, u.row);
    const newEffects = [...u.statusEffects];
    if (terrain === 'volcanic' && Math.random() < 0.15 && !newEffects.some(e => e.type === 'burning')) {
      newEffects.push({ type: 'burning', turnsLeft: 2, source: 'terrain' });
    }
    if (terrain === 'ice' && Math.random() < 0.20 && !newEffects.some(e => e.type === 'frozen')) {
      newEffects.push({ type: 'frozen', turnsLeft: 1, source: 'terrain' });
    }
    if (terrain === 'swamp' && Math.random() < 0.25 && !newEffects.some(e => e.type === 'poisoned')) {
      newEffects.push({ type: 'poisoned', turnsLeft: 3, source: 'terrain' });
    }
    return { ...u, statusEffects: newEffects };
  });
}
function checkVictoryCondition(state: GameState, units: Unit[]): Owner | null {
  const aiAlive = units.filter(u => u.owner === 'ai' && !u.isFake && u.hp > 0).length;
  const playerAlive = units.filter(u => u.owner === 'player' && !u.isFake && u.hp > 0).length;
  if (aiAlive === 0 && state.victoryType !== 'survival') return 'player';
  if (playerAlive === 0) return 'ai';
  if (state.victoryType === 'hq_capture') {
    const playerHQ = state.grid.flat().some(c => c.building === 'hq' && c.buildingOwner === 'ai' && c.strategicOwner === 'player');
    if (playerHQ) return 'player';
    const aiHQ = state.grid.flat().some(c => c.building === 'hq' && c.buildingOwner === 'player' && c.strategicOwner === 'ai');
    if (aiHQ) return 'ai';
  }
  if (state.victoryType === 'survival' && state.turn >= 20 && playerAlive > 0) return 'player';
  return null;
}
function generateDiplomacyEvent(state: GameState): DiplomacyEvent | null {
  if (state.turn < 5 || state.ceasefireActive) return null;
  if (Math.random() > 0.10) return null;
  const aiAlive = state.units.filter(u => u.owner === 'ai' && !u.isFake && u.hp > 0).length;
  const playerAlive = state.units.filter(u => u.owner === 'player' && !u.isFake && u.hp > 0).length;
  const events: (() => DiplomacyEvent | null)[] = [
    () => ({ type: 'ceasefire', msg: '🏳️ العدو يعرض هدنة لدورين! لا يمكن لأي طرف الهجوم.', options: [{ text: '✅ قبول', effect: 'ceasefire_accept' }, { text: '❌ رفض', effect: 'ceasefire_reject' }] }),
    () => ({ type: 'intel', msg: '🔍 أحد جواسيسنا تسرب معلومات عن مواقع العدو!', options: [{ text: '📋 شكراً', effect: 'intel_accept' }] }),
    () => (playerAlive >= 8 && aiAlive <= 3) ? { type: 'surrender', msg: '🏳️ العدو يستسلم! اقبل استسلامه للفوز بمرتبة أقل.', options: [{ text: '✅ قبول', effect: 'surrender_accept' }, { text: '❌ رفض - للنهاية!', effect: 'surrender_reject' }] } as DiplomacyEvent : null,
    () => ({ type: 'sabotage', msg: '💣 تخريب! أحد مبانيك تعرض لعملية تخريب!', options: [{ text: '😢 حسناً', effect: 'sabotage_accept' }] }),
    () => ({ type: 'reinforcement', msg: '📢 العدو يرسل قوات إمداد ضعيفة!', options: [{ text: '⚔️ لنقضي عليهم!', effect: 'reinforcement_accept' }] }),
  ];
  const event = events[Math.floor(Math.random() * events.length)]();
  return event;
}
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
  buildMode: null, validBuildPlacements: [], playerBuildCount: 0, playerDeployCount: 0,
  strategicPointsCaptured: 0, showStats: false,
  aiPersonality: 'balanced' as AIPersonality, gameMode: 'skirmish' as GameMode,
  campaignMission: 0, mapSize: 'medium' as MapSize, upgradeMode: false, soundEnabled: true,
  victoryType: 'annihilation', diplomacyEvent: null, dominationPlayerTurns: 0, dominationAiTurns: 0,
  showMiniMap: false, toasts: [], ceasefireActive: false, phaseTransition: null,
  tutorialActive: false, tutorialStep: 0, customMapData: null,
};
function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const mapSize = action.mapSize || 'medium'; const sz = MAP_SIZES[mapSize]; COLS = sz.cols; ROWS = sz.rows;
      let grid: HexCell[][]; let units: Unit[];
      if (action.customGrid) { grid = action.customGrid; units = createUnitsForCustomMap(grid); }
      else { grid = generateMapForPreset(action.mapPreset); units = createUnitsForMap(action.mapPreset); }
      const aiPersonality = action.aiPersonality || 'balanced';
      const gameMode = action.gameMode || 'skirmish';
      const victoryType = action.victoryType || 'annihilation';
      const revealed = initRevealed();
      let profile = loadProfile();
      if (profile.unlockedPerks.includes('veteran_start')) { units = units.map(u => u.owner === 'player' ? { ...u, level: 2, atk: u.atk + 2, def: u.def + 1 } : u); }
      const extraSupply = profile.unlockedPerks.includes('extra_supply') ? 5 : 0;
      units.filter(u => u.owner === 'player').forEach(u => revealAround(grid, revealed, u.col, u.row, u.type === 'cavalry' || u.type === 'scouts' ? 3 : u.type === 'artillery' || u.type === 'rocket_artillery' ? 1 : 2));
      const startLog: LogEntry[] = [{ turn: 1, msg: '⚔️ بدأت المعركة! اختر تكتيكك الأساسي والثانوي', type: 'system' }];
      if (extraSupply > 0) startLog.push({ turn: 1, msg: '📦 إمدادات إضافية: +5 إمداد (مكافأة ارتقاء)', type: 'system' });
      if (victoryType !== 'annihilation') startLog.push({ turn: 1, msg: `🏆 شرط الفوز: ${VICTORY_DEFS[victoryType].icon} ${VICTORY_DEFS[victoryType].nameAr}`, type: 'system' });
      // Place HQ for hq_capture mode
      if (victoryType === 'hq_capture') {
        const pHQ = grid.flat().findIndex(c => c.col < 4 && c.terrain !== 'water' && c.terrain !== 'mountain' && !c.building);
        if (pHQ >= 0) { const pc = Math.floor(pHQ / ROWS); const pr = pHQ % ROWS; grid[pc][pr] = { ...grid[pc][pr], building: 'hq', buildingOwner: 'player' as Owner, buildingLevel: 1 }; }
        const aHQ = grid.flat().findIndex(c => c.col >= COLS - 4 && c.terrain !== 'water' && c.terrain !== 'mountain' && !c.building);
        if (aHQ >= 0) { const ac = Math.floor(aHQ / ROWS); const ar = aHQ % ROWS; grid[ac][ar] = { ...grid[ac][ar], building: 'hq', buildingOwner: 'ai' as Owner, buildingLevel: 1 }; }
      }
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        if (grid[c][r].strategicPoint) { const sp = STRATEGIC_POINT_DEFS[grid[c][r].strategicPoint]; startLog.push({ turn: 1, msg: `🏛️ ${sp.icon} ${sp.nameAr} ظهرت على الخريطة!`, type: 'system' }); }
      }
      return { ...initialState, screen: 'playing', phase: 'planning', turn: 1, difficulty: action.difficulty, mapPreset: action.mapPreset, grid, units, revealed, weather: getWeather(), weatherTurnsLeft: 3, player: { supply: 20 + extraSupply, morale: 100, training: 0 }, log: startLog, aiPersonality, gameMode, campaignMission: action.campaignMission || 0, mapSize: mapSize as MapSize, soundEnabled: state.soundEnabled, victoryType, customMapData: action.customGrid || null };
    }
    case 'SET_SCREEN': return { ...state, screen: action.screen };
    case 'SELECT_TACTIC': return action.secondary ? { ...state, secondaryTacticId: action.id } : { ...state, tacticId: action.id };
    case 'CONFIRM_TACTIC': {
      const tactic = TACTICS.find(t => t.id === state.tacticId);
      const secondary = TACTICS.find(t => t.id === state.secondaryTacticId);
      const newLog = [...state.log]; let newUnits = [...state.units];
      let tacticsUsed = [...state.tacticsUsed]; let playerUsedPincer = state.playerUsedPincer;
      let playerUsedBlitzkrieg = state.playerUsedBlitzkrieg; let playerUsedGuerrilla = state.playerUsedGuerrilla; let playerUsedSiege = state.playerUsedSiege;
      if (tactic) { newLog.push({ turn: state.turn, msg: `🎯 التكتيك: ${tactic.name}`, type: 'tactic' }); if (!tacticsUsed.includes(tactic.id)) tacticsUsed.push(tactic.id); if (tactic.id === 'pincer') playerUsedPincer++; if (tactic.id === 'blitzkrieg') playerUsedBlitzkrieg = true; if (tactic.id === 'guerrilla') playerUsedGuerrilla = true; if (tactic.id === 'siege') playerUsedSiege = true; }
      if (secondary) newLog.push({ turn: state.turn, msg: `🔧 تكتيك ثانوي: ${secondary.name} (50%)`, type: 'tactic' });
      if (tactic?.special === 'deception') { for (let i = 0; i < 2; i++) { for (let c = 0; c <= 2; c++) { for (let r = 0; r < ROWS; r++) { if (!getUnitAt(newUnits, c, r) && getTerrainAt(state.grid, c, r) !== 'water') { newUnits.push({ ...createUnit(Date.now() + i, 'infantry', 'player', c, r), isFake: true, fakeTurns: 2, moved: true, attacked: true }); break; } } } } newLog.push({ turn: state.turn, msg: '🎭 تم إنشاء وحدات وهمية!', type: 'tactic' }); }
      return { ...state, phase: 'movement', playerTactic: state.tacticId, secondaryPlayerTactic: state.secondaryTacticId, units: newUnits, log: newLog, selectedId: null, validMoves: [], validAttacks: [], deployMode: null, tacticsUsed, playerUsedPincer, playerUsedBlitzkrieg, playerUsedGuerrilla, playerUsedSiege, phaseTransition: 'movement' };
    }
    case 'HEX_CLICK': return handleHexClick(state, action.col, action.row);
    case 'HEX_HOVER': return { ...state, hoverHex: action.col !== null && action.row !== null ? [action.col, action.row] : null };
    case 'END_MOVEMENT': return { ...state, phase: 'attack', selectedId: null, validMoves: [], validAttacks: [], damagePreview: null, log: [...state.log, { turn: state.turn, msg: '🎯 مرحلة الهجوم', type: 'info' }], phaseTransition: 'attack' };
    case 'END_ATTACK': return { ...state, phase: 'ai_turn', selectedId: null, validMoves: [], validAttacks: [], damagePreview: null, animating: true, log: [...state.log, { turn: state.turn, msg: '🤖 دور العدو...', type: 'info' }], phaseTransition: 'ai_turn' };
    case 'DEPLOY_UNIT': return { ...state, deployMode: action.unitType };
    case 'UNDO': return state.previousState ? { ...state.previousState } : state;
    case 'USE_ABILITY': return handleAbilityUse(state, action.unitId);
    case 'CONFIRM_ATTACK': return handleConfirmAttack(state);
    case 'CANCEL_ATTACK': return { ...state, showBattleModal: null };
    case 'AI_TURN_COMPLETE': return handleAIComplete(state);
    case 'SAVE_GAME': { try { if (typeof window !== 'undefined') localStorage.setItem(`warGame_save_${action.slot}`, JSON.stringify(state)); } catch {} return state; }
    case 'LOAD_GAME': { try { if (typeof window !== 'undefined') { const d = localStorage.getItem(`warGame_save_${action.slot}`); if (d) return JSON.parse(d); } } catch {} return state; }
    case 'CLEAR_EFFECTS': return { ...state, effects: state.effects.filter(e => Date.now() - e.startTime < 1200) };
    case 'ENTER_BUILD_MODE': { const profile = loadProfile(); const maxBuilds = profile.unlockedPerks.includes('rapid_build') ? 2 : 1; if (state.playerBuildCount >= maxBuilds) return state; const cost = BUILDING_COSTS[action.buildingType]; if (state.player.supply < cost) return state; const placements = calcBuildPlacements(state); if (placements.length === 0) return state; return { ...state, buildMode: action.buildingType, validBuildPlacements: placements, deployMode: null }; }
    case 'BUILD_BUILDING': { if (!state.buildMode) return state; const profile = loadProfile(); const maxBuilds = profile.unlockedPerks.includes('rapid_build') ? 2 : 1; if (state.playerBuildCount >= maxBuilds) return state; if (!state.validBuildPlacements.some(([bc, br]) => bc === action.col && br === action.row)) return state; const cost = BUILDING_COSTS[state.buildMode]; if (state.player.supply < cost) return state; const bDef = BUILDING_DEFS[state.buildMode]; const newGrid = state.grid.map(c => c.map(cell => cell.col === action.col && cell.row === action.row ? { ...cell, building: state.buildMode!, buildingOwner: 'player' as Owner, buildingLevel: 1 } : cell)); return { ...state, grid: newGrid, buildMode: null, validBuildPlacements: [], player: { ...state.player, supply: state.player.supply - cost }, playerBuildCount: state.playerBuildCount + 1, log: [...state.log, { turn: state.turn, msg: `🏗️ تم بناء ${bDef.nameAr}!`, type: 'system' }] }; }
    case 'CANCEL_BUILD': return { ...state, buildMode: null, validBuildPlacements: [] };
    case 'TOGGLE_SOUND': return { ...state, soundEnabled: !state.soundEnabled };
    case 'ENTER_UPGRADE_MODE': return { ...state, upgradeMode: true, buildMode: null, deployMode: null };
    case 'EXIT_UPGRADE_MODE': return { ...state, upgradeMode: false };
    case 'UPGRADE_BUILDING': { const uCell = state.grid[action.col]?.[action.row]; if (!uCell?.building || uCell.buildingLevel >= 3) return state; const engineers = state.units.filter(u => u.owner === 'player' && u.type === 'engineers' && u.hp > 0); if (!engineers.some(e => hexDist(e.col, e.row, action.col, action.row) <= 1)) return state; const cost = getBuildingUpgradeCost(uCell.building, uCell.buildingLevel); if (state.player.supply < cost) return state; const newLevel = uCell.buildingLevel + 1; const bDef = BUILDING_DEFS[uCell.building]; const bonus = newLevel === 2 ? BUILDING_LEVEL_BONUSES[uCell.building].l2 : BUILDING_LEVEL_BONUSES[uCell.building].l3; return { ...state, grid: state.grid.map(c => c.map(cell => cell.col === action.col && cell.row === action.row ? { ...cell, buildingLevel: newLevel } : cell)), upgradeMode: false, player: { ...state.player, supply: state.player.supply - cost }, log: [...state.log, { turn: state.turn, msg: `⬆️ ترقية ${bDef.nameAr} للمستوى ${newLevel}! (${bonus})`, type: 'system' }] }; }
    case 'TOGGLE_STATS': return { ...state, showStats: !state.showStats };
    case 'TOGGLE_MINIMAP': return { ...state, showMiniMap: !state.showMiniMap };
    case 'DISMISS_DIPLOMACY': return handleDiplomacyEffect(state, action.effect);
    case 'CLEAR_PHASE_TRANSITION': return { ...state, phaseTransition: null };
    case 'DISMISS_TOAST': return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };
    case 'RETREAT_UNIT': { if (!state.selectedId || state.phase !== 'attack') return state; const rUnit = state.units.find(u => u.id === state.selectedId); if (!rUnit || rUnit.owner !== 'player' || rUnit.attacked) return state; const rTactic = TACTICS.find(t => t.id === state.playerTactic); const rSecondary = TACTICS.find(t => t.id === state.secondaryPlayerTactic); const enemies = state.units.filter(u => u.owner === 'ai' && !u.isFake && u.hp > 0); if (enemies.length === 0) return state; const moves = calcValidMoves(rUnit, state.grid, state.units, rTactic, rSecondary); const retreatMoves = moves.filter(([mc, mr]) => { const nd = Math.min(...enemies.map(e => hexDist(mc, mr, e.col, e.row))); const cd = Math.min(...enemies.map(e => hexDist(rUnit.col, rUnit.row, e.col, e.row))); return nd > cd; }); if (retreatMoves.length === 0) return state; retreatMoves.sort((a, b) => { const ad = Math.min(...enemies.map(e => hexDist(a[0], a[1], e.col, e.row))); const bd = Math.min(...enemies.map(e => hexDist(b[0], b[1], e.col, e.row))); return bd - ad; }); const [nc, nr] = retreatMoves[0]; return { ...state, units: state.units.map(u => u.id === rUnit.id ? { ...u, col: nc, row: nr, moved: true, attacked: true } : u), selectedId: null, validMoves: [], validAttacks: [], log: [...state.log, { turn: state.turn, msg: `↩️ ${UNIT_DEFS[rUnit.type].nameAr} انسحب`, type: 'movement' as const }] }; }
    default: return state;
  }
}
function handleDiplomacyEffect(state: GameState, effect: string): GameState {
  const newLog = [...state.log];
  let newGrid = state.grid;
  let newUnits = state.units;
  let newAi = { ...state.ai };
  let newPlayer = { ...state.player };
  let newAchievements = [...state.achievements];
  const addAch = (id: string) => { if (!newAchievements.includes(id)) newAchievements.push(id); };
  switch (effect) {
    case 'ceasefire_accept': state = { ...state, ceasefireActive: true }; newLog.push({ turn: state.turn, msg: '🤝 هدنة! لا هجوم لدورين', type: 'system' }); addAch('diplomat'); break;
    case 'ceasefire_reject': newLog.push({ turn: state.turn, msg: '⚔️ رفضت هدنة العدو!', type: 'system' }); break;
    case 'intel_accept': { const revealed = state.revealed.map(r => [...r]); for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) revealed[c][r] = true; state = { ...state, revealed }; newLog.push({ turn: state.turn, msg: '📋 كشف الخريطة بالكامل!', type: 'system' }); break; }
    case 'surrender_accept': return { ...state, winner: 'player', screen: 'game_over', diplomacyEvent: null, achievements: newAchievements };
    case 'surrender_reject': newLog.push({ turn: state.turn, msg: '⚔️ لن نستسلم!', type: 'system' }); break;
    case 'sabotage_accept': { const playerBuildings = state.grid.flat().filter(c => c.building && c.buildingOwner === 'player' && c.buildingLevel > 1); if (playerBuildings.length > 0) { const target = playerBuildings[Math.floor(Math.random() * playerBuildings.length)]; newGrid = state.grid.map(c => c.map(cell => cell.col === target.col && cell.row === target.row ? { ...cell, buildingLevel: Math.max(1, cell.buildingLevel - 1) } : cell)); newLog.push({ turn: state.turn, msg: '💣 تخريب! انخفاض مستوى مبنى!', type: 'system' }); } break; }
    case 'reinforcement_accept': { const spawns = findSafeSpawn(state.grid, state.units, [11, 13], 'ai', 'infantry'); if (spawns.length > 0) { const [sc, sr] = spawns[0]; const weakUnit = createUnit(Date.now(), 'infantry', 'ai', sc, sr); weakUnit.hp = Math.floor(weakUnit.hp * 0.5); weakUnit.atk = Math.floor(weakUnit.atk * 0.5); weakUnit.moved = true; weakUnit.attacked = true; newUnits = [...state.units, weakUnit]; newLog.push({ turn: state.turn, msg: '📢 إمدادات العدو وصلت (ضعيفة)!', type: 'system' }); } break; }
  }
  return { ...state, diplomacyEvent: null, log: newLog, grid: newGrid, units: newUnits, ai: newAi, player: newPlayer, achievements: newAchievements };
}
function handleAbilityUse(state: GameState, unitId: string): GameState {
  const uIdx = state.units.findIndex(u => u.id === unitId);
  if (uIdx < 0) return state;
  const unit = state.units[uIdx];
  if (unit.owner !== 'player' || unit.abilityCooldownLeft > 0 || unit.type === 'missiles') return state;
  if (unit.statusEffects.some(e => e.type === 'frozen' || e.type === 'stunned')) return state;
  const def = UNIT_DEFS[unit.type]; const log = [...state.log]; let newUnit = { ...unit }; let newUnits = state.units;
  if (unit.type === 'infantry') { newUnit.entrenched = true; newUnit.abilityActive = true; newUnit.abilityActiveTurns = 2; newUnit.abilityCooldownLeft = def.abilityCooldown; log.push({ turn: state.turn, msg: `🏗️ ${def.nameAr} حفر خنادق! +40% دفاع`, type: 'defense' }); }
  else if (unit.type === 'armor') { newUnit.abilityActive = true; newUnit.abilityActiveTurns = 1; newUnit.abilityCooldownLeft = def.abilityCooldown; log.push({ turn: state.turn, msg: `💥 ${def.nameAr} يجهز صدمة! ×2`, type: 'tactic' }); }
  else if (unit.type === 'artillery') {
    const tactic = TACTICS.find(t => t.id === state.playerTactic); const secondary = TACTICS.find(t => t.id === state.secondaryPlayerTactic);
    const enemies = state.units.filter(e => e.owner !== 'player' && !e.isFake && hexDist(unit.col, unit.row, e.col, e.row) <= 2);
    newUnits = state.units.map(u => u.id === unitId ? { ...newUnit } : u); newUnits[uIdx] = newUnit;
    for (const e of enemies) { const dmg = Math.round(calcDamage(unit, e, tactic, secondary, state.grid, state.weather, state.player.morale, state.ai.morale, false) * 0.6); const eIdx = newUnits.findIndex(u => u.id === e.id);
      if (eIdx >= 0) { let hp = newUnits[eIdx].hp - dmg; log.push({ turn: state.turn, msg: `💣 قصف مكثف على ${UNIT_DEFS[e.type].nameAr} - ${dmg}`, type: 'attack' }); newUnits[eIdx] = { ...newUnits[eIdx], hp, statusEffects: [...newUnits[eIdx].statusEffects, { type: 'burning' as StatusEffectType, turnsLeft: 2, source: 'artillery' }] }; if (hp <= 0) { newUnits = newUnits.filter(u => u.id !== e.id); log.push({ turn: state.turn, msg: `  ✗ ${UNIT_DEFS[e.type].nameAr} دُمر!`, type: 'system' }); } }
    }
    newUnit.abilityCooldownLeft = def.abilityCooldown;
    return { ...state, units: newUnits, log, effects: [...state.effects, ...enemies.map(e => ({ id: `fx_${Date.now()}_${e.id}`, col: e.col, row: e.row, type: 'explosion' as const, startTime: Date.now() }))], shakeKey: state.shakeKey + 1 };
  }
  else if (unit.type === 'special_forces') { newUnit.abilityActive = true; newUnit.abilityActiveTurns = 1; newUnit.abilityCooldownLeft = def.abilityCooldown; log.push({ turn: state.turn, msg: `🎯 ${def.nameAr} اغتيال! ×3`, type: 'tactic' }); }
  else if (unit.type === 'cavalry') { newUnit.abilityActive = true; newUnit.abilityActiveTurns = 1; newUnit.abilityCooldownLeft = def.abilityCooldown; log.push({ turn: state.turn, msg: `🐎 ${def.nameAr} هجوم سهم! ×2`, type: 'tactic' }); }
  else if (unit.type === 'medics') {
    const allies = state.units.filter(u => u.owner === 'player' && !u.isFake && u.hp > 0 && u.id !== unitId && hexDist(unit.col, unit.row, u.col, u.row) <= 2);
    if (allies.length > 0) { allies.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp)); const target = allies[0]; const tIdx = state.units.findIndex(u => u.id === target.id); const healed = Math.min(40, target.maxHp - target.hp);
      if (tIdx >= 0 && healed > 0) { newUnits = state.units.map(u => u.id === unitId ? newUnit : u); newUnits = newUnits.map((u, i) => i === tIdx ? { ...u, hp: Math.min(u.maxHp, u.hp + 40) } : u); newUnits[uIdx] = newUnit; log.push({ turn: state.turn, msg: `⚕️ ${def.nameAr} عالج +${healed} HP`, type: 'defense' }); newUnit.abilityCooldownLeft = def.abilityCooldown; return { ...state, units: newUnits, log, effects: [...state.effects, { id: `fx_heal_${Date.now()}`, col: target.col, row: target.row, type: 'heal' as const, startTime: Date.now() }] }; }
    } else { log.push({ turn: state.turn, msg: `⚕️ لا يوجد حلفاء جرحى`, type: 'info' }); return state; }
  }
  else if (unit.type === 'engineers') { newUnit.entrenched = true; newUnit.abilityActive = true; newUnit.abilityActiveTurns = 3; newUnit.abilityCooldownLeft = def.abilityCooldown; log.push({ turn: state.turn, msg: `🔧 ${def.nameAr} تحصين! +60% دفاع`, type: 'defense' }); }
  else if (unit.type === 'scouts') { const revealed = state.revealed.map(r => [...r]); revealAround(state.grid, revealed, unit.col, unit.row, 6); newUnit.abilityCooldownLeft = def.abilityCooldown; log.push({ turn: state.turn, msg: `🔭 ${def.nameAr} رصد!`, type: 'info' }); newUnits = state.units.map(u => u.id === unitId ? newUnit : u); return { ...state, units: newUnits, log, revealed }; }
  else if (unit.type === 'marines') { newUnit.abilityActive = true; newUnit.abilityActiveTurns = 2; newUnit.abilityCooldownLeft = def.abilityCooldown; log.push({ turn: state.turn, msg: `⚓ ${def.nameAr} إنزال بحري!`, type: 'tactic' }); }
  else if (unit.type === 'rocket_artillery') {
    const tactic = TACTICS.find(t => t.id === state.playerTactic); const secondary = TACTICS.find(t => t.id === state.secondaryPlayerTactic);
    const enemies = state.units.filter(e => e.owner !== 'player' && !e.isFake && hexDist(unit.col, unit.row, e.col, e.row) <= 3);
    newUnits = state.units.map(u => u.id === unitId ? { ...newUnit } : u); newUnits[uIdx] = newUnit;
    for (const e of enemies) { const dmg = Math.round(calcDamage(unit, e, tactic, secondary, state.grid, state.weather, state.player.morale, state.ai.morale, false) * 0.5); const eIdx = newUnits.findIndex(u => u.id === e.id);
      if (eIdx >= 0) { let hp = newUnits[eIdx].hp - dmg; log.push({ turn: state.turn, msg: `🎆 قصف صاروخي - ${dmg}`, type: 'attack' }); newUnits[eIdx] = { ...newUnits[eIdx], hp, statusEffects: [...newUnits[eIdx].statusEffects, { type: 'burning' as StatusEffectType, turnsLeft: 2, source: 'rocket' }] }; if (hp <= 0) { newUnits = newUnits.filter(u => u.id !== e.id); log.push({ turn: state.turn, msg: `  ✗ دُمر!`, type: 'system' }); } }
    }
    newUnit.abilityCooldownLeft = def.abilityCooldown;
    return { ...state, units: newUnits, log, effects: [...state.effects, ...enemies.map(e => ({ id: `fx_${Date.now()}_${e.id}`, col: e.col, row: e.row, type: 'explosion' as const, startTime: Date.now() }))], shakeKey: state.shakeKey + 1 };
  }
  else if (unit.type === 'commando') { newUnit.abilityActive = true; newUnit.abilityActiveTurns = 1; newUnit.abilityCooldownLeft = def.abilityCooldown; log.push({ turn: state.turn, msg: `🎯 ${def.nameAr} عملية خاصة! ×2 +شفاء`, type: 'tactic' }); }
  else if (unit.type === 'supply_truck') { newUnit.abilityCooldownLeft = def.abilityCooldown; log.push({ turn: state.turn, msg: `🚛 ${def.nameAr} إمداد! +15`, type: 'tactic' }); newUnits = state.units.map(u => u.id === unitId ? newUnit : u); return { ...state, units: newUnits, log, player: { ...state.player, supply: state.player.supply + 15 } }; }
  else if (unit.type === 'helicopter') {
    const tactic = TACTICS.find(t => t.id === state.playerTactic); const secondary = TACTICS.find(t => t.id === state.secondaryPlayerTactic);
    const enemies = state.units.filter(e => e.owner !== 'player' && !e.isFake && hexDist(unit.col, unit.row, e.col, e.row) <= 2);
    newUnits = state.units.map(u => u.id === unitId ? { ...newUnit } : u); newUnits[uIdx] = newUnit;
    for (const e of enemies) { const dmg = Math.round(calcDamage(unit, e, tactic, secondary, state.grid, state.weather, state.player.morale, state.ai.morale, false) * 0.6); const eIdx = newUnits.findIndex(u => u.id === e.id);
      if (eIdx >= 0) { let hp = newUnits[eIdx].hp - dmg; log.push({ turn: state.turn, msg: `🚁 قصف جوي على ${UNIT_DEFS[e.type].nameAr} - ${dmg}`, type: 'attack' }); newUnits[eIdx] = { ...newUnits[eIdx], hp, statusEffects: [...newUnits[eIdx].statusEffects, { type: 'burning' as StatusEffectType, turnsLeft: 2, source: 'helicopter' }] }; if (hp <= 0) { newUnits = newUnits.filter(u => u.id !== e.id); log.push({ turn: state.turn, msg: `  ✗ دُمر!`, type: 'system' }); } }
    }
    newUnit.abilityCooldownLeft = def.abilityCooldown;
    return { ...state, units: newUnits, log, effects: [...state.effects, ...enemies.map(e => ({ id: `fx_heli_${Date.now()}`, col: e.col, row: e.row, type: 'explosion' as const, startTime: Date.now() }))], shakeKey: state.shakeKey + 1 };
  }
  else if (unit.type === 'fighter_jet') { newUnit.abilityActive = true; newUnit.abilityActiveTurns = 1; newUnit.abilityCooldownLeft = def.abilityCooldown; log.push({ turn: state.turn, msg: `✈️ ${def.nameAr} قنبلة! ×2 ضرر`, type: 'tactic' }); }
  else if (unit.type === 'destroyer') {
    const tactic = TACTICS.find(t => t.id === state.playerTactic); const secondary = TACTICS.find(t => t.id === state.secondaryPlayerTactic);
    const enemies = state.units.filter(e => e.owner !== 'player' && !e.isFake && !isNavalUnit(e.type) && hexDist(unit.col, unit.row, e.col, e.row) <= 3);
    newUnits = state.units.map(u => u.id === unitId ? { ...newUnit } : u); newUnits[uIdx] = newUnit;
    for (const e of enemies) { const dmg = Math.round(calcDamage(unit, e, tactic, secondary, state.grid, state.weather, state.player.morale, state.ai.morale, false) * 0.7); const eIdx = newUnits.findIndex(u => u.id === e.id);
      if (eIdx >= 0) { let hp = newUnits[eIdx].hp - dmg; log.push({ turn: state.turn, msg: `🚢 قصف ساحلي على ${UNIT_DEFS[e.type].nameAr} - ${dmg}`, type: 'attack' }); if (hp <= 0) { newUnits = newUnits.filter(u => u.id !== e.id); log.push({ turn: state.turn, msg: `  ✗ دُمر!`, type: 'system' }); } else { newUnits[eIdx] = { ...newUnits[eIdx], hp }; } }
    }
    newUnit.abilityCooldownLeft = def.abilityCooldown;
    return { ...state, units: newUnits, log, effects: [...state.effects, ...enemies.map(e => ({ id: `fx_dest_${Date.now()}`, col: e.col, row: e.row, type: 'explosion' as const, startTime: Date.now() }))], shakeKey: state.shakeKey + 1 };
  }
  else if (unit.type === 'transport_ship') {
    if (unit.carriedUnitId) { log.push({ turn: state.turn, msg: '🛳️ لا يمكن الإنزال - السفينة محملة', type: 'info' }); return state; }
    newUnit.abilityCooldownLeft = def.abilityCooldown;
    log.push({ turn: state.turn, msg: `🛳️ ${def.nameAr} إنزال! اختر موقع الإنزال المجاور`, type: 'tactic' });
    // Mark deploy mode for adjacent land
    const deployable = getNeighbors(unit.col, unit.row).filter(([c, r]) => { const t = getTerrainAt(state.grid, c, r); return t !== 'water' && t !== 'mountain' && !getUnitAt(state.units, c, r); });
    if (deployable.length === 0) { log.push({ turn: state.turn, msg: '🛳️ لا يوجد مواقع للإنزال!', type: 'info' }); newUnit.abilityCooldownLeft = 0; }
    else { log.push({ turn: state.turn, msg: `🛳️ انقر موقع الإنزال (${deployable.length} خيارات)`, type: 'info' }); }
  }
  newUnits = state.units.map(u => u.id === unitId ? newUnit : u);
  return { ...state, units: newUnits, log };
}
function handleConfirmAttack(state: GameState): GameState {
  if (!state.showBattleModal) return state;
  if (state.ceasefireActive) { return { ...state, showBattleModal: null, log: [...state.log, { turn: state.turn, msg: '🏳️ هدنة سارية! لا يمكن الهجوم', type: 'system' }] }; }
  const { attacker, defender, dmg, counterDmg } = state.showBattleModal;
  const tactic = TACTICS.find(t => t.id === state.playerTactic); const secondary = TACTICS.find(t => t.id === state.secondaryPlayerTactic);
  let newUnits = state.units.map(u => ({ ...u })); const log = [...state.log];
  let finalDmg = dmg; let crit = false; let miss = false;
  if (Math.random() < missChance(attacker.type)) { miss = true; finalDmg = 0; }
  else if (Math.random() < critChance(attacker.type)) { crit = true; finalDmg = Math.round(finalDmg * 1.5); }
  let combineArms = false; if (!miss && checkCombineArms(attacker, state.units)) { combineArms = true; finalDmg = Math.round(finalDmg * 1.2); }
  let flanking = false; if (!miss && isFlanking(attacker, defender, state.units)) { flanking = true; finalDmg = Math.round(finalDmg * 1.25); }
  let atkMsg = `⚔️ ${UNIT_DEFS[attacker.type].nameAr} هاجم ${UNIT_DEFS[defender.type].nameAr} - ${finalDmg}`;
  if (miss) atkMsg += ' 💨 أخطأ!'; else if (crit) atkMsg += ' 💥 ضربة حرجة!';
  if (combineArms) atkMsg += ' 🔗'; if (flanking) atkMsg += ' 🗡️';
  log.push({ turn: state.turn, msg: atkMsg, type: 'attack' });
  let pKilled = state.playerUnitsKilled, aKilled = state.aiUnitsKilled, artilleryKills = state.artilleryKills, playerLostNoUnits = state.playerLostNoUnits;
  let totalDmgDealt = state.totalDamageDealt + finalDmg, totalDmgReceived = state.totalDamageReceived;
  let defIdx = newUnits.findIndex(u => u.id === defender.id); let newHp = defender.hp - finalDmg;
  let newGrid = state.grid;
  if (newHp <= 0) { newUnits = newUnits.filter(u => u.id !== defender.id); if (defender.owner === 'ai') { pKilled++; if (attacker.type === 'artillery' || attacker.type === 'rocket_artillery' || attacker.type === 'helicopter' || attacker.type === 'fighter_jet' || attacker.type === 'destroyer') artilleryKills++; log.push({ turn: state.turn, msg: `  ✗ ${UNIT_DEFS[defender.type].nameAr} دُمر!`, type: 'system' }); if (Math.random() < 0.2) log.push({ turn: state.turn, msg: '  💰 غنائم!', type: 'system' }); } else { aKilled++; playerLostNoUnits = false; } } else { newUnits[defIdx] = { ...newUnits[defIdx], hp: newHp }; }
  if (newHp > 0 && (attacker.type === 'artillery' || attacker.type === 'rocket_artillery' || attacker.type === 'missiles')) {
    const dTerrain = state.grid[defender.col]?.[defender.row]?.terrain; if (dTerrain) {
      let destroyed = false; let newTerrain: TerrainType = dTerrain;
      if (dTerrain === 'urban' && Math.random() < 0.4) { newTerrain = 'ruins'; destroyed = true; } else if (dTerrain === 'forest' && Math.random() < 0.5) { newTerrain = 'plains'; destroyed = true; } else if (dTerrain === 'road' && Math.random() < 0.3) { newTerrain = 'plains'; destroyed = true; }
      if (destroyed) { newGrid = state.grid.map(col => col.map(cell => cell.col === defender.col && cell.row === defender.row ? { ...cell, terrain: newTerrain } : cell)); log.push({ turn: state.turn, msg: `  🏚️ تدمير تضاريس!`, type: 'system' }); }
    }
  }
  let atkIdx = newUnits.findIndex(u => u.id === attacker.id);
  if (atkIdx >= 0) {
    let au = { ...newUnits[atkIdx] }; au.exp += 8; if (newHp <= 0) au.exp += 12;
    if (au.exp >= au.maxExp) { au.level++; au.exp = 0; au.maxExp += 10; au.atk += 2; au.def += 1; if (au.level === 3) au.mov += 1; if (au.level === 5) au.hp = Math.min(au.maxHp, au.hp + 20); log.push({ turn: state.turn, msg: `  ⬆️ ${UNIT_DEFS[au.type].nameAr} مستوى ${au.level}!`, type: 'info' }); playSound('levelup');
      for (const [nc, nr] of getNeighbors(au.col, au.row)) { const allyIdx = newUnits.findIndex(u => u.col === nc && u.row === nr && u.owner === 'player' && !u.isFake && u.id !== au.id && u.hp > 0); if (allyIdx >= 0 && newUnits[allyIdx].level < 5) { const ally = { ...newUnits[allyIdx] }; ally.exp += 3; if (ally.exp >= ally.maxExp) { ally.level++; ally.exp = 0; ally.maxExp += 10; ally.atk += 2; ally.def += 1; } newUnits[allyIdx] = ally; } }
    }
    au.attacked = true;
    if (au.abilityActive && au.type === 'commando') { au.hp = Math.min(au.maxHp, au.hp + 20); au.abilityActive = false; au.abilityActiveTurns = 0; log.push({ turn: state.turn, msg: `  💚 +20 HP`, type: 'defense' }); }
    if (au.type === 'missiles') { newUnits = newUnits.filter(u => u.id !== au.id); log.push({ turn: state.turn, msg: '  💥 الصواريخ استُهلكت!', type: 'system' }); } else { newUnits[atkIdx] = au; }
  }
  // Stun chance on critical hit
  if (crit && newHp > 0 && Math.random() < 0.10) { const dIdx2 = newUnits.findIndex(u => u.id === defender.id); if (dIdx2 >= 0) { newUnits[dIdx2] = { ...newUnits[dIdx2], statusEffects: [...newUnits[dIdx2].statusEffects, { type: 'stunned' as StatusEffectType, turnsLeft: 1, source: 'critical' }] }; log.push({ turn: state.turn, msg: `  💫 ${UNIT_DEFS[defender.type].nameAr} مصدوم!`, type: 'system' }); } }
  // Special forces poison on hit
  if (!miss && attacker.type === 'special_forces' && newHp > 0 && Math.random() < 0.3) { const dIdx2 = newUnits.findIndex(u => u.id === defender.id); if (dIdx2 >= 0) { newUnits[dIdx2] = { ...newUnits[dIdx2], statusEffects: [...newUnits[dIdx2].statusEffects, { type: 'poisoned' as StatusEffectType, turnsLeft: 3, source: 'special_forces' }] }; log.push({ turn: state.turn, msg: `  ☠️ سم!`, type: 'system' }); } }
  if (newHp > 0 && counterDmg > 0) {
    log.push({ turn: state.turn, msg: `  🔄 هجوم مضاد: -${counterDmg}`, type: 'defense' }); totalDmgReceived += counterDmg;
    atkIdx = newUnits.findIndex(u => u.id === attacker.id);
    if (atkIdx >= 0) { let aHp = newUnits[atkIdx].hp - counterDmg; if (aHp <= 0) { newUnits = newUnits.filter(u => u.id !== attacker.id); aKilled++; playerLostNoUnits = false; log.push({ turn: state.turn, msg: `  ✗ ${UNIT_DEFS[attacker.type].nameAr} دُمر!`, type: 'system' }); } else { newUnits[atkIdx] = { ...newUnits[atkIdx], hp: aHp }; } }
  }
  const newEffects = [...state.effects, { id: `fx_${Date.now()}`, col: defender.col, row: defender.row, type: 'attack' as const, startTime: Date.now() }];
  if (newHp <= 0) newEffects.push({ id: `fx2_${Date.now()}`, col: defender.col, row: defender.row, type: 'death' as const, startTime: Date.now() });
  const w = checkVictoryCondition(state, newUnits);
  return { ...state, grid: newGrid, units: newUnits, selectedId: null, validAttacks: [], validMoves: [], log, damagePreview: null, showBattleModal: null, playerUnitsKilled: pKilled, aiUnitsKilled: aKilled, totalDamageDealt: totalDmgDealt, totalDamageReceived: totalDmgReceived, artilleryKills, playerLostNoUnits, effects: newEffects, shakeKey: attacker.type === 'artillery' || attacker.type === 'missiles' || attacker.type === 'rocket_artillery' || attacker.type === 'helicopter' || attacker.type === 'fighter_jet' || attacker.type === 'destroyer' ? state.shakeKey + 1 : state.shakeKey, winner: w, phase: w ? 'ai_turn' as GamePhase : state.phase };
}
function handleHexClick(state: GameState, col: number, row: number): GameState {
  if (state.phase !== 'movement' && state.phase !== 'attack') return state;
  if (state.buildMode) { if (state.validBuildPlacements.some(([bc, br]) => bc === col && br === row)) return gameReducer(state, { type: 'BUILD_BUILDING', col, row }); return { ...state, buildMode: null, validBuildPlacements: [] }; }
  if (state.upgradeMode) { const cell = state.grid[col]?.[row]; if (cell?.building && cell.buildingOwner === 'player') return gameReducer(state, { type: 'UPGRADE_BUILDING', col, row }); return { ...state, upgradeMode: false }; }
  if (state.deployMode) {
    const playerBarracksCount = state.grid.flat().filter(c => c.building === 'barracks' && c.buildingOwner === 'player').length;
    const maxDeploys = 1 + playerBarracksCount * 2; if (state.playerDeployCount >= maxDeploys) return { ...state, deployMode: null };
    const cost = UNIT_DEFS[state.deployMode].cost;
    const playerMaxCol = state.units.filter(u => u.owner === 'player' && !u.isFake && u.hp > 0).reduce((max, u) => Math.max(max, u.col), 0);
    const deployColLimit = Math.max(2, playerMaxCol + 1);
    const deployType = state.deployMode;
    if (isNavalUnit(deployType)) { if (state.player.supply < cost || getTerrainAt(state.grid, col, row) !== 'water' && getTerrainAt(state.grid, col, row) !== 'beach' || getUnitAt(state.units, col, row)) return state; }
    else if (isAirUnit(deployType)) { if (state.player.supply < cost || getUnitAt(state.units, col, row)) return state; }
    else { if (state.player.supply < cost || col > deployColLimit || col < 0 || getTerrainAt(state.grid, col, row) === 'water' || getTerrainAt(state.grid, col, row) === 'mountain' || getUnitAt(state.units, col, row)) return state; }
    const nearBarracks = getNeighbors(col, row).some(([nc, nr]) => { const cell = state.grid[nc]?.[nr]; return cell?.building === 'barracks' && cell.buildingOwner === 'player'; });
    const discount = nearBarracks ? 0.75 : 1; const finalCost = Math.floor(cost * discount);
    if (state.player.supply < finalCost) return state;
    const def = UNIT_DEFS[deployType]; const newUnit = createUnit(Date.now(), deployType, 'player', col, row);
    return { ...state, units: [...state.units, { ...newUnit, moved: true, attacked: true }], player: { ...state.player, supply: state.player.supply - finalCost }, deployMode: null, playerDeployCount: state.playerDeployCount + 1, log: [...state.log, { turn: state.turn, msg: `✦ نشر ${def.nameAr} (${state.playerDeployCount + 1}/${maxDeploys})`, type: 'tactic' }] };
  }
  const clicked = getUnitAt(state.units, col, row); const tactic = TACTICS.find(t => t.id === state.playerTactic); const secondary = TACTICS.find(t => t.id === state.secondaryPlayerTactic);
  if (state.phase === 'movement') {
    if (state.selectedId) {
      const sel = state.units.find(u => u.id === state.selectedId);
      // Transport ship deploy handling
      if (sel && sel.type === 'transport_ship' && sel.abilityActive && sel.abilityCooldownLeft === UNIT_DEFS.transport_ship.abilityCooldown - 1) {
        const t = getTerrainAt(state.grid, col, row);
        if (t !== 'water' && t !== 'mountain' && !getUnitAt(state.units, col, row)) {
          const deployTypes: UnitType[] = ['infantry', 'medics', 'engineers'];
          const dType = deployTypes[Math.floor(Math.random() * deployTypes.length)];
          const newUnit = createUnit(Date.now(), dType, 'player', col, row);
          newUnit.moved = true; newUnit.attacked = true;
          return { ...state, units: [...state.units, newUnit], selectedId: null, validMoves: [], validAttacks: [], log: [...state.log, { turn: state.turn, msg: `🛳️ إنزال ${UNIT_DEFS[dType].nameAr}!`, type: 'tactic' }] };
        }
      }
      if (sel && state.validMoves.some(([mc, mr]) => mc === col && mr === row)) {
        const prev = JSON.parse(JSON.stringify(state)); const newUnits = state.units.map(u => u.id === sel.id ? { ...u, col, row, moved: true } : u);
        const attacks = calcValidAttacks({ ...sel, col, row }, newUnits, tactic);
        const moveLog = [...state.log, { turn: state.turn, msg: `▸ ${UNIT_DEFS[sel.type].nameAr} تحرك`, type: 'movement' }];
        const destCell = state.grid[col]?.[row]; let newGrid = state.grid; let spCaptured = state.strategicPointsCaptured;
        if (destCell?.strategicPoint && destCell.strategicOwner !== 'player') { newGrid = state.grid.map(c => c.map(cell => cell.col === col && cell.row === row ? { ...cell, strategicOwner: 'player' as Owner, garrisonTurn: state.turn } : cell)); moveLog.push({ turn: state.turn, msg: `🏛️ احتلال!`, type: 'system' }); playSound('capture'); spCaptured++; }
        // Capture buildings
        if (destCell?.building && destCell.buildingOwner !== 'player' && destCell.buildingOwner !== null) { newGrid = newGrid.map(c => c.map(cell => cell.col === col && cell.row === row ? { ...cell, buildingOwner: 'player' as Owner } : cell)); moveLog.push({ turn: state.turn, msg: `🏗️ احتلال ${BUILDING_DEFS[destCell.building!].nameAr}!`, type: 'system' }); playSound('capture'); }
        return { ...state, grid: newGrid, units: newUnits, selectedId: sel.id, validMoves: [], validAttacks: attacks, previousState: prev, strategicPointsCaptured: spCaptured, log: moveLog };
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
        if (state.ceasefireActive) return { ...state, log: [...state.log, { turn: state.turn, msg: '🏳️ هدنة سارية!', type: 'system' }] };
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
  const aiU = state.units.filter(u => u.owner === 'ai' && !u.isFake); const pU = state.units.filter(u => u.owner === 'player' && !u.isFake);
  const ratio = aiU.length / Math.max(1, pU.length); const isHard = state.difficulty === 'hard' || state.difficulty === 'legendary';
  if (ratio > 1.3 || (isHard && ratio > 1.1)) { const off = TACTICS.filter(t => t.category === 'attack'); return off[Math.floor(Math.random() * off.length)].id; }
  if (ratio < 0.8 || (!isHard && ratio < 1)) { const def = TACTICS.filter(t => t.category === 'defense'); return def[Math.floor(Math.random() * def.length)].id; }
  return TACTICS[Math.floor(Math.random() * TACTICS.length)].id;
}
function aiExecuteTurn(state: GameState): { units: Unit[]; log: LogEntry[]; ai: PlayerState; playerSupplyDelta: number; grid: HexCell[] } {
  const log: LogEntry[] = []; let units = state.units.map(u => ({ ...u, moved: false, attacked: false }));
  let newGrid = state.grid.map(col => col.map(cell => ({ ...cell })));
  const aiTactic = TACTICS.find(t => t.id === state.aiTactic); const playerTactic = TACTICS.find(t => t.id === state.playerTactic);
  let ai = { ...state.ai }; let playerSupplyDelta = 0;
  const diffMult = state.difficulty === 'easy' ? 0.8 : state.difficulty === 'hard' ? 1.1 : state.difficulty === 'legendary' ? 1.25 : 1;
  if (aiTactic?.special === 'attrition') { playerSupplyDelta -= 10; log.push({ turn: state.turn, msg: '▸ استنزاف: -10', type: 'tactic' }); }
  if (aiTactic?.special === 'scorched_earth') { playerSupplyDelta -= 20; log.push({ turn: state.turn, msg: '▸ الأرض المحروقة: -20', type: 'tactic' }); }
  if (aiTactic?.special === 'deception') { for (let i = 0; i < 2; i++) { for (let c = 11; c <= 13; c++) { for (let r = 0; r < ROWS; r++) { if (!getUnitAt(units, c, r) && getTerrainAt(state.grid, c, r) !== 'water') { units.push({ ...createUnit(Date.now() + i, 'infantry', 'ai', c, r), isFake: true, fakeTurns: 2, moved: true, attacked: true }); break; } } } } log.push({ turn: state.turn, msg: '▸ وحدات وهمية!', type: 'tactic' }); }
  units = units.filter(u => !u.isFake || u.fakeTurns > 0).map(u => u.isFake ? { ...u, fakeTurns: u.fakeTurns - 1 } : u);
  const aiUnits = units.filter(u => u.owner === 'ai' && !u.isFake && u.hp > 0); const pU = () => units.filter(u => u.owner === 'player' && !u.isFake && u.hp > 0);
  const sorted = [...aiUnits].sort((a, b) => { const p: Record<string, number> = { rocket_artillery: -2, artillery: -1, supply_truck: 0, armor: 1, infantry: 2, special_forces: 3, cavalry: 4, missiles: 5, engineers: 6, medics: 7, commando: 8, marines: 9, scouts: 10, helicopter: 11, fighter_jet: 12, destroyer: 13, transport_ship: 14 }; return (p[a.type] ?? 3) - (p[b.type] ?? 3); });
  for (const unit of sorted) {
    if (unit.hp <= 0 || !units.find(u => u.id === unit.id)) continue;
    const enemies = pU(); if (enemies.length === 0) break;
    // Skip frozen/stunned
    if (unit.statusEffects.some(e => e.type === 'frozen' || e.type === 'stunned')) { log.push({ turn: state.turn, msg: `▸ ${UNIT_DEFS[unit.type].nameAr} معطّل`, type: 'info' }); continue; }
    if (unit.type === 'medics' && unit.abilityCooldownLeft <= 0) { const allies = units.filter(u => u.owner === 'ai' && !u.isFake && u.hp > 0 && u.id !== unit.id && u.hp < u.maxHp && hexDist(unit.col, unit.row, u.col, u.row) <= 2); if (allies.length > 0) { allies.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp)); const t = allies[0]; const tIdx = units.findIndex(u => u.id === t.id); if (tIdx >= 0) { units[tIdx] = { ...units[tIdx], hp: Math.min(units[tIdx].maxHp, units[tIdx].hp + 40) }; const uIdx = units.findIndex(u => u.id === unit.id); if (uIdx >= 0) units[uIdx] = { ...units[uIdx], abilityCooldownLeft: 3 }; log.push({ turn: state.turn, msg: `▸ ${UNIT_DEFS[unit.type].nameAr} عالج`, type: 'defense' }); } continue; } }
    if (unit.type === 'supply_truck') { if (unit.abilityCooldownLeft <= 0) { ai = { ...ai, supply: ai.supply + 15 }; const uIdx = units.findIndex(u => u.id === unit.id); if (uIdx >= 0) units[uIdx] = { ...units[uIdx], abilityCooldownLeft: 3 }; } continue; }
    if (unit.type === 'scouts') { const moves = calcValidMoves(unit, state.grid, units, aiTactic, null); if (moves.length > 0) { const fwd = moves.filter(([mc]) => mc < unit.col); if (fwd.length > 0) { const [bc, br] = fwd[Math.floor(Math.random() * fwd.length)]; const uidx = units.findIndex(u => u.id === unit.id); if (uidx >= 0) units[uidx] = { ...units[uidx], col: bc, row: br, moved: true }; } } continue; }
    if (unit.type === 'engineers') { if (unit.abilityCooldownLeft <= 0) { const uIdx = units.findIndex(u => u.id === unit.id); if (uIdx >= 0) { units[uIdx] = { ...units[uIdx], entrenched: true, abilityActive: true, abilityActiveTurns: 3, abilityCooldownLeft: 4 }; } } continue; }
    if (unit.hp < unit.maxHp * 0.3 && unit.type !== 'artillery' && unit.type !== 'rocket_artillery' && !isAirUnit(unit.type)) { const moves = calcValidMoves(unit, state.grid, units, aiTactic, null); const retreatMoves = moves.filter(([mc]) => mc > unit.col); if (retreatMoves.length > 0) { const [bc, br] = retreatMoves[0]; const uidx = units.findIndex(u => u.id === unit.id); if (uidx >= 0) units[uidx] = { ...units[uidx], col: bc, row: br, moved: true }; continue; } }
    // AI use abilities
    if (unit.type === 'helicopter' && unit.abilityCooldownLeft <= 0 && Math.random() < 0.4) {
      const targetEnemies = enemies.filter(e => hexDist(unit.col, unit.row, e.col, e.row) <= 2);
      if (targetEnemies.length > 0) {
        for (const e of targetEnemies) { const dmg = Math.round(25 * diffMult * 0.6); const eIdx = units.findIndex(u => u.id === e.id); if (eIdx >= 0) { units[eIdx] = { ...units[eIdx], hp: Math.max(0, units[eIdx].hp - dmg), statusEffects: [...units[eIdx].statusEffects, { type: 'burning' as StatusEffectType, turnsLeft: 2, source: 'ai_helicopter' }] }; if (units[eIdx].hp <= 0) { units = units.filter(u => u.id !== e.id); } } }
        const uIdx = units.findIndex(u => u.id === unit.id); if (uIdx >= 0) units[uIdx] = { ...units[uIdx], abilityCooldownLeft: 4 }; log.push({ turn: state.turn, msg: `▸ 🚁 مروحية عدو: قصف جوي!`, type: 'attack' }); continue;
      }
    }
    const tryAttack = () => {
      const currentUnit = units.find(u => u.id === unit.id); if (!currentUnit || currentUnit.attacked) return false;
      if (state.ceasefireActive) return false;
      const eTargets = enemies.filter(e => hexDist(currentUnit.col, currentUnit.row, e.col, e.row) <= currentUnit.range + (aiTactic?.special === 'siege' ? 1 : 0));
      if (currentUnit.type === 'commando') eTargets.sort((a, b) => UNIT_DEFS[b.type].cost - UNIT_DEFS[a.type].cost); else eTargets.sort((a, b) => a.hp - b.hp);
      for (const target of eTargets) {
        const aP = AI_PERSONALITIES[state.aiPersonality || 'balanced']; let aiDmg = calcDamage(currentUnit, target, aiTactic, null, state.grid, state.weather, ai.morale, state.player.morale, false);
        aiDmg = Math.round(aiDmg * (1 + aP.atkBonus) * diffMult);
        if (Math.random() < missChance(currentUnit.type)) { aiDmg = 0; } else if (Math.random() < critChance(currentUnit.type)) { aiDmg = Math.round(aiDmg * 1.5); }
        if (!checkCombineArms(currentUnit, units) || Math.random() > 0.5) {} else aiDmg = Math.round(aiDmg * 1.2);
        const tidx = units.findIndex(u => u.id === target.id);
        if (tidx >= 0) {
          let hp = units[tidx].hp - aiDmg; units[tidx] = { ...units[tidx], hp };
          log.push({ turn: state.turn, msg: `▸ ${UNIT_DEFS[currentUnit.type].nameAr} (عدو) هاجم -${aiDmg}`, type: 'attack' });
          if (hp <= 0) { units = units.filter(u => u.id !== target.id); log.push({ turn: state.turn, msg: `  ✗ دُمر!`, type: 'system' }); }
          // Terrain destruction by AI
          if (hp > 0 && (currentUnit.type === 'artillery' || currentUnit.type === 'rocket_artillery')) {
            const dTerrain = state.grid[target.col]?.[target.row]?.terrain;
            if (dTerrain && (dTerrain === 'urban' || dTerrain === 'forest' || dTerrain === 'road') && Math.random() < 0.4) {
              const newT = dTerrain === 'urban' ? 'ruins' as TerrainType : 'plains' as TerrainType;
              newGrid[target.col][target.row] = { ...newGrid[target.col][target.row], terrain: newT };
            }
          }
          // Counter damage
          if (hp > 0 && target.range >= hexDist(currentUnit.col, currentUnit.row, target.col, target.row) && target.type !== 'artillery') {
            const cDmg = calcDamage(target, currentUnit, playerTactic, null, state.grid, state.weather, state.player.morale, ai.morale, true);
            const uidx2 = units.findIndex(u => u.id === currentUnit.id); if (uidx2 >= 0) units[uidx2] = { ...units[uidx2], hp: Math.max(0, units[uidx2].hp - cDmg) };
          }
          const uidx3 = units.findIndex(u => u.id === currentUnit.id); if (uidx3 >= 0) units[uidx3] = { ...units[uidx3], attacked: true, abilityActive: false, abilityActiveTurns: 0 };
          if (currentUnit.type === 'missiles') units = units.filter(u => u.id !== currentUnit.id);
          return true;
        }
      }
      return false;
    };
    if (tryAttack()) continue;
    if (!unit.moved) {
      const moves = calcValidMoves(unit, state.grid, units, aiTactic, null);
      if (moves.length > 0) {
        let bestMove: [number, number] | null = null; let bestScore = -Infinity;
        for (const [mc, mr] of moves) {
          const minEd = Math.min(...enemies.map(e => hexDist(mc, mr, e.col, e.row)));
          const t = getTerrainAt(state.grid, mc, mr); let score = -minEd * 2 + TERRAIN_DEFS[t].defBonus * 15;
          if (unit.type === 'artillery' || unit.type === 'rocket_artillery') score -= minEd < 2 ? 100 : 0;
          if (unit.type === 'artillery' || unit.type === 'rocket_artillery') score += (minEd > 2 && minEd <= unit.range) ? 20 : 0;
          if (unit.hp < unit.maxHp * 0.5) score += (mc > unit.col ? 10 : -5);
          const destCell = state.grid[mc]?.[mr]; if (destCell?.strategicPoint && destCell.strategicOwner !== 'ai') score += 15;
          score += Math.random() * 3;
          if (score > bestScore) { bestScore = score; bestMove = [mc, mr]; }
        }
        if (bestMove) { const uidx = units.findIndex(u => u.id === unit.id); if (uidx >= 0) { units[uidx] = { ...units[uidx], col: bestMove[0], row: bestMove[1], moved: true }; const destSPCell = newGrid[bestMove[0]]?.[bestMove[1]]; if (destSPCell?.strategicPoint && destSPCell.strategicOwner !== 'ai') { newGrid[bestMove[0]][bestMove[1]] = { ...destSPCell, strategicOwner: 'ai' as Owner, garrisonTurn: state.turn }; } tryAttack(); } }
      }
    }
  }
  // Deploy
  const personality = AI_PERSONALITIES[state.aiPersonality || 'balanced']; const deployable: UnitType[] = personality.deployBias;
  const aiBarracksCount = state.grid.flat().filter(c => c.building === 'barracks' && c.buildingOwner === 'ai').length;
  const maxDeploys = 2 + aiBarracksCount * 2;
  for (let d = 0; d < maxDeploys; d++) { if (ai.supply < 10) break;
    const infCount = aiUnits.filter(u => u.type === 'infantry').length;
    let type: UnitType = infCount < 3 ? 'infantry' : deployable[Math.floor(Math.random() * deployable.length)];
    const cost = UNIT_DEFS[type].cost; if (ai.supply < cost) continue;
    // Deploy unit - naval on water, air anywhere, others on land
    const isNaval = isNavalUnit(type); const isAir = isAirUnit(type);
    let deployed = false;
    for (let c = 13; c >= 11 && !deployed; c--) { for (let r = 0; r < ROWS && !deployed; r++) {
      const terrain = state.grid[c][r].terrain;
      const validTerrain = isNaval ? terrain === 'water' || terrain === 'beach' : isAir ? terrain !== 'mountain' : terrain !== 'water' && terrain !== 'mountain';
      if (!getUnitAt(units, c, r) && validTerrain) {
        const nearBarracks = getNeighbors(c, r).some(([nc, nr]) => { const cell = state.grid[nc]?.[nr]; return cell?.building === 'barracks' && cell.buildingOwner === 'ai'; });
        const discount = nearBarracks ? 0.75 : 1; const finalCost = Math.floor(cost * discount);
        if (ai.supply < finalCost) continue;
        units.push({ ...createUnit(Date.now() + d, type, 'ai', c, r), moved: true, attacked: true }); ai = { ...ai, supply: ai.supply - finalCost }; deployed = true;
      }
    }}
  }
  // AI builds
  const aiEngineers = units.filter(u => u.owner === 'ai' && u.type === 'engineers' && u.hp > 0);
  if (aiEngineers.length > 0 && ai.supply >= 15) { for (const engineer of aiEngineers) { if (ai.supply < 15) break; const neighbors = getNeighbors(engineer.col, engineer.row); const buildable = neighbors.filter(([nc, nr]) => { const cell = newGrid[nc]?.[nr]; return cell && !cell.building && !getUnitAt(units, nc, nr) && cell.terrain !== 'water' && cell.terrain !== 'mountain' && nc >= 6; }); if (buildable.length === 0) continue; const options = BUILDABLE_TYPES.filter(t => ai.supply >= BUILDING_COSTS[t]); const bType = options[Math.floor(Math.random() * options.length)] || 'bunker'; const bCost = BUILDING_COSTS[bType]; if (ai.supply < bCost) continue; const [bc, br] = buildable[Math.floor(Math.random() * buildable.length)]; newGrid[bc][br] = { ...newGrid[bc][br], building: bType, buildingOwner: 'ai' as Owner }; ai = { ...ai, supply: ai.supply - bCost }; log.push({ turn: state.turn, msg: `▸ العدو بنى ${BUILDING_DEFS[bType].nameAr}`, type: 'system' }); break; } }
  return { units, log, ai, playerSupplyDelta, grid: newGrid };
}
function handleAIComplete(state: GameState): GameState {
  const { units: newUnits, log: aiLog, ai: newAi, playerSupplyDelta, grid: aiNewGrid } = aiExecuteTurn(state);
  const towerResult = processDefenseTowerAttacks({ ...state, grid: aiNewGrid }, newUnits, aiLog);
  let finalUnits = towerResult.units.filter(u => !u.isFake || u.fakeTurns > 0).map(u => u.isFake ? { ...u, fakeTurns: u.fakeTurns - 1 } : u);
  finalUnits = finalUnits.map(u => { if (u.hp <= 0 || u.isFake) return u; const cell = aiNewGrid[u.col]?.[u.row]; if (cell?.building === 'hospital' && cell.buildingOwner === u.owner) { const hLv = cell.buildingLevel || 1; return { ...u, hp: Math.min(u.maxHp, u.hp + (hLv >= 3 ? 35 : hLv >= 2 ? 25 : 15)) }; } for (const [nc, nr] of getNeighbors(u.col, u.row)) { const n = aiNewGrid[nc]?.[nr]; if (n?.building === 'hospital' && n.buildingOwner === u.owner) { const hLv = n.buildingLevel || 1; return { ...u, hp: Math.min(u.maxHp, u.hp + (hLv >= 3 ? 35 : hLv >= 2 ? 25 : 15)) }; } } return u; });
  // Process status effects
  const statusResult = processStatusEffects(finalUnits, [...state.log, ...towerResult.log], state.turn);
  finalUnits = statusResult.units;
  // Apply terrain status effects
  finalUnits = applyTerrainStatusEffects({ ...state, grid: aiNewGrid }, finalUnits);
  const updated = finalUnits.map(u => { let nu = { ...u }; if (nu.abilityCooldownLeft > 0 && !nu.abilityActive) nu.abilityCooldownLeft--; if (nu.abilityActiveTurns > 0) { nu.abilityActiveTurns--; if (nu.abilityActiveTurns <= 0) { nu.abilityActive = false; nu.entrenched = false; } } if (nu.abilityActive && nu.abilityActiveTurns <= 0) { nu.abilityCooldownLeft = UNIT_DEFS[nu.type].abilityCooldown; nu.abilityActive = false; } return nu; });
  // Ceasefire countdown
  let ceasefireActive = state.ceasefireActive;
  const aiAlive = finalUnits.filter(u => u.owner === 'ai' && !u.isFake && u.hp > 0).length;
  const playerAlive = finalUnits.filter(u => u.owner === 'player' && !u.isFake && u.hp > 0).length;
  const w = checkVictoryCondition(state, finalUnits);
  if (w) {
    const endState: GameState = { ...state, units: finalUnits, ai: newAi, animating: false, log: [...state.log, ...statusResult.log, ...towerResult.log], winner: w, screen: 'game_over', playerUnitsKilled: state.playerUnitsKilled, aiUnitsKilled: state.aiUnitsKilled, playerUsedPincer: state.playerUsedPincer, playerUsedBlitzkrieg: state.playerUsedBlitzkrieg, playerUsedGuerrilla: state.playerUsedGuerrilla, playerUsedSiege: state.playerUsedSiege, artilleryKills: state.artilleryKills, playerLostNoUnits: state.playerLostNoUnits, tacticsUsed: state.tacticsUsed, totalDamageDealt: state.totalDamageDealt, totalDamageReceived: state.totalDamageReceived, ceasefireActive, achievements: state.achievements };
    if (w === 'player') { const achs = checkAchievements(endState); return { ...endState, achievements: achs }; }
    return endState;
  }
  const newTurn = state.turn + 1;
  const pTactic = TACTICS.find(t => t.id === state.playerTactic); let aiSupplyRed = 0;
  if (pTactic?.special === 'attrition') aiSupplyRed += 10; if (pTactic?.special === 'scorched_earth') aiSupplyRed += 20;
  // Ceasefire check
  if (state.ceasefireActive && state.turn >= 2) { /* will be decremented below */ }
  if (ceasefireActive) { if (state.turn % 2 === 0) ceasefireActive = false; } // End after 2 turns
  let weather = state.weather; let wTurnsLeft = state.weatherTurnsLeft - 1;
  if (wTurnsLeft <= 0) { weather = getWeather(); wTurnsLeft = 3; }
  let pFactoryBonus = 0, aFactoryBonus = 0;
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { const cell = aiNewGrid[c][r]; if (cell.building === 'factory') { const fLv = cell.buildingLevel || 1; const fSup = fLv >= 3 ? 12 : fLv >= 2 ? 8 : 5; const unit = getUnitAt(finalUnits, c, r); if (unit?.owner === 'player') pFactoryBonus += fSup; if (unit?.owner === 'ai') aFactoryBonus += fSup; } if (cell.building === 'ammo_depot') { const aLv = cell.buildingLevel || 1; const aSup = aLv >= 3 ? 25 : aLv >= 2 ? 18 : 12; if (cell.buildingOwner === 'player') pFactoryBonus += aSup; if (cell.buildingOwner === 'ai') aFactoryBonus += aSup; } }
  const newGrid = aiNewGrid.map(col => col.map(cell => { const u = getUnitAt(finalUnits, cell.col, cell.row); if (u && cell.building) return { ...cell, buildingOwner: u.owner }; return cell; }));
  let pMorale = state.player.morale; let aMorale = state.ai.morale;
  pMorale += pMorale > 50 ? 3 : 5; aMorale += aMorale > 50 ? 3 : 5;
  if (weather === 'rain') { pMorale -= 2; aMorale -= 2; } if (weather === 'storm') { pMorale -= 5; aMorale -= 5; }
  pMorale = Math.max(0, Math.min(100, pMorale)); aMorale = Math.max(0, Math.min(100, aMorale));
  const moraleEvent = getMoraleEvent(); const moraleEventLog: LogEntry[] = [];
  if (moraleEvent) { pMorale = Math.max(0, Math.min(100, pMorale + moraleEvent.playerEffect)); aMorale = Math.max(0, Math.min(100, aMorale + moraleEvent.aiEffect)); moraleEventLog.push({ turn: newTurn, msg: moraleEvent.msg, type: 'system' }); }
  const pLeveled = updated.map(u => { if (u.owner === 'player' && state.player.training >= 20 && u.level < 5) { return { ...u, level: u.level + 1, atk: u.atk + 2, def: u.def + 1 }; } return u; });
  let stormDmg = weather === 'storm' ? pLeveled.map(u => { if (Math.random() > 0.8 && !u.isFake) return { ...u, hp: Math.max(1, u.hp - 5) }; return u; }) : pLeveled;
  // Reinforcements
  const reinforcementLog: LogEntry[] = [];
  if (newTurn % 5 === 0 && newTurn > 1) {
    const playerSpawns = findSafeSpawn(newGrid, stormDmg, [0, 3], 'player');
    if (playerSpawns.length > 0) { const pTypes: UnitType[] = ['infantry', 'armor', 'medics']; const pType = pTypes[Math.floor(Math.random() * pTypes.length)]; const [pc, pr] = playerSpawns[Math.floor(Math.random() * playerSpawns.length)]; stormDmg = [...stormDmg, { ...createUnit(Date.now() + 9000, pType, 'player', pc, pr), moved: true, attacked: true }]; reinforcementLog.push({ turn: newTurn, msg: `📢 إمداد! ${UNIT_DEFS[pType].nameAr}!`, type: 'system' }); }
    const aiSpawns = findSafeSpawn(newGrid, stormDmg, [10, 13], 'ai');
    if (aiSpawns.length > 0) { const aTypes: UnitType[] = ['infantry', 'armor', 'medics']; const aType = aTypes[Math.floor(Math.random() * aTypes.length)]; const [ac, ar] = aiSpawns[Math.floor(Math.random() * aiSpawns.length)]; stormDmg = [...stormDmg, { ...createUnit(Date.now() + 9001, aType, 'ai', ac, ar), moved: true, attacked: true }]; reinforcementLog.push({ turn: newTurn, msg: `📢 إمداد العدو!`, type: 'system' }); }
  }
  const revealed = state.revealed.map(r => [...r]);
  const visionRange = weather === 'fog' ? 1 : 2;
  stormDmg.filter(u => u.owner === 'player' && !u.isFake && u.hp > 0).forEach(u => revealAround(newGrid, revealed, u.col, u.row, u.type === 'cavalry' || u.type === 'scouts' ? visionRange + 1 : visionRange));
  const aiNewTactic = aiSelectTactic({ ...state, units: stormDmg, turn: newTurn });
  let pStrategicSupply = 0, aStrategicSupply = 0, pStrategicTraining = 0, aStrategicTraining = 0;
  const strategicLog: LogEntry[] = [];
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { const cell = aiNewGrid[c][r]; if (!cell.strategicPoint || !cell.strategicOwner) continue; const spDef = STRATEGIC_POINT_DEFS[cell.strategicPoint]; if (cell.strategicOwner === 'player') { if (spDef.bonus === 'supply') pStrategicSupply += 8; else if (spDef.bonus === 'training') pStrategicTraining += 10; else if (spDef.bonus === 'gold') { pStrategicSupply += 15; pStrategicTraining += 5; } else if (spDef.bonus === 'command') pStrategicSupply += 3; } else if (cell.strategicOwner === 'ai') { if (spDef.bonus === 'supply') aStrategicSupply += 8; else if (spDef.bonus === 'training') aStrategicTraining += 10; else if (spDef.bonus === 'gold') { aStrategicSupply += 15; aStrategicTraining += 5; } else if (spDef.bonus === 'command') aStrategicSupply += 3; } }
  // Domination victory tracking
  const totalSP = aiNewGrid.flat().filter(c => c.strategicPoint).length;
  const playerSPCount = aiNewGrid.flat().filter(c => c.strategicPoint && c.strategicOwner === 'player').length;
  const aiSPCount = aiNewGrid.flat().filter(c => c.strategicPoint && c.strategicOwner === 'ai').length;
  let dominationPlayerTurns = state.dominationPlayerTurns;
  let dominationAiTurns = state.dominationAiTurns;
  if (totalSP > 0) {
    const threshold = Math.ceil(totalSP * 0.75);
    if (playerSPCount >= threshold) dominationPlayerTurns++; else dominationPlayerTurns = 0;
    if (aiSPCount >= threshold) dominationAiTurns++; else dominationAiTurns = 0;
  }
  const profile = loadProfile(); let extraSupplyPerk = profile.unlockedPerks.includes('extra_supply') ? 5 : 0;
  let supplyMasterMult = profile.unlockedPerks.includes('supply_master') ? 1.5 : 1;
  const supplyGain = Math.floor((10 + pFactoryBonus + pStrategicSupply + extraSupplyPerk) * supplyMasterMult);
  const aPersonality = AI_PERSONALITIES[state.aiPersonality || 'balanced'];
  const aiSupplyGain = 10 + aFactoryBonus + aStrategicSupply + (state.difficulty === 'hard' ? 5 : state.difficulty === 'legendary' ? 10 : 0) + aPersonality.supplyBonus;
  pMorale += aiNewGrid.flat().filter(c => c.strategicPoint && c.strategicOwner === 'player').length * 3; aMorale += aiNewGrid.flat().filter(c => c.strategicPoint && c.strategicOwner === 'ai').length * 3;
  pMorale = Math.max(0, Math.min(100, pMorale)); aMorale = Math.max(0, Math.min(100, aMorale));
  const pTrainingGain = state.player.training >= 20 ? state.player.training - 20 + 5 : state.player.training + 5 + pStrategicTraining;
  const nextLog = [...state.log, ...statusResult.log, ...towerResult.log, ...strategicLog, ...moraleEventLog, ...reinforcementLog, { turn: newTurn, msg: `═══ الدور ${newTurn} ═══`, type: 'info' }, { turn: newTurn, msg: `📦 +${supplyGain} إمداد | ${WEATHER_NAMES[weather].icon} ${WEATHER_NAMES[weather].name}`, type: 'info' }];
  // Check domination victory
  if (state.victoryType === 'domination' && dominationPlayerTurns >= 3) { return { ...state, units: stormDmg, grid: newGrid, revealed, ai: newAi, animating: false, winner: 'player', screen: 'game_over', log: nextLog, phase: 'planning' as GamePhase, turn: newTurn, player: { ...state.player, supply: Math.max(0, state.player.supply + supplyGain + playerSupplyDelta), morale: pMorale, training: pTrainingGain }, weather, weatherTurnsLeft: wTurnsLeft, dominationPlayerTurns, toasts: [...state.toasts, { id: `t_${Date.now()}`, msg: `🏆 انتصار بالسيطرة!`, icon: '🏆', time: Date.now() }] }; }
  if (state.victoryType === 'domination' && dominationAiTurns >= 3) { return { ...state, units: stormDmg, grid: newGrid, revealed, ai: newAi, animating: false, winner: 'ai', screen: 'game_over', log: nextLog, phase: 'planning' as GamePhase, turn: newTurn }; }
  // Diplomacy event
  const diplomacyEvent = generateDiplomacyEvent({ ...state, turn: newTurn, units: stormDmg });
  // Phase transition
  const phaseTransition = `═══ الدور ${newTurn} ═══`;
  return {
    ...state, units: stormDmg, grid: newGrid, revealed, effects: [...state.effects, ...towerResult.effects.filter(e => Date.now() - e.startTime < 1200)],
    ai: { ...newAi, supply: Math.max(0, newAi.supply + aiSupplyGain - aiSupplyRed), training: newAi.training >= 20 ? newAi.training - 20 + 5 + aStrategicTraining : newAi.training + 5 + aStrategicTraining, morale: aMorale },
    phase: 'planning' as GamePhase, turn: newTurn, animating: false,
    playerTactic: null, secondaryPlayerTactic: null, aiTactic: aiNewTactic, tacticId: null, secondaryTacticId: null,
    selectedId: null, validMoves: [], validAttacks: [], deployMode: null, buildMode: null, validBuildPlacements: [], playerBuildCount: 0, playerDeployCount: 0, log: nextLog,
    player: { supply: Math.max(0, state.player.supply + supplyGain + playerSupplyDelta), morale: pMorale, training: pTrainingGain },
    weather, weatherTurnsLeft: wTurnsLeft, previousState: null, ceasefireActive,
    dominationPlayerTurns, dominationAiTurns, diplomacyEvent, phaseTransition, toasts: state.toasts,
  };
}
function checkAchievements(state: GameState): string[] {
  const a = [...state.achievements]; const add = (id: string) => { if (!a.includes(id)) a.push(id); };
  if (state.playerUsedPincer >= 3) add('victor_cannae');
  if (state.playerUsedBlitzkrieg) add('rommel');
  if (state.playerUsedGuerrilla) add('grey_wolf');
  if (state.playerLostNoUnits) add('war_hero');
  if (state.difficulty === 'legendary') add('war_master');
  if (state.artilleryKills >= 5) add('artillery_master');
  if (state.playerUsedSiege) add('siege_master');
  if (state.victoryType === 'survival' && state.winner === 'player') add('survivor');
  try { if (typeof window !== 'undefined') localStorage.setItem('warGame_achievements', JSON.stringify(a)); } catch {}
  return a;
}
// ==================== COMPONENTS ====================
function MainMenu({ onStart, onHelp, onLoad, onProfile, onMapEditor, profile }: { onStart: (d: Difficulty) => void; onHelp: () => void; onLoad: () => void; onProfile: () => void; onMapEditor: () => void; profile: PlayerProfile }) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const difficulties: { key: Difficulty; name: string; desc: string; color: string }[] = [
    { key: 'easy', name: 'جندي', desc: 'سهل - للمبتدئين', color: '#27ae60' },
    { key: 'normal', name: 'قائد', desc: 'عادي - تحدي متوازن', color: '#f39c12' },
    { key: 'hard', name: 'استراتيجي', desc: 'صعب - AI ذكي', color: '#e67e22' },
    { key: 'legendary', name: 'أستاذ الحرب', desc: 'أسطوري - للخبراء', color: '#e74c3c' },
  ];
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #53d769 1px, transparent 1px), radial-gradient(circle at 75% 75%, #e94560 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      <div className="relative z-10 text-center space-y-6 p-4">
        <div className="space-y-2"><div className="text-6xl mb-2">⚔️</div><h1 className="text-4xl md:text-5xl font-bold text-white" style={{ textShadow: '0 0 30px rgba(233,69,96,0.5)' }}>معركة الاستراتيجية</h1><p className="text-lg text-gray-300">حرب تكتيكية باستخدام استراتيجيات عسكرية حقيقية</p></div>
        <div className="space-y-3">
          <div className="text-white font-bold text-lg mb-2">🎮 اختر مستوى الصعوبة</div>
          <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
            {difficulties.map(d => (<button key={d.key} onClick={() => { setSelectedDifficulty(d.key); onStart(d.key); }} className="py-3 px-4 rounded-lg text-white font-bold transition-all hover:scale-105 cursor-pointer border-2" style={{ borderColor: d.color, background: selectedDifficulty === d.key ? `${d.color}44` : `${d.color}22` }}><div className="text-lg">{d.name}</div><div className="text-xs text-gray-300">{d.desc}</div></button>))}
          </div>
          <div className="flex gap-2 justify-center mt-4 flex-wrap">
            <button onClick={onHelp} className="py-2 px-4 rounded-lg text-gray-200 border border-gray-500 hover:bg-white/5 cursor-pointer text-sm">📖 كيف تلعب</button>
            <button onClick={onLoad} className="py-2 px-4 rounded-lg text-gray-200 border border-gray-500 hover:bg-white/5 cursor-pointer text-sm">📂 تحميل لعبة</button>
            <button onClick={onProfile} className="py-2 px-4 rounded-lg text-gray-200 border border-yellow-500 hover:bg-white/5 cursor-pointer text-sm">👤 {profile.rank} Lv{profile.level}</button>
            <button onClick={onMapEditor} className="py-2 px-4 rounded-lg text-purple-200 border border-purple-500 hover:bg-white/5 cursor-pointer text-sm">🗺️ محرر الخرائط</button>
          </div>
        </div>
        <div className="mt-4 text-gray-500 text-xs space-y-1">
          <p>⚔️ 17 وحدة | 🗺️ 7 خرائط | 🏗️ مباني | 🌦️ طقس | 🏛️ نقاط استراتيجية</p>
          <p>🚁 وحدات جوية وبحرية | 🗺️ محرر خرائط | 🏆 4 شروط فوز | 🎭 أحداث دبلوماسية</p>
          <p>🏰 12 تكتيك | 🎯 قدرات خاصة | 🏆 إنجازات | 🏗️ بناء | ⭐ ارتقاء | 🚁✈️🚢🛳️ وحدات جديدة</p>
        </div>
      </div>
    </div>
  );
}
function CampaignScreen({ onSelect, onBack, profile }: { onSelect: (m: CampaignMission) => void; onBack: () => void; profile: PlayerProfile }) {
  const [progress] = useState(() => { try { const s = localStorage.getItem('warGame_campaign'); return s ? JSON.parse(s) : { highestCompleted: 0, stars: {} as Record<number, number> }; } catch { return { highestCompleted: 0, stars: {} }; } });
  return (
    <div className="min-h-screen p-4 md:p-6 overflow-y-auto" dir="rtl" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      <div className="max-w-3xl mx-auto space-y-4"><div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-white">⚔️ الحملة</h1><button onClick={onBack} className="py-2 px-4 rounded-lg bg-gray-700 text-white hover:bg-gray-600 cursor-pointer text-sm">→ رجوع</button></div>
        {CAMPAIGN_MISSIONS.map(m => { const unlocked = m.id === 1 || progress.highestCompleted >= m.id - 1; const completed = progress.highestCompleted >= m.id; return (<button key={m.id} onClick={() => unlocked ? onSelect(m) : undefined} disabled={!unlocked} className={`w-full p-4 rounded-xl text-right cursor-pointer transition-all border-2 ${unlocked ? 'hover:scale-[1.02]' : 'opacity-40 cursor-not-allowed'}`} style={{ background: '#16213e', borderColor: completed ? '#27ae60' : unlocked ? '#f39c12' : '#333' }}><div className="flex items-center justify-between"><div><div className="text-white font-bold">{m.nameAr}</div><div className="text-gray-400 text-xs mt-1">{m.desc}</div><div className="flex gap-2 mt-2 text-xs"><span className="px-2 py-0.5 rounded" style={{ background: '#0f3460', color: '#f39c12' }}>{MAP_PRESET_INFO[m.mapPreset].icon} {MAP_PRESET_INFO[m.mapPreset].name}</span><span className="px-2 py-0.5 rounded" style={{ background: '#0f3460', color: '#e74c3c' }}>{{ easy: 'سهل', normal: 'عادي', hard: 'صعب', legendary: 'أسطوري' }[m.difficulty]}</span></div></div><div className="text-left">{completed ? <div className="text-green-400 text-2xl">✅</div> : unlocked ? <div className="text-yellow-400 text-2xl">🔓</div> : <div className="text-gray-600 text-2xl">🔒</div>}</div></div></button>); })}
      </div>
    </div>
  );
}
function DailyChallengeScreen({ onStart, onBack }: { onStart: (d: Difficulty, p: MapPreset, a: AIPersonality) => void; onBack: () => void }) {
  const daily = getDailyChallenge();
  const [completed] = useState(() => { try { const d = localStorage.getItem('warGame_dailyCompleted'); const today = new Date(); return d === `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`; } catch { return false; } });
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" dir="rtl" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      <div className="max-w-md w-full space-y-4 text-center"><div className="text-6xl">🎯</div><h1 className="text-3xl font-bold text-yellow-400">التحدي اليومي</h1>
        <div className="p-4 rounded-xl" style={{ background: '#16213e', border: '2px solid #f39c12' }}><div className="text-white font-bold mb-2">إعدادات اليوم</div><div className="space-y-1 text-gray-300 text-sm"><p>🗺️ {MAP_PRESET_INFO[daily.mapPreset].icon} {MAP_PRESET_INFO[daily.mapPreset].name}</p><p>⚡ {{ easy: 'سهل', normal: 'عادي', hard: 'صعب', legendary: 'أسطوري' }[daily.difficulty]}</p><p>{AI_PERSONALITIES[daily.aiPersonality].icon} {AI_PERSONALITIES[daily.aiPersonality].nameAr}</p><p className="text-yellow-400 font-bold">🏆 +{daily.bonusXP} XP</p></div></div>
        {completed ? <div className="p-3 rounded-lg text-green-400" style={{ background: '#16213e' }}>✅ أكملت تحدي اليوم!</div> : <button onClick={() => onStart(daily.difficulty, daily.mapPreset, daily.aiPersonality)} className="w-full py-3 rounded-lg text-lg font-bold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #f39c12, #e67e22)' }}>⚔️ ابدأ</button>}
        <button onClick={onBack} className="py-2 px-6 rounded-lg text-gray-300 border border-gray-600 hover:bg-white/5 cursor-pointer text-sm">→ رجوع</button>
      </div>
    </div>
  );
}
function MapSelectScreen({ onSelect, onBack, difficulty }: { onSelect: (preset: MapPreset, mapSize?: MapSize, victoryType?: VictoryType) => void; onBack: () => void; difficulty: Difficulty }) {
  const [selectedSize, setSelectedSize] = useState<MapSize>('medium');
  const [selectedVictory, setSelectedVictory] = useState<VictoryType>('annihilation');
  const presets: MapPreset[] = ['classic', 'desert_storm', 'mountain_pass', 'island_hopping', 'forest_ambush', 'urban_warfare', 'river_crossing'];
  const terrainPreview: Record<MapPreset, { colors: string[] }> = {
    classic: { colors: ['#4a6741', '#1a5276', '#8b7355', '#2d5a27', '#c2a83e'] }, desert_storm: { colors: ['#c2a83e', '#48c9b0', '#7f8c8d', '#8b7355', '#8e8e8e'] }, mountain_pass: { colors: ['#8b7355', '#2d5a27', '#4a6741', '#8e8e8e', '#4a6741'] },
    island_hopping: { colors: ['#1a5276', '#4a6741', '#f5cba7', '#2d5a27', '#1a5276'] }, forest_ambush: { colors: ['#2d5a27', '#3d5c3a', '#4a6741', '#7f8c8d', '#8e8e8e'] },
    urban_warfare: { colors: ['#5d6d7e', '#8e8e8e', '#2d5a27', '#7f8c8d', '#3d5c3a'] }, river_crossing: { colors: ['#4a6741', '#1a5276', '#8e8e8e', '#5d6d7e', '#2d5a27'] },
  };
  // Load custom maps
  const [customMaps, setCustomMaps] = useState<{ name: string; grid: HexCell[][] }[]>([]);
  useEffect(() => { try { const d = localStorage.getItem('warGame_customMaps'); if (d) setCustomMaps(JSON.parse(d)); } catch {} }, []);
  return (
    <div className="min-h-screen p-4 md:p-6 overflow-y-auto" dir="rtl" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-white">🗺️ اختر الخريطة</h1><button onClick={onBack} className="py-2 px-4 rounded-lg bg-gray-700 text-white hover:bg-gray-600 cursor-pointer text-sm">→ رجوع</button></div>
        <div className="text-gray-400 text-sm">الصعوبة: {{ easy: 'جندي', normal: 'قائد', hard: 'استراتيجي', legendary: 'أستاذ الحرب' }[difficulty]}</div>
        <div className="flex gap-2 mb-2">
          {(['small', 'medium', 'large'] as MapSize[]).map(sz => (<button key={sz} onClick={() => setSelectedSize(sz)} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold cursor-pointer border-2 transition-all ${selectedSize === sz ? 'scale-105' : ''}`} style={{ borderColor: selectedSize === sz ? '#f39c12' : '#333', background: selectedSize === sz ? '#f39c1233' : '#16213e', color: selectedSize === sz ? '#f39c12' : '#999' }}>{MAP_SIZES[sz].icon} {MAP_SIZES[sz].nameAr} ({MAP_SIZES[sz].cols}×{MAP_SIZES[sz].rows})</button>))}
        </div>
        <div className="p-3 rounded-lg mb-2" style={{ background: '#16213e' }}>
          <div className="text-white font-bold text-sm mb-2">🏆 شرط الفوز:</div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(VICTORY_DEFS) as [string, { nameAr: string; icon: string; desc: string }][]).map(([key, v]) => (
              <button key={key} onClick={() => setSelectedVictory(key as VictoryType)} className={`p-2 rounded-lg text-xs text-right cursor-pointer border-2 transition-all ${selectedVictory === key ? 'scale-105' : ''}`} style={{ borderColor: selectedVictory === key ? '#f39c12' : '#333', background: selectedVictory === key ? '#f39c1233' : '#0d1117' }}>
                <div className="text-white font-bold">{v.icon} {v.nameAr}</div><div className="text-gray-400">{v.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {presets.map(preset => { const info = MAP_PRESET_INFO[preset]; const preview = terrainPreview[preset]; return (
            <button key={preset} onClick={() => onSelect(preset, selectedSize, selectedVictory)} className="rounded-xl p-4 text-right cursor-pointer transition-all hover:scale-105 border-2" style={{ background: '#16213e', borderColor: info.color + '66' }}>
              <div className="flex items-center gap-2 mb-2"><span className="text-2xl">{info.icon}</span><div><div className="text-white font-bold text-sm">{info.name}</div><div className="text-gray-400" style={{ fontSize: '10px' }}>{info.difficulty}</div></div></div>
              <div className="text-gray-300 text-xs mb-3 leading-relaxed">{info.desc}</div>
              <div className="flex gap-0.5 rounded overflow-hidden h-4">{preview.colors.map((c, i) => (<div key={i} className="flex-1" style={{ background: c }} />))}</div>
            </button>
          ); })}
        </div>
        {customMaps.length > 0 && (
          <div className="p-3 rounded-lg" style={{ background: '#16213e', border: '1px solid #9b59b6' }}>
            <div className="text-purple-400 font-bold text-sm mb-2">🗺️ خرائط مخصصة</div>
            <div className="space-y-2">
              {customMaps.map((m, i) => (<button key={i} onClick={() => onSelect('classic' as MapPreset, selectedSize, selectedVictory)} className="w-full p-2 rounded-lg text-xs text-right cursor-pointer border border-purple-500 hover:bg-white/5" style={{ background: '#0d1117' }}>🗺️ {m.name}</button>))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function HowToPlay({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [tutorialGame, setTutorialGame] = useState(false);
  const tutorialSteps = [
    { title: '🎯 مرحباً!', content: 'مرحباً بك في معركة الاستراتيجية! هذا الدرس سيعلمك أساسيات اللعبة خطوة بخطوة.', icon: '🎮' },
    { title: '👥 الوحدات', content: 'لكل وحدة قدرات مختلفة. المشاة رخيصة لكن متعددة، والدروع قوية ومكلفة عالية. اختر بحكمة حسب الوضع.', icon: '🗡️' },
    { title: '🚶 الحركة', content: 'انقر على وحدة ثم انقر على وجهة خضراء للتحرك. كل وحدة لها مدى حركة محدود. الفرسان أسرع الوحدات!', icon: '🚶' },
    { title: '⚔️ الهجوم', content: 'بعد التحرك، انقر على عدو (أحمر) للهجوم. شاهد المقارنة وقوّر الهجوم. الهجوم المضاد قد يضر!', icon: '⚔️' },
    { title: '⚡ القدرات الخاصة', content: 'كل وحدة لها قدرة خاصة! استخدمها بذكاء. بعض القدرات تهاجم أعداء متعددين، وأخرى تعزز الدفاع.', icon: '⚡' },
    { title: '📋 التخطيط', content: 'في بداية كل دور اختر تكتيك عسكري. التكتيك يمنح مكافآت مختلفة لجميع الوحدات.', icon: '📋' },
    { title: '🏗️ البناء', content: 'المهندسين يمكنهم بناء مباني عسكرية بجانب مواقع. المباني تعطي مكافآت دائمة!', icon: '🏗️' },
    { title: '🛡️ الدفاع', content: 'حفر الخنادق والتحصين مهمان! التضاريس والطقس تؤثر على القتال. استخدمها لصالحك!', icon: '🛡️' },
    { title: '🚁✈️🚢🛳️ وحدات جديدة', content: 'الوحدات الجوية (مروحية، طائرة مقاتلة) تتحرك فوق كل شيء! السفن البحرية تتحرك على الماء فقط. سفينة النقل تنشر وحدات!', icon: '🚁' },
    { title: '🔥❄️☠️💫 تأثيرات حالة', content: 'الوحدات يمكن أن تحترق أو تتجمد أو تُسمم! تأثيرات الحالة تظهر بجانب الصحة.', icon: '🔥' },
    { title: '🏆 شروط فوز مختلفة', content: 'اختر بين الإبادة، اقتحام المقر، السيطرة، أو الصمود! كل وضع يحتاج استراتيجية مختلفة.', icon: '🏆' },
  ];
  if (tutorialGame) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" dir="rtl" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      <div className="max-w-md w-full space-y-4 text-center"><div className="text-5xl">{tutorialSteps[step].icon}</div>
        <h2 className="text-2xl font-bold text-white">{tutorialSteps[step].title}</h2>
        <p className="text-gray-300 leading-relaxed">{tutorialSteps[step].content}</p>
        <div className="flex gap-2 justify-center"><button onClick={() => setStep(Math.max(0, step - 1))} className="px-6 py-2 rounded-lg bg-gray-700 text-white cursor-pointer text-sm">→ السابق</button>
        <span className="px-4 py-2 text-yellow-400">{step + 1}/{tutorialSteps.length}</span>
        {step < tutorialSteps.length - 1 ? <button onClick={() => setStep(step + 1)} className="px-6 py-2 rounded-lg bg-green-700 text-white cursor-pointer text-sm">التالي ←</button> : <button onClick={onBack} className="px-6 py-2 rounded-lg bg-blue-700 text-white cursor-pointer text-sm">🎮 العب الآن!</button> }</div>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen p-4 md:p-6 overflow-y-auto" dir="rtl" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-white">📖 درس تفاعلي</h1><button onClick={onBack} className="py-2 px-4 rounded-lg bg-gray-700 text-white hover:bg-gray-600 cursor-pointer text-sm">→ رجوع</button></div>
        <button onClick={() => setTutorialGame(true)} className="w-full py-3 rounded-lg text-lg font-bold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #3498db, #2980b9)' }}>🎓 ابدأ الدرس التفاعلي</button>
      </div>
    </div>
  );
}
function GameOverScreen({ state, onRestart, onProfile }: { state: GameState; onRestart: () => void; onProfile: () => void }) {
  const isWin = state.winner === 'player';
  const stars = isWin ? (state.playerLostNoUnits ? 5 : state.totalDamageDealt > state.totalDamageReceived * 2 ? 4 : 3) : 0;
  const [profile, setProfile] = useState<PlayerProfile>(getDefaultProfile());
  const [xpAwarded, setXpAwarded] = useState(0);
  const [levelUp, setLevelUp] = useState(false);
  useEffect(() => { const p = loadProfile(); let xp = 0;
    if (isWin) { xp += 50; if (state.difficulty === 'hard') xp += 25; if (state.difficulty === 'legendary') xp += 50; if (state.playerLostNoUnits) xp += 30; } else { xp += 10; }
    xp += state.playerUnitsKilled * 5; xp += state.strategicPointsCaptured * 15; if (state.tacticsUsed.length >= 2) xp += 10;
    const prevLevel = p.level; let xpMult = 1;
    if (isWin && state.gameMode === 'daily') xpMult = 2; if (isWin && state.gameMode === 'campaign') xpMult = 1.5;
    const finalXp = Math.round(xp * xpMult); const newP = addXP(p, finalXp);
    if (isWin) { try { playSound('victory'); } catch {} } else { try { playSound('defeat'); } catch {} }
    if (isWin && state.gameMode === 'campaign' && state.campaignMission) { try { const prev = JSON.parse(localStorage.getItem('warGame_campaign') || '{"highestCompleted":0,"stars":{}}'); const st = state.playerLostNoUnits ? 3 : state.totalDamageDealt > state.totalDamageReceived * 2 ? 2 : 1; if (state.campaignMission > prev.highestCompleted) prev.highestCompleted = state.campaignMission; if ((prev.stars[state.campaignMission] || 0) < st) prev.stars[state.campaignMission] = st; localStorage.setItem('warGame_campaign', JSON.stringify(prev)); } catch {} }
    if (isWin && state.gameMode === 'daily') { try { const today = new Date(); localStorage.setItem('warGame_dailyCompleted', `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`); } catch {} }
    newP.totalGames++; newP.totalKills += state.playerUnitsKilled; newP.totalDamageDealt += state.totalDamageDealt; if (isWin) newP.totalWins++; else newP.totalLosses++;
    saveProfile(newP); setProfile(newP); setXpAwarded(finalXp); setLevelUp(newP.level > prevLevel);
    // Check new achievements
    if (isWin) { const achs = checkAchievements({ ...state, achievements: state.achievements }); if (achs.length > state.achievements.length) { const profile2 = loadProfile(); profile2.achievements = [...new Set([...profile2.achievements, ...achs])]; saveProfile(profile2); } }
  }, []);
  const victoryDesc = state.victoryType !== 'annihilation' ? VICTORY_DEFS[state.victoryType].nameAr : 'إبادة';
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      <div className="text-center space-y-4 p-6 rounded-2xl max-w-md w-full" style={{ background: '#16213e', border: `2px solid ${isWin ? '#53d769' : '#e94560'}` }}>
        <div className="text-6xl">{isWin ? '🏆' : '💀'}</div>
        <h1 className="text-3xl font-bold" style={{ color: isWin ? '#53d769' : '#e94560' }}>{isWin ? '🎉 انتصار!' : '💀 هزيمة!'}</h1>
        <div className="text-2xl">{'⭐'.repeat(stars)}{'☆'.repeat(5 - stars)}</div>
        <div className="text-gray-300 text-sm space-y-1"><p>📅 الدور: {state.turn} | {victoryDesc} | {isWin ? '🏆' : '💀'} {state.gameMode === 'campaign' ? '| ⚔️ حملة' : ''}</p><p>⚔️ وحدات دُمرت: {state.playerUnitsKilled} | وحدات خُسرت: {state.aiUnitsKilled}</p><p>💥 ضرر: {state.totalDamageDealt} | 🛡️ ضرر استُقبل: {state.totalDamageReceived}</p></div>
        <div className="p-3 rounded-lg" style={{ background: '#0d1117' }}><div className="text-yellow-400 font-bold text-sm mb-1">⭐ الخبرة</div><div className="text-lg text-yellow-300 font-bold">+{xpAwarded} XP</div><div className="text-xs text-gray-400">المستوى: {profile.level} | {profile.rank}</div><div className="w-full h-2 rounded-full bg-gray-700 mt-1"><div className="h-2 rounded-full bg-yellow-400" style={{ width: `${(profile.xp / profile.xpToNext) * 100}%` }} /></div>{levelUp && <div className="text-green-400 text-sm mt-1 font-bold">🎊 ارتقاء!</div>}</div>
        <div className="flex gap-2"><button onClick={onRestart} className="flex-1 py-3 px-4 rounded-lg text-lg font-bold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #e94560, #c0392b)' }}>🔄 مرة أخرى</button><button onClick={onProfile} className="flex-1 py-3 px-4 rounded-lg text-lg font-bold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #3498db, #2980b9)' }}>👤 الملف الشخصي</button></div>
      </div>
    </div>
  );
}
function GameHeader({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const phaseNames: Record<GamePhase, string> = { planning: '📋 التخطيط', movement: '🚶 الحركة', attack: '⚔️ الهجوم', ai_turn: '🤖 العدو' };
  const tactic = TACTICS.find(t => t.id === state.playerTactic); const w = WEATHER_NAMES[state.weather]; const profile = loadProfile();
  const playerSPCount = state.grid.flat().filter(c => c.strategicPoint && c.strategicOwner === 'player').length;
  const aiSPCount = state.grid.flat().filter(c => c.strategicPoint && c.strategicOwner === 'ai').length;
  const victoryInfo = state.victoryType !== 'annihilation' ? VICTORY_DEFS[state.victoryType] : null;
  return (
    <div className="p-2 rounded-lg mb-2 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ background: '#16213e', borderBottom: '2px solid #0f3460' }}>
      <div className="flex items-center gap-3 text-white flex-wrap">
        <span className="text-yellow-400" title={`${profile.rank} Lv${profile.level}`}>🎖️ <strong>Lv{profile.level}</strong></span>
        <span className="text-yellow-400">📅 <strong>{state.turn}</strong></span>
        <span className="text-blue-300">{w.icon} {w.name}</span>
        <span>📦 <strong className="text-yellow-400">{state.player.supply}</strong></span>
        <span>💪 <strong className={state.player.morale > 60 ? 'text-green-400' : state.player.morale > 30 ? 'text-yellow-400' : 'text-red-400'}>{state.player.morale}%</strong></span>
        <span className="text-gray-400" style={{ fontSize: '10px' }}>{MAP_PRESET_INFO[state.mapPreset].icon} {MAP_PRESET_INFO[state.mapPreset].name}</span>
        {playerSPCount > 0 && <span className="text-green-400">🏛️ {playerSPCount}</span>}
        {aiSPCount > 0 && <span className="text-red-400">🏛️ {aiSPCount}</span>}
        {victoryInfo && <span className="text-purple-400" title={`شرط الفوز: ${victoryInfo.desc}`}>{victoryInfo.icon}</span>}
        {state.ceasefireActive && <span className="text-cyan-400">🏳️ هدنة</span>}
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <button onClick={() => dispatch({ type: 'TOGGLE_SOUND' })} className="px-2 py-1 rounded text-white hover:bg-white/10 cursor-pointer" title="صوت">{state.soundEnabled ? '🔊' : '🔇'}</button>
        <button onClick={() => dispatch({ type: 'TOGGLE_STATS' })} className={`px-2 py-1 rounded text-white hover:bg-white/10 cursor-pointer ${state.showStats ? 'ring-1 ring-yellow-400' : ''}`} title="إحصائيات">📊</button>
        <button onClick={() => dispatch({ type: 'TOGGLE_MINIMAP' })} className={`px-2 py-1 rounded text-white hover:bg-white/10 cursor-pointer ${state.showMiniMap ? 'ring-1 ring-blue-400' : ''}`} title="خريطة مصغرة">🗺️</button>
        {state.aiPersonality && <span className="text-xs px-1 py-0.5 rounded" style={{ background: '#0f3460', fontSize: '10px' }}>{AI_PERSONALITIES[state.aiPersonality].icon}</span>}
        <div className="text-gray-300 px-2 py-1 rounded" style={{ background: '#0f3460' }}>{phaseNames[state.phase]}</div>
        {tactic && <div className="text-yellow-400 px-2 py-1 rounded" style={{ background: '#0f3460', fontSize: '10px' }}>{tactic.name}</div>}
      </div>
    </div>
  );
}
function MiniMap({ state }: { state: GameState }) {
  if (!state.showMiniMap) return null;
  const scale = 3;
  const w = COLS * scale; const h = ROWS * scale;
  return (
    <div className="absolute top-16 left-2 z-30 p-1 rounded-lg opacity-90 pointer-events-auto cursor-pointer" style={{ background: 'rgba(13,17,23,0.85)', border: '1px solid #0f3460', backdropFilter: 'blur(4px)' }}>
      <div className="text-white text-xs font-bold mb-1 text-center">🗺️</div>
      <div style={{ position: 'relative', width: w, height: h }}>
        {state.grid.map((col, ci) => col.map((cell, ri) => {
          const color = state.revealed[ci]?.[ri] ? TERRAIN_DEFS[cell.terrain].color : '#111';
          const unit = getUnitAt(state.units, ci, ri);
          let dotColor: string | null = null;
          if (unit && (unit.owner === 'player' || (unit.owner === 'ai' && state.revealed[ci]?.[ri])) && !unit.isFake) dotColor = unit.owner === 'player' ? '#27ae60' : '#e74c3c';
          return <div key={`${ci}-${ri}`} style={{ position: 'absolute', left: ci * scale, top: ri * scale, width: scale, height: scale, background: color }} />;
        }))}
        {state.units.filter(u => !u.isFake).map(u => {
          let color = u.owner === 'player' ? '#27ae60' : '#e74c3c';
          if (!state.revealed[u.col]?.[u.row]) color = 'transparent';
          return <div key={u.id} style={{ position: 'absolute', left: u.col * scale, top: u.row * scale, width: scale - 1, height: scale - 1, background: color, borderRadius: 1 }} />;
        })}
        {state.grid.flat().filter(c => c.building).map((c, i) => {
          if (!state.revealed[c.col]?.[c.row]) return null;
          return <div key={`b${i}`} style={{ position: 'absolute', left: c.col * scale, top: c.row * scale, width: scale - 1, height: scale - 1, background: 'transparent', border: `1px solid ${c.buildingOwner === 'player' ? '#27ae60' : '#e74c3c'}`, borderRadius: 1, opacity: 0.7 }} />;
        })}
      </div>
    </div>
  );
}
function DiplomacyModal({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  if (!state.diplomacyEvent) return null;
  const ev = state.diplomacyEvent;
  const eventIcons: Record<string, string> = { ceasefire: '🤝', intel: '🔍', surrender: '🏳️', sabotage: '💣', reinforcement: '📢' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="p-5 rounded-xl max-w-sm w-full mx-4" style={{ background: '#16213e', border: '2px solid #9b59b6' }}>
        <h3 className="text-white font-bold text-lg text-center mb-2">{eventIcons[ev.type] || '📢'} حدث دبلوماسي</h3>
        <p className="text-gray-200 text-sm text-center mb-4 leading-relaxed">{ev.msg}</p>
        <div className="space-y-2">
          {ev.options.map((opt, i) => (
            <button key={i} onClick={() => dispatch({ type: 'DISMISS_DIPLOMACY', effect: opt.effect })} className="w-full py-2.5 rounded-lg text-white font-bold cursor-pointer text-sm" style={{ background: 'linear-gradient(135deg, #9b59b6, #8e44ad)' }}>{opt.text}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
function ToastNotifications({ state }: { state: GameState }) {
  useEffect(() => { if (state.toasts.length > 0) { const timer = setTimeout(() => { try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('force-update')); } catch {} }, 3000); return () => clearTimeout(timer); } }, [state.toasts]);
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {state.toasts.map(t => (
        <div key={t.id} className="px-4 py-2 rounded-lg text-white text-sm font-bold shadow-lg pointer-events-auto" style={{ background: 'linear-gradient(135deg, #f39c12, #e67e22)', animation: 'slideIn 0.3s ease-out' }}>
          {t.icon} {t.msg}
        </div>
      ))}
    </div>
  );
}
function PhaseTransition({ text }: { text: string | null }) {
  const [show, setShow] = useState(false);
  useEffect(() => { if (text) { setShow(true); const timer = setTimeout(() => setShow(false), 1500); return () => clearTimeout(timer); } }, [text]);
  if (!show || !text) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 pointer-events-none" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div className="text-3xl font-bold text-white" style={{ textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>{text}</div>
    </div>
  );
}
function UnitCardPanel({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const unit = state.selectedId ? state.units.find(u => u.id === state.selectedId) : null;
  if (!unit) return <div className="p-2 rounded-lg text-gray-500 text-xs text-center" style={{ background: '#16213e' }}>اختر وحدة</div>;
  const def = UNIT_DEFS[unit.type]; const hpPct = unit.hp / unit.maxHp;
  const canUseAbility = unit.owner === 'player' && unit.abilityCooldownLeft <= 0 && !unit.abilityActive && def.abilityCooldown > 0 && (state.phase === 'movement' || state.phase === 'attack');
  const statusIcons = unit.statusEffects.map((e, i) => `${STATUS_EFFECT_DEFS[e.type].icon}`).join(' ');
  const borderColor = unit.owner === 'player' ? '#27ae60' : '#c0392b';
  return (
    <div className="p-3 rounded-lg space-y-2" style={{ background: '#16213e', border: `1px solid ${borderColor}` }}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{def.icon}</span>
        <div>
          <div className="font-bold text-white text-sm">{def.nameAr} <span className="text-xs text-gray-400">⭐{unit.level}</span></div>
          <div className="text-xs" style={{ color: unit.owner === 'player' ? '#53d769' : '#e94560' }}>{unit.owner === 'player' ? 'أنت' : 'عدو'}{isAirUnit(unit.type) ? ' ✈️' : ''}{isNavalUnit(unit.type) ? ' 🚢' : ''}</div>
        </div>
      </div>
      {statusIcons && <div className="text-xs">{statusIcons}</div>}
      <div><div className="text-xs text-gray-400 mb-1">HP: {unit.hp}/{unit.maxHp}</div><div className="w-full h-2 rounded-full bg-gray-700"><div className="h-2 rounded-full transition-all" style={{ width: `${hpPct * 100}%`, background: hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c' }} /></div></div>
      <div className="grid grid-cols-4 gap-1 text-xs text-center">
        <div className="p-1 rounded" style={{ background: '#0d1117' }}><div className="text-gray-400">⚔️</div><div className="text-white font-bold">{unit.atk}{getStatusEffectAtkMod(unit) !== 0 ? ` (${Math.round(getStatusEffectAtkMod(unit) * 100)}%)` : ''}</div></div>
        <div className="p-1 rounded" style={{ background: '#0d1117' }}><div className="text-gray-400">🛡️</div><div className="text-white font-bold">{unit.def}</div></div>
        <div className="p-1 rounded" style={{ background: '#0d1117' }}><div className="text-gray-400">🚶</div><div className="text-white font-bold">{unit.mov}</div></div>
        <div className="p-1 rounded" style={{ background: '#0d1117' }}><div className="text-gray-400">🎯</div><div className="text-white font-bold">{unit.range}</div></div>
      </div>
      <div className="text-xs space-y-1">
        <div>🎖️ الخبرة: {unit.exp}/{unit.maxExp}</div>
        {def.counters.length > 0 && <div className="text-green-400">✂️ {def.counters.map(c => UNIT_DEFS[c].nameAr).join(', ')}</div>}
        {unit.entrenched && <div className="text-yellow-400">🏗️ محصّن</div>}
        {unit.abilityActive && <div className="text-red-400">⚡ {def.abilityNameAr} ({unit.abilityActiveTurns})</div>}
        {unit.carriedUnitId && <div className="text-blue-400">🛳️ يحمل وحدة</div>}
      </div>
      {canUseAbility && (<button onClick={() => dispatch({ type: 'USE_ABILITY', unitId: unit.id })} className="w-full py-2 rounded-lg text-xs font-bold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #f39c12, #e67e22)' }}>{def.abilityNameAr}: {def.abilityDesc}</button>)}
      {unit.abilityCooldownLeft > 0 && <div className="text-xs text-gray-400 text-center">⏳ إعادة تحميل: {unit.abilityCooldownLeft}</div>}
    </div>
  );
}
function GameLog({ state }: { state: GameState }) {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [state.log.length]);
  return (
    <div className="rounded-lg p-2" style={{ background: '#16213e', maxHeight: '20vh' }}>
      <div className="text-white text-xs font-bold mb-1">📜 سجل الأحداث</div>
      <div ref={logRef} className="space-y-0.5 overflow-y-auto max-h-48 text-xs" style={{ scrollbarWidth: '4px', scrollbarColor: '#0f3460' }}>
        {state.log.slice(-30).reverse().map((entry, i) => (<div key={i} className="text-gray-300 leading-tight" style={{ opacity: 1 - i * 0.02 }}>{entry.msg}</div>))}
      </div>
    </div>
  );
}
function StatsPanel({ state }: { state: GameState }) {
  const pUnits = state.units.filter(u => u.owner === 'player' && !u.isFake && u.hp > 0); const aUnits = state.units.filter(u => u.owner === 'ai' && !u.isFake && u.hp > 0);
  const pAvgHp = pUnits.length > 0 ? Math.round(pUnits.reduce((s, u) => s + u.hp / u.maxHp * 100, 0) / pUnits.length) : 0;
  const aAvgHp = aUnits.length > 0 ? Math.round(aUnits.reduce((s, u) => s + u.hp / u.maxHp * 100, 0) / aUnits.length) : 0;
  const totalHexes = COLS * ROWS; const revealedCount = state.revealed.flat().filter(Boolean).length;
  const playerSP = state.grid.flat().filter(c => c.strategicPoint && c.strategicOwner === 'player').length;
  const aiSP = state.grid.flat().filter(c => c.strategicPoint && c.strategicOwner === 'ai').length;
  return (
    <div className="p-3 rounded-lg z-20 text-xs" style={{ background: '#16213eee', border: '1px solid #0f3460', minWidth: '220px', backdropFilter: 'blur(8px)' }}>
      <div className="text-white font-bold mb-2">📊 إحصائيات</div>
      <div className="space-y-1.5 text-gray-300">
        <div className="flex justify-between"><span>⚔️ وحدات:</span><span><span className="text-green-400">{pUnits.length}</span> vs <span className="text-red-400">{aUnits.length}</span></span></div>
        <div className="w-full h-1.5 rounded-full bg-gray-700"><div className="h-1.5 rounded-full bg-green-500" style={{ width: `${Math.min(100, (pUnits.length / Math.max(1, pUnits.length + aUnits.length)) * 100)}%` }} /></div>
        <div className="flex justify-between"><span>❤️ صحة:</span><span><span className="text-green-400">{pAvgHp}%</span> vs <span className="text-red-400">{aAvgHp}%</span></span></div>
        <div className="flex justify-between"><span>👁️ استكشاف:</span><span className="text-blue-400">{Math.round(revealedCount / totalHexes * 100)}%</span></div>
        <div className="flex justify-between"><span>🏛️ نقاط:</span><span><span className="text-green-400">{playerSP}</span> vs <span className="text-red-400">{aiSP}</span></span></div>
        <div className="flex justify-between"><span>📦 إمداد:</span><span><span className="text-yellow-400">{state.player.supply}</span> vs <span className="text-red-300">{state.ai.supply}</span></span></div>
        <div className="flex justify-between"><span>💪 معنويات:</span><span><span className={state.player.morale > 60 ? 'text-green-400' : 'text-red-400'}>{state.player.morale}%</span> vs <span className={state.ai.morale > 60 ? 'text-green-400' : 'text-red-400'}>{state.ai.morale}%</span></span></div>
        {state.victoryType !== 'annihilation' && <div className="flex justify-between"><span>🏆 شرط الفوز:</span><span className="text-purple-400">{VICTORY_DEFS[state.victoryType].icon} {VICTORY_DEFS[state.victoryType].nameAr}</span></div>}
      </div>
    </div>
  );
}
// ==================== MISSING UTILITY FUNCTIONS ====================
function critChance(type: UnitType): number { const m: Partial<Record<UnitType, number>> = { special_forces: 0.15, commando: 0.15, cavalry: 0.12, fighter_jet: 0.2, artillery: 0.05, rocket_artillery: 0.05, armor: 0.08, marines: 0.08, helicopter: 0.1, destroyer: 0.08 }; return m[type] ?? 0.10; }
function missChance(type: UnitType): number { const m: Partial<Record<UnitType, number>> = { artillery: 0.05, rocket_artillery: 0.05, fighter_jet: 0.03 }; return m[type] ?? 0.10; }
function getAdjacentAllies(unit: Unit, units: Unit[]): Set<UnitType> { const types = new Set<UnitType>(); for (const [nc, nr] of getNeighbors(unit.col, unit.row)) { const u = getUnitAt(units, nc, nr); if (u && u.owner === unit.owner && !u.isFake && u.hp > 0 && u.id !== unit.id) types.add(u.type); } return types; }
function checkCombineArms(attacker: Unit, units: Unit[]): boolean { const allies = getAdjacentAllies(attacker, units); allies.add(attacker.type); return allies.size >= 3; }
function isFlanking(attacker: Unit, defender: Unit, units: Unit[]): boolean { const defenderNeighbors = getNeighbors(defender.col, defender.row); const attackerAlliesNearDefender = defenderNeighbors.filter(([c, r]) => { const u = getUnitAt(units, c, r); return u && u.owner === attacker.owner && !u.isFake && u.hp > 0; }).length; return attackerAlliesNearDefender >= 2; }
function getMoraleEvent(): { msg: string; playerEffect: number; aiEffect: number } | null { if (Math.random() > 0.15) return null; const events = [ { msg: '📣 خطاب تحفيزي! +10 معنويات', playerEffect: 10, aiEffect: 10 }, { msg: '😱 شائعات! -5 معنويات', playerEffect: -5, aiEffect: -5 }, { msg: '🎯 قائد ميدان رائع! +15 معنويات لفريق واحد', playerEffect: 15, aiEffect: -5 }, { msg: '🌧️ أحوال الطقس سيئة! -8 معنويات', playerEffect: -8, aiEffect: -8 }, { msg: '🎵 أغنية حرب! +8 معنويات', playerEffect: 8, aiEffect: 8 } ]; return events[Math.floor(Math.random() * events.length)]; }
function calcBuildPlacements(state: GameState): [number, number][] { const placements: [number, number][] = []; const engineers = state.units.filter(u => u.owner === 'player' && u.type === 'engineers' && u.hp > 0); if (engineers.length === 0) return placements; for (let c = 0; c < COLS; c++) { for (let r = 0; r < ROWS; r++) { if (!state.revealed[c][r]) continue; if (getUnitAt(state.units, c, r)) continue; const cell = state.grid[c][r]; if (cell.building) continue; const terrain = cell.terrain; if (terrain === 'water' || terrain === 'mountain') continue; const nearEngineer = engineers.some(e => hexDist(e.col, e.row, c, r) <= 2); if (nearEngineer) placements.push([c, r]); } } return placements; }
function processDefenseTowerAttacks(state: GameState, units: Unit[], log: LogEntry[]): { units: Unit[]; log: LogEntry[]; effects: BattleEffect[] } { let newUnits = [...units]; const newLog = [...log]; const newEffects: BattleEffect[] = []; for (let c = 0; c < COLS; c++) { for (let r = 0; r < ROWS; r++) { const cell = state.grid[c][r]; if (cell.building !== 'defense_tower' || !cell.buildingOwner) continue; const towerOwner = cell.buildingOwner; const enemies = newUnits.filter(u => u.owner !== towerOwner && !u.isFake && u.hp > 0 && hexDist(c, r, u.col, u.row) <= 2); if (enemies.length === 0) continue; enemies.sort((a, b) => hexDist(c, r, a.col, a.row) - hexDist(c, r, b.col, b.row)); const target = enemies[0]; const tLv = cell.buildingLevel || 1; const dmg = tLv >= 3 ? 35 : tLv >= 2 ? 25 : 15; const tIdx = newUnits.findIndex(u => u.id === target.id); if (tIdx >= 0) { newUnits[tIdx] = { ...newUnits[tIdx], hp: Math.max(0, newUnits[tIdx].hp - dmg) }; newLog.push({ turn: state.turn, msg: `🗼 برج دفاعي هاجم ${UNIT_DEFS[target.type].nameAr} - ${dmg} ضرر`, type: 'attack' }); newEffects.push({ id: `fx_tower_${Date.now()}_${c}_${r}`, col: target.col, row: target.row, type: 'explosion', startTime: Date.now() }); if (newUnits[tIdx].hp <= 0) { newUnits = newUnits.filter(u => u.id !== target.id); newLog.push({ turn: state.turn, msg: `  ✗ ${UNIT_DEFS[target.type].nameAr} دُمر بالبرج!`, type: 'system' }); } } } } return { units: newUnits, log: newLog, effects: newEffects }; }
// ==================== HEX GRID COMPONENT ====================
function HexGridComp({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Action> }) {
  const scale = COLS <= 11 ? 1.15 : COLS >= 16 ? 0.8 : 1;
  const svgW = (COLS * HEX_SIZE * 1.5 + HEX_SIZE + 20) * scale;
  const svgH = (ROWS * SQRT3 * HEX_SIZE + SQRT3 * HEX_SIZE / 2 + 20) * scale;
  const tactic = TACTICS.find(t => t.id === state.playerTactic) ?? null;
  const secondary = TACTICS.find(t => t.id === state.secondaryPlayerTactic) ?? null;
  const validMoveSet = new Set(state.validMoves.map(([c, r]) => `${c},${r}`));
  const validAttackSet = new Set(state.validAttacks.map(([c, r]) => `${c},${r}`));
  const validBuildSet = new Set(state.validBuildPlacements.map(([c, r]) => `${c},${r}`));
  const selected = state.selectedId ? state.units.find(u => u.id === state.selectedId) : null;
  let dmgPreview: { col: number; row: number; dmg: number; counterDmg: number } | null = null;
  if (state.hoverHex && selected && validAttackSet.has(`${state.hoverHex[0]},${state.hoverHex[1]}`)) {
    const target = getUnitAt(state.units, state.hoverHex[0], state.hoverHex[1]);
    if (target) { const dmg = calcDamage(selected, target, tactic, secondary, state.grid, state.weather, state.player.morale, state.ai.morale, false); const cDmg = calcCounterDamage(selected, target, tactic, secondary, state.grid, state.weather, state.player.morale, state.ai.morale); dmgPreview = { col: state.hoverHex[0], row: state.hoverHex[1], dmg, counterDmg: cDmg }; }
  }
  const statusEffectIcons = (u: Unit) => u.statusEffects.length > 0 ? u.statusEffects.map(e => STATUS_EFFECT_DEFS[e.type].icon).join('') : '';
  return (
    <div className={`relative rounded-xl overflow-auto ${state.shakeKey % 2 === 1 ? 'animate-shake' : ''}`} style={{ background: '#0d1117', border: '2px solid #1e3a5f', maxHeight: '60vh' }}>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${(COLS * HEX_SIZE * 1.5 + HEX_SIZE + 20)} ${(ROWS * SQRT3 * HEX_SIZE + SQRT3 * HEX_SIZE / 2 + 20)}`} className="block" style={{ minWidth: svgW }}>
        <g transform={`scale(${scale})`}>
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
          const deployColLimit = state.deployMode ? Math.max(2, state.units.filter(u => u.owner === 'player' && !u.isFake && u.hp > 0).reduce((max, u) => Math.max(max, u.col), 0) + 1) : 2;
          const isDeploy = state.deployMode && ci <= deployColLimit && !unit && cell.terrain !== 'water' && cell.terrain !== 'mountain';
          const isValidBuild = validBuildSet.has(`${ci},${ri}`);
          const isBuildHover = state.buildMode && state.hoverHex?.[0] === ci && state.hoverHex?.[1] === ri && isValidBuild;
          const showEnemy = unit && unit.owner === 'ai' && !unit.isFake && isRevealed;
          const isFog = !isRevealed;
          let fill = isFog ? '#111118' : terrain.color;
          if (isValidMove) fill = '#3498db';
          if (isValidAttack) fill = '#e74c3c';
          if (isDeploy && isHovered) fill = '#2ecc71';
          if (isBuildHover) fill = '#27ae60';
          else if (isValidBuild && !isFog) fill = '#1a5c30';
          const bldg = cell.building ? BUILDING_DEFS[cell.building] : null;
          return (
            <g key={`${ci}-${ri}`}>
              <path d={hexPathStr(cx, cy, HEX_SIZE - 1)} fill={fill} stroke={isSelected ? '#ffd700' : isValidBuild ? '#2ecc71' : isHovered && !isFog ? '#fff' : '#2c3e50'} strokeWidth={isSelected ? 3 : isValidBuild ? 2 : isHovered ? 1.5 : 0.5} style={{ cursor: isFog ? 'default' : 'pointer' }} filter={isSelected ? 'url(#selGlow)' : isValidMove || isValidAttack ? 'url(#glow)' : undefined} onClick={() => !isFog && dispatch({ type: 'HEX_CLICK', col: ci, row: ri })} onMouseEnter={() => dispatch({ type: 'HEX_HOVER', col: ci, row: ri })} onMouseLeave={() => dispatch({ type: 'HEX_HOVER', col: -1, row: null })} opacity={isValidMove ? 0.6 : isValidAttack ? 0.6 : 1} />
              {isFog && <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fill="#333" style={{ pointerEvents: 'none' }}>?</text>}
              {!isFog && <text x={cx} y={cy + HEX_SIZE * 0.35} textAnchor="middle" fontSize="10" style={{ pointerEvents: 'none' }}>{terrain.icon}</text>}
              {!isFog && bldg && <text x={cx - 8} y={cy - HEX_SIZE * 0.25} textAnchor="middle" fontSize="10" style={{ pointerEvents: 'none' }}>{bldg.icon}</text>}
              {!isFog && bldg && cell.buildingLevel > 1 && <text x={cx + 10} y={cy - HEX_SIZE * 0.35} textAnchor="middle" fontSize="6" fill="#ffd700" style={{ pointerEvents: 'none' }}>{'⭐'.repeat(cell.buildingLevel - 1)}</text>}
              {!isFog && bldg && cell.buildingOwner && <circle cx={cx + 8} cy={cy - HEX_SIZE * 0.3} r={3} fill={cell.buildingOwner === 'player' ? '#27ae60' : '#c0392b'} style={{ pointerEvents: 'none' }} />}
              {cell.strategicPoint && !isFog && (() => { const spDef = STRATEGIC_POINT_DEFS[cell.strategicPoint]; const ownerColor = cell.strategicOwner === 'player' ? '#27ae60' : cell.strategicOwner === 'ai' ? '#c0392b' : '#95a5a6'; return (<g><circle cx={cx} cy={cy + HEX_SIZE * 0.45} r={5} fill={spDef.color} opacity={0.9} stroke={ownerColor} strokeWidth={2} style={{ pointerEvents: 'none' }}><animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" /></circle><text x={cx} y={cy + HEX_SIZE * 0.5} textAnchor="middle" fontSize="6" style={{ pointerEvents: 'none' }}>{spDef.icon}</text></g>); })()}
              {unit && (unit.owner === 'player' || showEnemy) && (
                <g filter={unit.owner === 'player' ? 'url(#glow)' : undefined}>
                  <circle cx={cx} cy={cy} r={HEX_SIZE * 0.32} fill={unit.owner === 'player' ? '#27ae60' : '#c0392b'} stroke={unit.isFake ? '#9b59b6' : unit.entrenched ? '#ffd700' : '#fff'} strokeWidth={unit.entrenched ? 2 : 1} opacity={unit.isFake ? 0.6 : 1} />
                  <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" style={{ pointerEvents: 'none' }}>{UNIT_DEFS[unit.type].icon}</text>
                  <rect x={cx - 10} y={cy - HEX_SIZE * 0.5} width={20} height={2.5} fill="#333" rx={1} /><rect x={cx - 10} y={cy - HEX_SIZE * 0.5} width={20 * (unit.hp / unit.maxHp)} height={2.5} fill={unit.hp / unit.maxHp > 0.5 ? '#2ecc71' : unit.hp / unit.maxHp > 0.25 ? '#f39c12' : '#e74c3c'} rx={1} />
                  {unit.level > 1 && !unit.isFake && <text x={cx + 8} y={cy - 7} textAnchor="middle" fontSize="6" fill="#ffd700" style={{ pointerEvents: 'none' }}>⭐{unit.level}</text>}
                  {unit.statusEffects.length > 0 && !unit.isFake && <text x={cx - 9} y={cy - 7} textAnchor="middle" fontSize="5" style={{ pointerEvents: 'none' }}>{statusEffectIcons(unit)}</text>}
                  {(unit.moved && unit.attacked) && unit.owner === 'player' && <text x={cx} y={cy + 11} textAnchor="middle" fontSize="5" fill="#aaa" style={{ pointerEvents: 'none' }}>✓</text>}
                </g>
              )}
              {dmgPreview && dmgPreview.col === ci && dmgPreview.row === ri && (<g><rect x={cx - 18} y={cy - HEX_SIZE - 8} width={36} height={22} fill="#e74c3c" rx={4} /><text x={cx} y={cy - HEX_SIZE + 4} textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">-{dmgPreview.dmg}</text>{dmgPreview.counterDmg > 0 && <text x={cx} y={cy - HEX_SIZE + 12} textAnchor="middle" fontSize="6" fill="#ffa">↩-{dmgPreview.counterDmg}</text>}</g>)}
            </g>
          );
        }))}
        {state.effects.map(fx => { const [cx, cy] = hexCenter(fx.col, fx.row); const age = (Date.now() - fx.startTime) / 1000; if (age > 1) return null; const opacity = 1 - age; const r = fx.type === 'explosion' || fx.type === 'death' ? 15 + age * 20 : 10 + age * 10; return <circle key={fx.id} cx={cx} cy={cy} r={r} fill="none" stroke={fx.type === 'heal' ? '#2ecc71' : '#e74c3c'} strokeWidth={3 * opacity} opacity={opacity} style={{ pointerEvents: 'none' }} />; })}
        </g>
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
    <div className="absolute z-50 p-2 rounded-lg text-xs text-white pointer-events-none" style={{ background: 'rgba(22,33,62,0.95)', border: '1px solid #0f3460', left: `${(cx / (COLS * HEX_SIZE * 1.5 + HEX_SIZE + 20)) * 100}%`, top: `${(cy / (ROWS * SQRT3 * HEX_SIZE + SQRT3 * HEX_SIZE / 2 + 20)) * 100}%`, transform: 'translate(-50%, -120%)', maxWidth: '200px' }}>
      <div className="font-bold">{terrain.icon} {terrain.nameAr} | دفاع: {terrain.defBonus > 0 ? '+' : ''}{Math.round(terrain.defBonus * 100)}%</div>
      {bldg && <div className="text-yellow-400">{bldg.icon} {bldg.nameAr}: {bldg.desc} {'⭐'.repeat(cell.buildingLevel)}</div>}
      {cell.strategicPoint && (() => { const spDef = STRATEGIC_POINT_DEFS[cell.strategicPoint]; const ownerName = cell.strategicOwner === 'player' ? 'أنت' : cell.strategicOwner === 'ai' ? 'عدو' : 'محايد'; return <div style={{ color: spDef.color }}>{spDef.icon} {spDef.nameAr} ({ownerName}): {spDef.desc}</div>; })()}
      {unit && (unit.owner === 'player' || state.revealed[col]?.[row]) && (
        <div className="mt-1 pt-1 border-t border-gray-600">
          <div className="font-bold" style={{ color: unit.owner === 'player' ? '#53d769' : '#e94560' }}>{UNIT_DEFS[unit.type].icon} {UNIT_DEFS[unit.type].nameAr} {unit.isFake ? '(وهمية)' : `(${unit.owner === 'player' ? 'أنت' : 'عدو'}) ⭐${unit.level}`}</div>
          <div>HP: {unit.hp}/{unit.maxHp} | ⚔️{unit.atk} 🛡️{unit.def} 🚶{unit.mov} 🎯{unit.range}</div>
          {unit.statusEffects.length > 0 && <div className="text-orange-400">{unit.statusEffects.map(e => `${STATUS_EFFECT_DEFS[e.type].icon} ${STATUS_EFFECT_DEFS[e.type].nameAr} (${e.turnsLeft})`).join(' | ')}</div>}
          {unit.entrenched && <div className="text-yellow-400">🏗️ محصّن</div>}
        </div>
      )}
    </div>
  );
}
// ==================== BATTLE MODAL ====================
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
          {counterDmg > 0 && <div className="flex justify-between"><span>⚠️ هجوم مضاد:</span><span className="text-orange-400 font-bold">-{counterDmg}</span></div>}
          {counterBonus > 0 && <div className="text-green-400">✂️ نقطة ضعف: +{Math.round(counterBonus * 100)}% ضرر</div>}
          {attacker.statusEffects.length > 0 && <div className="text-orange-400">{attacker.statusEffects.map(e => `${STATUS_EFFECT_DEFS[e.type].icon}`).join('')} تأثيرات نشطة</div>}
          {defender.hp - dmg <= 0 && <div className="text-red-400 font-bold">💀 سيتم تدمير الوحدة!</div>}
        </div>
        {state.ceasefireActive && <div className="text-yellow-400 text-center text-sm mb-2">🏳️ هدنة سارية! لا يمكن الهجوم</div>}
        <div className="flex gap-2">
          <button onClick={() => dispatch({ type: 'CANCEL_ATTACK' })} className="flex-1 py-2 rounded-lg text-white border border-gray-500 hover:bg-white/5 cursor-pointer text-sm">❌ إلغاء</button>
          <button onClick={() => !state.ceasefireActive && dispatch({ type: 'CONFIRM_ATTACK' })} disabled={state.ceasefireActive} className={`flex-1 py-2 rounded-lg text-white font-bold cursor-pointer text-sm ${state.ceasefireActive ? 'opacity-40 cursor-not-allowed' : ''}`} style={{ background: 'linear-gradient(135deg, #e94560, #c0392b)' }}>⚔️ هجوم!</button>
        </div>
      </div>
    </div>
  );
}
// ==================== TACTIC SELECTOR ====================
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
              <button key={t.id} onClick={() => dispatch({ type: 'SELECT_TACTIC', id: t.id })} className={`p-1.5 rounded text-xs text-right cursor-pointer ${state.tacticId === t.id ? 'ring-2' : ''}`} style={{ background: state.tacticId === t.id ? '#0f3460' : '#1a2332', borderColor: cat.color }}>
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
            <button key={t.id} onClick={() => dispatch({ type: 'SELECT_TACTIC', id: state.secondaryTacticId === t.id ? null : t.id, secondary: true })} className={`p-1 rounded text-center cursor-pointer ${state.secondaryTacticId === t.id ? 'ring-1 ring-yellow-400' : ''}`} style={{ background: state.secondaryTacticId === t.id ? '#0f3460' : '#1a2332', fontSize: '9px', color: state.secondaryTacticId === t.id ? '#ffd700' : '#999' }}>{t.name}</button>
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
          {(Object.keys(UNIT_DEFS) as UnitType[]).map(ut => { const d = UNIT_DEFS[ut]; const can = state.player.supply >= d.cost; return <button key={ut} onClick={() => can ? dispatch({ type: 'DEPLOY_UNIT', unitType: ut }) : undefined} disabled={!can} className={`p-1 rounded text-center cursor-pointer ${state.deployMode === ut ? 'ring-1 ring-green-400' : ''} ${!can ? 'opacity-40' : 'hover:bg-white/5'}`} style={{ background: '#1a2332' }}><div style={{ fontSize: '12px' }}>{d.icon}</div><div className="text-gray-300" style={{ fontSize: '7px' }}>{d.nameAr}</div><div className="text-yellow-400" style={{ fontSize: '7px' }}>{d.cost}</div></button>; })}
        </div>
      </div>
      <div className="border-t border-gray-700 pt-2 mt-2">
        <div className="text-white font-bold text-xs mb-1">🏗️ بناء المباني</div>
        <div className="grid grid-cols-2 gap-1">
          {BUILDABLE_TYPES.map(bt => { const bd = BUILDING_DEFS[bt]; const cost = BUILDING_COSTS[bt]; const canAfford = state.player.supply >= cost; const hasEngineer = state.units.some(u => u.owner === 'player' && u.type === 'engineers' && u.hp > 0); const canBuild = canAfford && hasEngineer && state.playerBuildCount < 1; return (<button key={bt} onClick={() => canBuild ? dispatch({ type: 'ENTER_BUILD_MODE', buildingType: bt }) : undefined} disabled={!canBuild} className={`p-1.5 rounded text-xs text-right cursor-pointer ${!canBuild ? 'opacity-40' : 'hover:bg-white/5'}`} style={{ background: '#1a2332' }}><div className="text-sm">{bd.icon} {bd.nameAr}</div><div className="text-gray-400" style={{ fontSize: '9px' }}>{bd.desc}</div><div className="text-yellow-400" style={{ fontSize: '9px' }}>📦 {cost}</div></button>); })}
        </div>
      </div>
    </div>
  );
}
// ==================== PROFILE SCREEN ====================
function ProfileScreen({ profile, setProfile, onBack }: { profile: PlayerProfile; setProfile: (p: PlayerProfile) => void; onBack: () => void }) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const rankIcons: Record<string, string> = { 'جندي': '🔰', 'جندي أول': '🎖️', 'رقيب': '⭐', 'ضابط': '🎖️', 'قائد': '⚔️', 'قائد أعلى': '👑', 'أستاذ الحرب': '🏆' };
  const handleSaveName = () => { const newP = { ...profile, name: nameInput }; saveProfile(newP); setProfile(newP); setEditingName(false); };
  const winRate = profile.totalGames > 0 ? Math.round((profile.totalWins / profile.totalGames) * 100) : 0;
  return (
    <div className="min-h-screen p-4 md:p-6 overflow-y-auto" dir="rtl" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-white">👤 الملف الشخصي</h1><button onClick={onBack} className="py-2 px-4 rounded-lg bg-gray-700 text-white hover:bg-gray-600 cursor-pointer text-sm">→ رجوع</button></div>
        <div className="p-4 rounded-xl text-center" style={{ background: '#16213e', border: '2px solid #f39c12' }}>
          <div className="text-5xl mb-2">{rankIcons[profile.rank] || '🔰'}</div>
          {editingName ? (<div className="flex gap-2 justify-center"><input value={nameInput} onChange={e => setNameInput(e.target.value)} className="bg-gray-800 text-white px-3 py-1 rounded text-center" maxLength={15} /><button onClick={handleSaveName} className="px-3 py-1 rounded bg-green-600 text-white text-sm cursor-pointer">حفظ</button></div>) : (<div className="cursor-pointer" onClick={() => setEditingName(true)}><h2 className="text-2xl font-bold text-yellow-400">{profile.name}</h2></div>)}
          <div className="text-lg text-white mt-1">{profile.rank}</div>
          <div className="text-sm text-gray-400">المستوى {profile.level}</div>
          <div className="mt-2 max-w-xs mx-auto"><div className="flex justify-between text-xs text-gray-400 mb-1"><span>XP</span><span>{profile.xp} / {profile.xpToNext}</span></div><div className="w-full h-3 rounded-full bg-gray-700"><div className="h-3 rounded-full bg-yellow-400 transition-all" style={{ width: `${(profile.xp / profile.xpToNext) * 100}%` }} /></div></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[{ label: '🏆 الانتصارات', val: profile.totalWins, color: 'text-green-400' }, { label: '💀 الهزائم', val: profile.totalLosses, color: 'text-red-400' }, { label: '📊 نسبة الفوز', val: `${winRate}%`, color: 'text-blue-400' }, { label: '🎮 إجمالي', val: profile.totalGames, color: 'text-orange-400' }, { label: '⚔️ قتل', val: profile.totalKills, color: 'text-red-400' }, { label: '💥 ضرر', val: profile.totalDamageDealt, color: 'text-purple-400' }].map(s => (
            <div key={s.label} className="p-3 rounded-lg" style={{ background: '#16213e' }}><div className={`${s.color} font-bold`}>{s.label}</div><div className="text-2xl text-white">{s.val}</div></div>
          ))}
        </div>
        <div className="p-4 rounded-lg" style={{ background: '#16213e' }}>
          <h3 className="text-yellow-400 font-bold mb-2">⭐ مكافآت الارتقاء</h3>
          {Object.entries(PERK_DEFS).map(([key, perk]) => { const unlocked = profile.unlockedPerks.includes(key); return (<div key={key} className={`p-2 rounded-lg flex items-center gap-2 mb-1 ${unlocked ? 'bg-green-900/30 border border-green-600' : 'bg-gray-800/50 border border-gray-700 opacity-50'}`}><span className="text-xl">{perk.icon}</span><div className="flex-1"><div className="text-white text-sm font-bold">{perk.nameAr} <span className="text-gray-400 text-xs">(مستوى {perk.level})</span></div><div className="text-gray-400 text-xs">{perk.desc}</div></div>{unlocked ? <span className="text-green-400 text-xs font-bold">✅</span> : <span className="text-gray-500 text-xs">🔒</span>}</div>); })}
        </div>
      </div>
    </div>
  );
}
// ==================== MAP EDITOR SCREEN ====================
function MapEditorScreen({ onBack, onPlay }: { onBack: () => void; onPlay: (grid: HexCell[][], cols: number, rows: number) => void }) {
  const [tool, setTool] = useState<MapEditorTool>('terrain');
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType>('plains');
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [selectedStrategic, setSelectedStrategic] = useState<StrategicPointType | null>(null);
  const [editorCols, setEditorCols] = useState(14);
  const [editorRows, setEditorRows] = useState(10);
  const [editorGrid, setEditorGrid] = useState<HexCell[][]>(() => makeGrid());
  const [mapName, setMapName] = useState('خريطة مخصصة');
  const savedMaps = useState(() => { try { const s = localStorage.getItem('warGame_customMaps'); return s ? JSON.parse(s) : []; } catch { return []; } });
  const handleHexClick = (col: number, row: number) => {
    setEditorGrid(prev => prev.map(c => c.map(cell => {
      if (cell.col !== col || cell.row !== row) return cell;
      if (tool === 'terrain') return { ...cell, terrain: selectedTerrain };
      if (tool === 'building') return { ...cell, building: selectedBuilding, buildingOwner: selectedBuilding ? 'player' : null, buildingLevel: 1 };
      if (tool === 'strategic_point') return { ...cell, strategicPoint: selectedStrategic, strategicOwner: selectedStrategic ? null : null };
      return { ...cell, building: null, buildingOwner: null, strategicPoint: null, strategicOwner: null };
    })));
  };
  const handleSave = () => {
    const map = { id: Date.now().toString(), name: mapName, grid: editorGrid, cols: editorCols, rows: editorRows, createdAt: Date.now() };
    const maps = [...savedMaps[0], map].slice(-5);
    localStorage.setItem('warGame_customMaps', JSON.stringify(maps));
    savedMaps[1](maps);
  };
  const handleLoad = (idx: number) => {
    const map = savedMaps[0][idx];
    if (map) { setEditorGrid(map.grid.map(c => c.map(cell => ({ ...cell })))); setEditorCols(map.cols); setEditorRows(map.rows); setMapName(map.name); }
  };
  const handleClear = () => { setEditorGrid(makeGrid()); };
  const handlePlay = () => { onPlay(editorGrid, editorCols, editorRows); };
  const scale = editorCols <= 11 ? 0.7 : editorCols >= 16 ? 0.5 : 0.6;
  const svgW = (editorCols * HEX_SIZE * 1.5 + HEX_SIZE + 20) * scale;
  const svgH = (editorRows * SQRT3 * HEX_SIZE + SQRT3 * HEX_SIZE / 2 + 20) * scale;
  const terrains: TerrainType[] = ['plains', 'mountain', 'forest', 'water', 'desert', 'urban', 'swamp', 'oasis', 'road', 'ruins', 'ice', 'beach', 'volcanic'];
  const buildings: BuildingType[] = ['factory', 'hospital', 'fortress', 'tower', 'barracks', 'defense_tower', 'ammo_depot', 'bunker', 'hq'];
  const strategicPoints: StrategicPointType[] = ['supply_cache', 'weapons_depot', 'training_camp', 'gold_mine', 'command_post'];
  return (
    <div className="min-h-screen p-4 md:p-6 overflow-y-auto" dir="rtl" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      <div className="max-w-5xl mx-auto space-y-3">
        <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-white">🗺️ محرر الخرائط</h1><button onClick={onBack} className="py-2 px-4 rounded-lg bg-gray-700 text-white hover:bg-gray-600 cursor-pointer text-sm">→ رجوع</button></div>
        <div className="flex flex-wrap gap-2 items-center">
          <input value={mapName} onChange={e => setMapName(e.target.value)} className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm" placeholder="اسم الخريطة" />
          <select value={editorCols} onChange={e => { setEditorCols(Number(e.target.value)); setEditorGrid(makeGrid()); }} className="bg-gray-800 text-white px-2 py-1.5 rounded text-sm"><option value={10}>10 أعمدة</option><option value={14}>14 أعمدة</option><option value={18}>18 عمود</option></select>
          <select value={editorRows} onChange={e => { setEditorRows(Number(e.target.value)); setEditorGrid(makeGrid()); }} className="bg-gray-800 text-white px-2 py-1.5 rounded text-sm"><option value={8}>8 صفوف</option><option value={10}>10 صفوف</option><option value={12}>12 صف</option></select>
          <button onClick={handleClear} className="py-1.5 px-3 rounded bg-red-600 text-white text-sm cursor-pointer hover:bg-red-500">🗑️ مسح</button>
          <button onClick={handleSave} className="py-1.5 px-3 rounded bg-green-600 text-white text-sm cursor-pointer hover:bg-green-500">💾 حفظ</button>
          <button onClick={handlePlay} className="py-1.5 px-3 rounded bg-blue-600 text-white text-sm cursor-pointer hover:bg-blue-500">▶️ العب</button>
        </div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setTool('terrain')} className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${tool === 'terrain' ? 'ring-2 ring-green-400' : ''}`} style={{ background: tool === 'terrain' ? '#0f3460' : '#1a2332', color: '#fff' }}>🏔️ تضاريس</button>
          <button onClick={() => setTool('building')} className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${tool === 'building' ? 'ring-2 ring-yellow-400' : ''}`} style={{ background: tool === 'building' ? '#0f3460' : '#1a2332', color: '#fff' }}>🏗️ مباني</button>
          <button onClick={() => setTool('strategic_point')} className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${tool === 'strategic_point' ? 'ring-2 ring-purple-400' : ''}`} style={{ background: tool === 'strategic_point' ? '#0f3460' : '#1a2332', color: '#fff' }}>🏛️ نقاط</button>
          <button onClick={() => setTool('erase')} className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${tool === 'erase' ? 'ring-2 ring-red-400' : ''}`} style={{ background: tool === 'erase' ? '#0f3460' : '#1a2332', color: '#fff' }}>🧹 مسح</button>
        </div>
        {tool === 'terrain' && <div className="flex flex-wrap gap-1">{terrains.map(t => (<button key={t} onClick={() => setSelectedTerrain(t)} className={`px-2 py-1 rounded text-xs cursor-pointer ${selectedTerrain === t ? 'ring-2 ring-green-400' : ''}`} style={{ background: TERRAIN_DEFS[t].color }}>{TERRAIN_DEFS[t].icon} {TERRAIN_DEFS[t].nameAr}</button>))}</div>}
        {tool === 'building' && <div className="flex flex-wrap gap-1">{buildings.map(b => (<button key={b} onClick={() => setSelectedBuilding(b)} className={`px-2 py-1 rounded text-xs cursor-pointer ${selectedBuilding === b ? 'ring-2 ring-yellow-400' : ''}`} style={{ background: '#1a2332', color: '#fff' }}>{BUILDING_DEFS[b].icon} {BUILDING_DEFS[b].nameAr}</button>))}</div>}
        {tool === 'strategic_point' && <div className="flex flex-wrap gap-1">{strategicPoints.map(s => (<button key={s} onClick={() => setSelectedStrategic(s)} className={`px-2 py-1 rounded text-xs cursor-pointer ${selectedStrategic === s ? 'ring-2 ring-purple-400' : ''}`} style={{ background: '#1a2332', color: '#fff' }}>{STRATEGIC_POINT_DEFS[s].icon} {STRATEGIC_POINT_DEFS[s].nameAr}</button>))}</div>}
        <div className="rounded-xl overflow-auto" style={{ background: '#0d1117', border: '2px solid #1e3a5f', maxHeight: '50vh' }}>
          <svg width={svgW} height={svgH} viewBox={`0 0 ${(editorCols * HEX_SIZE * 1.5 + HEX_SIZE + 20)} ${(editorRows * SQRT3 * HEX_SIZE + SQRT3 * HEX_SIZE / 2 + 20)}`}>
            <g transform={`scale(${scale})`}>
              {editorGrid.map((col, ci) => col.map((cell, ri) => {
                if (ci >= editorCols || ri >= editorRows) return null;
                const [cx, cy] = hexCenter(ci, ri);
                const terrain = TERRAIN_DEFS[cell.terrain];
                const bldg = cell.building ? BUILDING_DEFS[cell.building] : null;
                const sp = cell.strategicPoint ? STRATEGIC_POINT_DEFS[cell.strategicPoint] : null;
                return (
                  <g key={`${ci}-${ri}`}>
                    <path d={hexPathStr(cx, cy, HEX_SIZE - 1)} fill={terrain.color} stroke="#2c3e50" strokeWidth={0.5} style={{ cursor: 'pointer' }} onClick={() => handleHexClick(ci, ri)} />
                    <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" style={{ pointerEvents: 'none' }}>{terrain.icon}</text>
                    {bldg && <text x={cx - 8} y={cy - 8} textAnchor="middle" fontSize="10" style={{ pointerEvents: 'none' }}>{bldg.icon}</text>}
                    {sp && <text x={cx + 8} y={cy - 8} textAnchor="middle" fontSize="8" style={{ pointerEvents: 'none' }}>{sp.icon}</text>}
                  </g>
                );
              }))}
            </g>
          </svg>
        </div>
        {savedMaps[0].length > 0 && <div className="p-3 rounded-lg" style={{ background: '#16213e' }}><div className="text-white font-bold mb-2">💾 الخرائط المحفوظة</div><div className="space-y-1">{savedMaps[0].map((m: { id: string; name: string; createdAt: number }, i: number) => (<div key={m.id} className="flex items-center justify-between p-2 rounded bg-gray-800"><span className="text-white text-sm">{m.name}</span><div className="flex gap-1"><button onClick={() => handleLoad(i)} className="px-2 py-1 rounded bg-blue-600 text-white text-xs cursor-pointer">تحميل</button></div></div>))}</div></div>}
      </div>
    </div>
  );
}
// ==================== MAIN EXPORT ====================
export default function WarGame() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty>('normal');
  const [profile, setProfile] = useState<PlayerProfile>(getDefaultProfile());
  const effectTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => { setProfile(loadProfile()); }, [state.screen]);
  useEffect(() => { effectTimer.current = setInterval(() => { if (state.effects.length > 0) dispatch({ type: 'CLEAR_EFFECTS' }); }, 500); return () => { if (effectTimer.current) clearInterval(effectTimer.current); }; }, [state.effects.length]);
  useEffect(() => { if (state.phase === 'ai_turn' && state.animating) { const timer = setTimeout(() => dispatch({ type: 'AI_TURN_COMPLETE' }), 800); return () => clearTimeout(timer); } }, [state.phase, state.animating]);
  useEffect(() => { if (state.toasts.length > 0) { const timer = setTimeout(() => dispatch({ type: 'DISMISS_TOAST', id: state.toasts[0].id }), 3000); return () => clearTimeout(timer); } }, [state.toasts]);
  useEffect(() => { if (state.phaseTransition) { const timer = setTimeout(() => dispatch({ type: 'CLEAR_PHASE_TRANSITION' }), 1500); return () => clearTimeout(timer); } }, [state.phaseTransition]);
  const handleCustomMapPlay = useCallback((grid: HexCell[][], cols: number, rows: number) => {
    COLS = cols; ROWS = rows;
    dispatch({ type: 'START_GAME', difficulty: pendingDifficulty, mapPreset: 'classic', mapSize: 'medium', customGrid: grid });
  }, [pendingDifficulty]);
  if (state.screen === 'menu') return <MainMenu onStart={(d) => { setPendingDifficulty(d); dispatch({ type: 'SET_SCREEN', screen: 'map_select' }); }} onHelp={() => dispatch({ type: 'SET_SCREEN', screen: 'how_to_play' })} onLoad={() => dispatch({ type: 'LOAD_GAME', slot: 0 })} onProfile={() => { setProfile(loadProfile()); dispatch({ type: 'SET_SCREEN', screen: 'profile' }); }} onMapEditor={() => dispatch({ type: 'SET_SCREEN', screen: 'map_editor' })} profile={profile} />;
  if (state.screen === 'map_select') return <MapSelectScreen onSelect={(preset, mapSize, victoryType) => dispatch({ type: 'START_GAME', difficulty: pendingDifficulty, mapPreset: preset, mapSize: mapSize || 'medium', victoryType: victoryType || 'annihilation' })} onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} difficulty={pendingDifficulty} />;
  if (state.screen === 'map_editor') return <MapEditorScreen onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} onPlay={handleCustomMapPlay} />;
  if (state.screen === 'campaign') return <CampaignScreen onSelect={(m) => dispatch({ type: 'START_GAME', difficulty: m.difficulty, mapPreset: m.mapPreset, aiPersonality: m.aiPersonality, gameMode: 'campaign', campaignMission: m.id })} onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} profile={profile} />;
  if (state.screen === 'daily') return <DailyChallengeScreen onStart={(d, p, a) => dispatch({ type: 'START_GAME', difficulty: d, mapPreset: p, aiPersonality: a, gameMode: 'daily' })} onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} />;
  if (state.screen === 'how_to_play') return <HowToPlay onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} />;
  if (state.screen === 'profile') return <ProfileScreen profile={profile} setProfile={setProfile} onBack={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} />;
  if (state.screen === 'game_over') return <GameOverScreen state={state} onRestart={() => dispatch({ type: 'SET_SCREEN', screen: 'menu' })} onProfile={() => { setProfile(loadProfile()); dispatch({ type: 'SET_SCREEN', screen: 'profile' }); }} />;
  return (
    <div className="min-h-screen p-2 md:p-3" dir="rtl" style={{ background: '#0d1117' }}>
      <GameHeader state={state} dispatch={dispatch} />
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="flex-1">
          <HexGridComp state={state} dispatch={dispatch} />
          <div className="mt-2"><GameLog state={state} /></div>
        </div>
        <div className="w-full lg:w-64 space-y-2">
          {state.showMiniMap && <MiniMap state={state} />}
          {state.showStats && <StatsPanel state={state} />}
          {state.phase === 'planning' ? <TacticSelector state={state} dispatch={dispatch} /> : <UnitCardPanel state={state} dispatch={dispatch} />}
          <div className="p-2 rounded-lg text-xs" style={{ background: '#16213e' }}>
            <div className="text-white font-bold mb-1">📊 ملخص</div>
            <div className="text-gray-300 space-y-0.5">
              <div>🏆 وحداتك: {state.units.filter(u => u.owner === 'player' && !u.isFake && u.hp > 0).length}</div>
              <div>💀 أعداء: {state.units.filter(u => u.owner === 'ai' && !u.isFake && u.hp > 0).length}</div>
              <div>📦 إمداد عدو: ~{state.ai.supply}</div>
              {state.victoryType !== 'annihilation' && <div className="text-purple-400">🏆 {VICTORY_DEFS[state.victoryType].icon} {VICTORY_DEFS[state.victoryType].nameAr}</div>}
            </div>
          </div>
        </div>
      </div>
      <BattleModal state={state} dispatch={dispatch} />
      <DiplomacyModal state={state} dispatch={dispatch} />
      <ToastNotifications state={state} />
      <PhaseTransition text={state.phaseTransition} />
    </div>
  );
}
