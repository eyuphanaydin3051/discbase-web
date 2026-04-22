import type { TeamProfile, Player, Tournament, TournamentPlayer } from '../types';
const API_BASE = "http://localhost:3000/api";

export const getUserTeams = (userId: string, callback: (teams: TeamProfile[]) => void) => {
    fetch(`${API_BASE}/teams?userId=${userId}`)
        .then(res => res.json())
        .then(data => callback(data))
        .catch(err => console.error("Takımlar çekilemedi:", err));
    return () => {}; // Unsubscribe simülasyonu
};

export const getPlayers = (teamId: string, callback: (players: Player[]) => void) => {
    fetch(`${API_BASE}/teams/${teamId}/players`)
        .then(res => res.json())
        .then(data => callback(data))
        .catch(err => console.error("Oyuncular çekilemedi:", err));
    return () => {};
};

export const getTournaments = (teamId: string, callback: (tournaments: Tournament[]) => void) => {
    fetch(`${API_BASE}/teams/${teamId}/tournaments`)
        .then(res => res.json())
        .then(data => callback(data))
        .catch(err => console.error("Turnuvalar çekilemedi:", err));
    return () => {};
};

export const getTournamentMatches = (teamId: string, tournamentId: string, callback: (matches: any[]) => void) => {
    fetch(`${API_BASE}/teams/${teamId}/tournaments/${tournamentId}/matches`)
        .then(res => res.json())
        .then(data => callback(data))
        .catch(err => console.error("Maçlar çekilemedi:", err));
    return () => {};
};

export const getTrainings = (teamId: string, callback: (trainings: any[]) => void) => {
    fetch(`${API_BASE}/teams/${teamId}/trainings`)
        .then(res => res.json())
        .then(data => {
            data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            callback(data);
        })
        .catch(err => console.error("Antrenmanlar çekilemedi:", err));
    return () => {};
};







export const getTournamentPlayers = (teamId: string, tournamentId: string, callback: (players: TournamentPlayer[]) => void) => {
    fetch(`${API_BASE}/teams/${teamId}/tournaments/${tournamentId}/players`)
        .then(res => res.json())
        .then(data => callback(data))
        .catch(err => {
            console.error("Turnuva oyuncuları çekilemedi:", err);
            callback([]);
        });
    return () => {};
};

// --- YENİ EKLENEN: OYUNCU GÜNCELLEME (BACKEND API) ---
export const updatePlayer = async (teamId: string, player: Player) => {
    try {
        const API_URL = "http://localhost:3000";
        const response = await fetch(`${API_URL}/api/teams/${teamId}/players/${player.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(player)
        });
        return response.ok;
    } catch (error) {
        console.error("Oyuncu güncellenirken hata (API):", error);
        return false;
    }
};

// --- GÜNCELLENEN: TAKIM ORTALAMALARINI VE PERFORMANSINI HESAPLA (BACKEND API KULLANIR) ---
export const getTeamAggregates = async (teamId: string) => {
    try {
        const API_URL = "http://localhost:3000"; // Canlıya alınca burası değişecek
        const response = await fetch(`${API_URL}/api/teams/${teamId}/aggregates`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (e) {
        console.error("Takım ortalamaları API hatası:", e);
        return null;
    }
};

// --- GÜNCELLENEN: Oyuncunun tüm kariyer istatistiklerini hesaplayan fonksiyon (BACKEND API KULLANIR) ---
export const getPlayerCareerStats = async (teamId: string, playerId: string) => {
    try {
        const API_URL = "http://localhost:3000"; // Canlıya alınca burası değişecek
        const response = await fetch(`${API_URL}/api/teams/${teamId}/players/${playerId}/careerStats`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Oyuncu İstatistikleri API hatası:", error);
        return null;
    }
};

export const getMatch = async (tournamentId: string, matchId: string) => {
    const activeTeamId = localStorage.getItem('selectedTeamId');
    if (!activeTeamId) return null;

    try {
        const response = await fetch(`${API_BASE}/teams/${activeTeamId}/tournaments/${tournamentId}/matches/${matchId}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (err) {
        console.error("Maç detayı çekilemedi:", err);
        return null;
    }
};

export const getMatchEvents = async (tournamentId: string, matchId: string) => {
    const activeTeamId = localStorage.getItem('selectedTeamId');
    if (!activeTeamId) return [];

    try {
        const response = await fetch(`${API_BASE}/teams/${activeTeamId}/tournaments/${tournamentId}/matches/${matchId}`);
        if (!response.ok) return [];
        const data = await response.json();
        const events = data.events || [];
        return events.sort((a: any, b: any) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    } catch (err) {
        console.error("Maç olayları çekilemedi:", err);
        return [];
    }
};

export const createMatch = async (teamId: string, tournamentId: string, opponentName: string, ourTeamName: string) => {
    try {
        const API_URL = "http://localhost:3000";
        const response = await fetch(`${API_URL}/api/teams/${teamId}/tournaments/${tournamentId}/matches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ opponentName, ourTeamName })
        });
        if (!response.ok) throw new Error("API Hatası");
        const data = await response.json();
        return data.matchId;
    } catch (error) {
        console.error("Maç oluşturulurken hata (API):", error);
        return null;
    }
};

export const updateMatchData = async (teamId: string, tournamentId: string, data: any) => {
    try {
        const { id, ...updateFields } = data;
        const response = await fetch(`http://localhost:3000/api/teams/${teamId}/tournaments/${tournamentId}/matches/${data.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateFields)
        });
        return response.ok;
    } catch (error) {
        console.error("Maç güncellenirken API hatası:", error);
        return false;
    }
};

// --- MATCH TRACKING (CANLI İSTATİSTİK) FONKSİYONLARI ---









// ... diğer importlar ...

export const addMatchEvent = async (tournamentId: string, matchId: string, event: any) => {
    const teamId = localStorage.getItem('selectedTeamId');
    if (!teamId) return;
    try {
        await fetch(`http://localhost:3000/api/teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        });
    } catch (error) {
        console.error("Video olayı API hatası:", error);
    }
};

export const undoLastEvent = async (tournamentId: string, matchId: string) => {
    const teamId = localStorage.getItem('selectedTeamId');
    if (!teamId) return;
    try {
        await fetch(`http://localhost:3000/api/teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}/events/undo`, {
            method: 'DELETE'
        });
    } catch (error) {
        console.error("Undo event API hatası:", error);
    }
};

export const archivePoint = async (tournamentId: string, matchId: string, lineup: string[], startMode: 'OFFENSE' | 'DEFENSE', whoScored: 'US' | 'THEM', pointStats: any[] = []) => {
    const teamId = localStorage.getItem('selectedTeamId');
    if (!teamId) return;

    try {
        const API_URL = "http://localhost:3000";
        await fetch(`${API_URL}/api/teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}/archive-point`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lineup, startMode, whoScored, pointStats })
        });
    } catch (error) {
        console.error("Sayı arşivlenirken API hatası:", error);
    }
};

