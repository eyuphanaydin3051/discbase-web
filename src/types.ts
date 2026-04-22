// src/types.ts

// --- Temel Tipler ve Enumlar ---
export type GameMode = 'IDLE' | 'MODE_SELECTION' | 'SIMPLE_ENTRY' | 'DEFENSE_PULL' | 'DEFENSE_PULL_RESULT' | 'OFFENSE' | 'DEFENSE';
export type CaptureMode = 'SIMPLE' | 'ADVANCED' | 'PRO';
export type PointStartMode = 'OFFENSE' | 'DEFENSE';
export type LineType = 'FULL' | 'HANDLER_SET' | 'CUTTER_SET';
export type StoppageType = 'TIMEOUT' | 'INJURY' | 'CALL' | 'OTHER';
export type CalculationMode = 'TOTAL' | 'PER_MATCH' | 'PER_POINT';

// --- Ana Veri Yapıları ---
export interface UserProfile {
    displayName: string | null;
    email: string | null;
}

export interface EfficiencyCriterion {
    id: string;
    name: string;
    statType: 'GOAL' | 'ASSIST' | 'BLOCK' | 'THROWAWAY' | 'DROP' | 'CALLAHAN' | 'PASS_COUNT' | 'POINTS_PLAYED' | 'CATCH_COUNT' | string;
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
    totalPulls?: number;
    [key: string]: any; // TS'in esnek istatistik anahtarlarına izin vermesi için
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

// --- MAÇ VE OLAY YÖNETİMİ (CANLI VE GEÇMİŞ MAÇLAR BİRLEŞTİRİLDİ) ---
export interface MatchEventPlayer {
    id: string;
    name: string;
    jerseyNumber?: number;
    photoUrl?: string | null;
}

export interface MatchEvent {
    id: string;
    matchId: string;
    teamId: string;
    playerId?: string | null;
    secondaryPlayerId?: string | null;
    eventType: 'Goal' | 'Assist' | 'D-Up' | 'Callahan' | 'Completion' | 'Drop' | 'Throwaway' | 'Start' | 'Half' | 'End' | 'Timeout' | 'Interception' | 'Stall' | string;
    timestamp: number;
    currentScore: number[];
    period: number;
    description?: string;
    player?: MatchEventPlayer | null;
    secondaryPlayer?: MatchEventPlayer | null;
    videoTimestampSeconds?: number; // YENİ EKLENEN: Video içindeki saniye (Opsiyonel)
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

export interface Match {
    id: string;
    youtubeVideoId?: string;
    // --- Geçmiş/Turnuva Maçları (TournamentDetail) İçin Gerekli Alanlar ---
    opponentName?: string;
    ourTeamName?: string;
    scoreUs?: number;
    scoreThem?: number;
    pointsArchive?: PointData[];
    matchDurationSeconds?: number;
    isProMode?: boolean;
    date?: string;
    events?: MatchEvent[];
    playerStats?: Record<string, any>;
    
    // --- Canlı Maçlar (MatchDetail) İçin Gerekli Alanlar ---
    tournamentId?: string;
    teamIds?: string[];
    teamNames: string[]; // MatchDetail ekranında hata vermemesi için zorunlu (required)
    score: number[];     // MatchDetail ekranında hata vermemesi için zorunlu (required)
    period?: number;
    timer?: number;
    timerRunning?: boolean;
    genderType?: string;
    creatorUid?: string;
    startTime?: number;
    endTime?: number;
    finished?: boolean;
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
export type NameFormat = 'FULL_NAME' | 'FIRST_NAME_LAST_INITIAL' | 'INITIAL_LAST_NAME';

export interface UserSettings {
    theme: 'light' | 'dark' | 'system';
    language: 'tr' | 'en';
    nameFormat: NameFormat;
    efficiencyCriteria: EfficiencyCriterion[];
}