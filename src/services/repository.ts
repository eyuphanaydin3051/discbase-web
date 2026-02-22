import {
    collection,
    query,
    where,
    onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import type { TeamProfile, Player, Tournament, TournamentPlayer } from '../types';
import { getDocs } from 'firebase/firestore';
import type { Match, PlayerStats } from '../types';

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
    // 'goals' (gol sayısı) alanına göre sıralama yapabilirsiniz, ancak burada ham veriyi çekiyoruz.
    const q = query(collection(db, `teams/${teamId}/tournaments/${tournamentId}/players`));

    return onSnapshot(q, (snapshot) => {
        const playersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as TournamentPlayer));
        callback(playersData);
    });
};
// Oyuncunun tüm kariyer istatistiklerini hesaplayan fonksiyon
export const getPlayerCareerStats = async (teamId: string, playerId: string) => {
    try {
        // 1. Takımın tüm turnuvalarını çek
        const tourSnapshot = await getDocs(collection(db, `teams/${teamId}/tournaments`));
        
        let allMatches: Match[] = [];
        let passDistribution: Record<string, number> = {};
        // 2. Her turnuvanın içindeki maçları çek
        for (const tourDoc of tourSnapshot.docs) {
            const matchesSnapshot = await getDocs(collection(db, `teams/${teamId}/tournaments/${tourDoc.id}/matches`));
            const matchesData = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
            allMatches = [...allMatches, ...matchesData];
        }

        // 3. Değişkenleri tanımla
        let goals = 0, assists = 0, blocks = 0, drops = 0, throwaways = 0;
        let catches = 0, passes = 0, oPoints = 0, dPoints = 0, pointsPlayed = 0;

        // 4. Maçlardaki her bir "sayı (point)" verisini analiz et
        allMatches.forEach(match => {
            if (!match.pointsArchive) return;
            
            match.pointsArchive.forEach(point => {
                const pStat = point.stats?.find(s => s.playerId === playerId);
                if (pStat) {
                    pointsPlayed++;
                    if (point.startMode === 'OFFENSE') oPoints++;
                    if (point.startMode === 'DEFENSE') dPoints++;

                    goals += pStat.goal || 0;
                    assists += pStat.assist || 0;
                    blocks += pStat.block || 0;
                    drops += pStat.drop || 0;
                    throwaways += pStat.throwaway || 0;
                    catches += pStat.catchStat || 0;
                    passes += pStat.successfulPass || 0;
                    if (pStat.passDistribution) {
                        Object.entries(pStat.passDistribution).forEach(([targetName, count]) => {
                            passDistribution[targetName] = (passDistribution[targetName] || 0) + count;
                        });
                    }
                }
            });
        });

        // 5. Yüzdelik ve +/- Hesaplamaları
        const plusMinus = (goals + assists + blocks) - (throwaways + drops);
        const catchRate = (catches + drops) > 0 ? Math.round((catches / (catches + drops)) * 100) : 0;
        const passRate = (passes + throwaways) > 0 ? Math.round((passes / (passes + throwaways)) * 100) : 0;

        return {
            goals, assists, blocks, drops, throwaways, catches, passes,
            oPoints, dPoints, pointsPlayed, plusMinus, catchRate, passRate,passDistribution
        };
    } catch (error) {
        console.error("İstatistikler çekilirken hata oluştu:", error);
        return null;
    }
};