export const deleteMatch = async (tournamentId: string, matchId: string) => {
    const teamId = localStorage.getItem('selectedTeamId');
    if (!teamId) return false;
    try {
        const response = await fetch(`http://localhost:3000/api/teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}`, {
            method: 'DELETE'
        });
        return response.ok;
    } catch (error) {
        console.error("Maç silme API hatası:", error);
        return false;
    }
};

export const deleteLastPoint = async (tournamentId: string, matchId: string) => {
    const teamId = localStorage.getItem('selectedTeamId');
    if (!teamId) return;
    try {
        await fetch(`http://localhost:3000/api/teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}/points/undo`, {
            method: 'DELETE'
        });
    } catch (error) {
        console.error("Son sayı silme API hatası:", error);
    }
};
// --- ANTRENMAN (TRAINING) FONKSİYONLARI ---


export const saveTraining = async (teamId: string, training: any) => {
    try {
        const response = await fetch(`http://localhost:3000/api/teams/${teamId}/trainings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(training)
        });
        return response.ok;
    } catch (error) {
        console.error("Antrenman kaydetme API hatası:", error);
        return false;
    }
};

export const deleteTraining = async (teamId: string, trainingId: string) => {
    try {
        const response = await fetch(`http://localhost:3000/api/teams/${teamId}/trainings/${trainingId}`, {
            method: 'DELETE'
        });
        return response.ok;
    } catch (error) {
        console.error("Antrenman silme API hatası:", error);
        return false;
    }
};
export const getMatchStats = async (tournamentId: string, matchId: string) => {
    const activeTeamId = localStorage.getItem('selectedTeamId');
    if (!activeTeamId) return null;
    try {
        const response = await fetch(`${API_BASE}/teams/${activeTeamId}/tournaments/${tournamentId}/matches/${matchId}/stats`);
        return response.ok ? await response.json() : null;
    } catch (err) {
        console.error("Maç istatistikleri çekilemedi:", err);
        return null;
    }
};
export const getLeaderboard = async (teamId: string) => {
    try {
        const response = await fetch(`${API_BASE}/teams/${teamId}/leaderboard`);
        return response.ok ? await response.json() : [];
    } catch (err) {
        console.error("Leaderboard çekilemedi:", err);
        return [];
    }
};

export const getPlayersAsync = async (teamId: string) => {
    try {
        const response = await fetch(`${API_BASE}/teams/${teamId}/players`);
        return response.ok ? await response.json() : [];
    } catch (err) {
        console.error("Oyuncular çekilemedi:", err);
        return [];
    }
};

export const getUserTeamsAsync = async (userId: string) => {
    try {
        const response = await fetch(`${API_BASE}/teams?userId=${userId}`);
        return response.ok ? await response.json() : [];
    } catch (err) {
        console.error("Takımlar çekilemedi:", err);
        return [];
    }
};