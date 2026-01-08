// src/types.ts

// --- Temel Tipler ve Enumlar ---

export type GameMode =
    | 'IDLE'
    | 'MODE_SELECTION'
    | 'SIMPLE_ENTRY'
    | 'DEFENSE_PULL'
    | 'DEFENSE_PULL_RESULT'
    | 'OFFENSE'
    | 'DEFENSE';

export type CaptureMode = 'SIMPLE' | 'ADVANCED' | 'PRO';

export type PointStartMode = 'OFFENSE' | 'DEFENSE';

export type LineType = 'FULL' | 'HANDLER_SET' | 'CUTTER_SET';

// Android'deki Resource ID'li enumlar yerine String değerlerini kullanıyoruz
// Çünkü veritabanında (Firestore) "TIMEOUT", "INJURY" gibi string olarak saklanıyorlar.
export type StoppageType = 'TIMEOUT' | 'INJURY' | 'CALL' | 'OTHER';

export type CalculationMode = 'TOTAL' | 'PER_MATCH' | 'PER_POINT';

// --- Ana Veri Yapıları ---

export interface UserProfile {
    displayName: string | null;
    email: string | null;
}

export interface TeamProfile {
    teamId: string;
    teamName: string;
    members: { [uid: string]: string }; // Map<String, String> karşılığı: uid -> role ('admin', 'member')
    logoPath: string | null;
}

export interface Player {
    id: string;
    name: string;
    gender: string; // "Erkek" veya "Kadın" (DB değeri)
    jerseyNumber: number | null;
    position: string; // "Cutter" veya "Handler"
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
    catchStat: number; // 'catch' reserved word olduğu için catchStat kullanılmış olabilir
    drop: number;
    goal: number;
    pullAttempts: number;
    successfulPulls: number;
    block: number;
    callahan: number;
    secondsPlayed: number; // Long -> number
    totalTempoSeconds: number;
    pointsPlayed: number;
    totalPullTimeSeconds: number; // Double -> number
    passDistribution: { [playerName: string]: number }; // Map<String, Int>
}

export interface AdvancedPlayerStats {
    basicStats: PlayerStats;
    plusMinus: number;
    oPointsPlayed: number;
    dPointsPlayed: number;
}

export interface ProEventData {
    fromX: number | null; // Float -> number
    fromY: number | null;
    toX: number;
    toY: number;
    type: string; // "PASS", "GOAL", "TURNOVER" vb.
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
    matches: Match[]; // @get:Exclude olsa da web tarafında tam objeyi yönetmek için ekliyoruz
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

export interface AdvancedTeamStats {
    totalMatchesPlayed: number;
    wins: number;
    losses: number;
    totalPointsPlayed: number;
    totalGoals: number;
    totalAssists: number;
    totalSuccessfulPass: number;
    totalThrowaways: number;
    totalDrops: number;
    totalBlocks: number;
    totalPulls: number;
    totalOffensePoints: number;
    offensiveHolds: number;
    cleanHolds: number;
    totalDefensePoints: number;
    breakPointsScored: number;
    totalPassesAttempted: number;
    totalPassesCompleted: number;
    totalBlockPoints: number;
    blocksConvertedToGoals: number;
    totalPossessions: number;
    totalTempoSeconds: number;
    totalPullTimeSeconds: number;
}

// BackupData genellikle JSON import/export için kullanılır
export interface BackupData {
    profile: TeamProfile;
    players: Player[];
    tournaments: Tournament[];
    trainings: Training[];
}