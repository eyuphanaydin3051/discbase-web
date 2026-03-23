// src/types.ts

// --- Temel Tipler ve Enumlar ---
export type GameMode = 'IDLE' | 'MODE_SELECTION' | 'SIMPLE_ENTRY' | 'DEFENSE_PULL' | 'DEFENSE_PULL_RESULT' | 'OFFENSE' | 'DEFENSE';
export type CaptureMode = 'SIMPLE' | 'ADVANCED' | 'PRO';
export type PointStartMode = 'OFFENSE' | 'DEFENSE';
export type LineType = 'FULL' | 'HANDLER_SET' | 'CUTTER_SET';
export type StoppageType = 'TIMEOUT' | 'INJURY' | 'CALL' | 'OTHER';
export type CalculationMode = 'TOTAL' | 'PER_MATCH' | 'PER_POINT';

// --- Yeni Eklenen Tipler (Hataları Çözen Kısım) ---
export interface MatchEvent {
    playerId: string;
    type: 'goal' | 'assist' | 'block' | 'turnover';
    timestamp?: number;
}

// --- Ana Veri Yapıları ---
export interface UserProfile {
    displayName: string | null;
    email: string | null;
}

export interface EfficiencyCriterion {
    id: string;
    name: string;
    statType: string;
    points: number;
}

export interface TeamProfile {
    teamId: string;
    teamName: string;
    members: { [uid: string]: string };
    logoPath: string | null;
    efficiencyCriteria?: EfficiencyCriterion[];
}

export interface Player {
    id: string;
    name: string;
    gender: string;
    jerseyNumber: number | null;
    position: string;
    isCaptain: boolean;
    email: string | null;
    photoUrl: string | null;
}

export interface PlayerStats {
    playerId: string;
    name: string;
    successfulPass: number;
    assist: number;
    throwaway: number;
    catchStat: number;
    drop: number;
    goal: number;
    pullAttempts: number;
    successfulPulls: number;
    block: number;
    callahan: number;
    secondsPlayed: number;
    totalTempoSeconds: number;
    pointsPlayed: number;
    totalPullTimeSeconds: number;
    passDistribution: { [playerName: string]: number };
}

export interface AdvancedPlayerStats {
    basicStats: PlayerStats;
    plusMinus: number;
    oPointsPlayed: number;
    dPointsPlayed: number;
}

export interface ProEventData {
    fromX: number | null;
    fromY: number | null;
    toX: number;
    toY: number;
    type: string;
    distanceYards: number;
    throwerName: string | null;
    receiverName: string | null;
}

export interface Stoppage {
    id: string;
    type: StoppageType;
    durationSeconds: number;
    startTimeSeconds: number;
}

export interface PointData {
    stats: PlayerStats[];
    whoScored: string;
    startMode: PointStartMode | null;
    captureMode: CaptureMode;
    pullDurationSeconds: number;
    durationSeconds: number;
    stoppages: Stoppage[];
    proEvents: ProEventData[];
}

export interface Match {
    id: string;
    opponentName: string;
    ourTeamName: string;
    scoreUs: number;
    scoreThem: number;
    pointsArchive: PointData[];
    matchDurationSeconds: number;
    isProMode: boolean;
    date?: string;
    // Hata veren eksik alanlar eklendi:
    events?: MatchEvent[];
    playerStats?: Record<string, any>;
}

export interface PresetLine {
    id: string;
    name: string;
    playerIds: string[];
    type: LineType;
}

export interface Tournament {
    id: string;
    tournamentName: string;
    ourTeamName: string;
    date: string;
    rosterPlayerIds: string[];
    matches: Match[];
    presetLines: PresetLine[];
}

export interface Training {
    id: string;
    date: string;
    time: string;
    location: string;
    note: string;
    description: string;
    attendeeIds: string[];
    isVisibleToMembers: boolean;
}

export interface TournamentPlayer {
    id: string;
    name: string;
    jerseyNumber?: string;
    goals?: number;
    assists?: number;
    blocks?: number;
    turnovers?: number;
    matchesPlayed?: number;
    gender?: string;
}
// --- src/types.ts dosyasına eklenecek kısım ---

export interface Match {
    id: string;
    tournamentId: string;
    teamIds: string[]; // [evSahibiTeamId, rakipTeamId]
    teamNames: string[]; // [evSahibiAdı, rakipAdı]
    score: number[]; // [evSahibiSkor, rakipSkor]
    period: number;
    timer: number;
    timerRunning: boolean;
    genderType: string;
    creatorUid: string;
    startTime?: number;
    endTime?: number;
    finished: boolean;
}

export interface MatchEventPlayer {
    id: string;
    name: string;
    jerseyNumber?: number;
}

export interface MatchEvent {
    id: string;
    matchId: string;
    teamId: string;
    playerId?: string | null;
    secondaryPlayerId?: string | null;
    eventType: 'Goal' | 'Assist' | 'D-Up' | 'Callahan' | 'Completion' | 'Drop' | 'Throwaway' | 'Start' | 'Half' | 'End' | 'Timeout' | 'Interception' | 'Stall';
    timestamp: number;
    currentScore: number[];
    period: number;
    description?: string;
    // UI için yardımcı alanlar, repository'de ekleniyor
    player?: MatchEventPlayer | null;
    secondaryPlayer?: MatchEventPlayer | null;
}

export interface ComputedMatchPlayerStats {
    playerId: string;
    name: string;
    jerseyNumber?: number;
    goals: number;
    assists: number;
    blocks: number;
    callahans: number;
    completions: number;
    drops: number;
    throwaways: number;
}