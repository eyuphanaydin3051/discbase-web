import {
    collection,
    query,
    where,
    onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import type { TeamProfile, Player, Tournament } from '../types';
import type { TournamentPlayer } from '../types';

// Mevcut fonksiyonlarınız (getUserTeams, getPlayers, getTournaments) burada duruyor olmalı...
export const getUserTeams = (userId: string, callback: (teams: TeamProfile[]) => void) => {
    const q = query(collection(db, "teams"), where(`members.${userId}`, "!=", null));
    return onSnapshot(q, (snapshot) => {
        const teamsData = snapshot.docs.map(doc => ({
            teamId: doc.id,
            ...doc.data()
        } as TeamProfile));
        callback(teamsData);
    });
};

export const getPlayers = (teamId: string, callback: (players: Player[]) => void) => {
    const q = query(collection(db, `teams/${teamId}/players`));
    return onSnapshot(q, (snapshot) => {
        const playersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Player));
        callback(playersData);
    });
};

export const getTournaments = (teamId: string, callback: (tournaments: Tournament[]) => void) => {
    const q = query(collection(db, `teams/${teamId}/tournaments`));
    return onSnapshot(q, (snapshot) => {
        const tournamentsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Tournament));
        callback(tournamentsData);
    });
};

// --- YENİ EKLENEN FONKSİYON ---
export const getTournamentMatches = (teamId: string, tournamentId: string, callback: (matches: any[]) => void) => {
    const q = query(collection(db, `teams/${teamId}/tournaments/${tournamentId}/matches`));
    return onSnapshot(q, (snapshot) => {
        const matchesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(matchesData);
    });
};
export const getTournamentPlayers = (teamId: string, tournamentId: string, callback: (players: TournamentPlayer[]) => void) => {
    // Veritabanı yolu: teams/{teamId}/tournaments/{tournamentId}/players
    // İsterseniz 'goals' veya 'name' e göre sıralama yapabilirsiniz.
    const q = query(collection(db, `teams/${teamId}/tournaments/${tournamentId}/players`));

    return onSnapshot(q, (snapshot) => {
        const playersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as TournamentPlayer));
        callback(playersData);
    });
};