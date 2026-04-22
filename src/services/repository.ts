// src/services/repository.ts

// src/services/repository.ts

import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    getDoc,
    setDoc,
    deleteDoc,
    arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';
import type { TeamProfile, Player, Tournament, TournamentPlayer, Match, MatchEvent } from '../types';
export const getUserTeams = (userId: string, callback: (teams: TeamProfile[]) => void) => {
    const q = query(collection(db, "teams"), where(`members.${userId}`, "!=", null));
    return onSnapshot(q, (snapshot: any) => {
        const teamsData = snapshot.docs.map((doc: any) => ({
            teamId: doc.id,
            ...doc.data()
        } as TeamProfile));
        callback(teamsData);
    });
};

export const getPlayers = (teamId: string, callback: (players: Player[]) => void) => {
    const q = query(collection(db, `teams/${teamId}/players`));
    return onSnapshot(q, (snapshot: any) => {
        const playersData = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                photoUrl: data.photoUrl || data.photoURL || null
            } as Player;
        });
        callback(playersData);
    });
};

export const getTournaments = (teamId: string, callback: (tournaments: Tournament[]) => void) => {
    const q = query(collection(db, `teams/${teamId}/tournaments`));
    return onSnapshot(q, (snapshot: any) => {
        const tournamentsData = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        } as Tournament));
        callback(tournamentsData);
    });
};

export const getTournamentMatches = (teamId: string, tournamentId: string, callback: (matches: any[]) => void) => {
    const q = query(collection(db, `teams/${teamId}/tournaments/${tournamentId}/matches`));
    return onSnapshot(q, (snapshot: any) => {
        const matchesData = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(matchesData);
    });
};

export const getTournamentPlayers = (teamId: string, tournamentId: string, callback: (players: TournamentPlayer[]) => void) => {
    const q = query(collection(db, `teams/${teamId}/tournaments/${tournamentId}/players`));
    return onSnapshot(q, (snapshot: any) => {
        const playersData = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        } as TournamentPlayer));
        callback(playersData);
    });
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
const API_URL = "http://localhost:3000";

export const getMatch = (tournamentId: string, matchId: string, callback: (match: Match | null) => void) => {
    const activeTeamId = localStorage.getItem('selectedTeamId');
    if (!activeTeamId) {
        callback(null);
        return () => {};
    }

    const matchDocRef = doc(db, 'teams', activeTeamId, 'tournaments', tournamentId, 'matches', matchId);
    return onSnapshot(matchDocRef, (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as Match);
        } else {
            callback(null);
        }
    });
};

export const getMatchEvents = (tournamentId: string, matchId: string, callback: (events: MatchEvent[]) => void) => {
    const activeTeamId = localStorage.getItem('selectedTeamId');
    if (!activeTeamId) {
        callback([]);
        return () => {};
    }

    const eventsCollectionRef = collection(db, 'teams', activeTeamId, 'tournaments', tournamentId, 'matches', matchId, 'events');

    const unsubscribe = onSnapshot(eventsCollectionRef, (querySnapshot: any) => {
        const events = querySnapshot.docs.map((docSnap: any) => ({
            id: docSnap.id,
            ...docSnap.data(),
        } as MatchEvent));
        
        callback(events.sort((a: any, b: any) => (a.timestamp ?? 0) - (b.timestamp ?? 0)));
    });

    return unsubscribe;
};
// src/services/repository.ts dosyasına eklenecek:


// ... (diğer importlar aynı)

// createMatch fonksiyonunu revize ediyoruz
// src/services/repository.ts içindeki ilgili fonksiyonları bu şekilde revize edin

// --- GÜNCELLENEN: createMatch (BACKEND API) ---
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

export const getTrainings = (teamId: string, callback: (trainings: any[]) => void) => {
    const trainingsRef = collection(db, `teams/${teamId}/trainings`);
    return onSnapshot(trainingsRef, (snapshot: any) => {
        const trainingsData = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        })) as any[];
        
        trainingsData.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        callback(trainingsData);
    });
};

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