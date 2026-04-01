// src/services/repository.ts

// src/services/repository.ts

import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    getDocs,
    getDoc,
    setDoc, // setDoc eklendi
    deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import type { TeamProfile, Player, Tournament, TournamentPlayer, Match, MatchEvent } from '../types';
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
        const playersData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Hem 'photoUrl' hem de 'photoURL' ihtimallerini kontrol edip atıyoruz
                photoUrl: data.photoUrl || data.photoURL || null
            } as Player;
        });
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
    const q = query(collection(db, `teams/${teamId}/tournaments/${tournamentId}/players`));
    return onSnapshot(q, (snapshot) => {
        const playersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as TournamentPlayer));
        callback(playersData);
    });
};

// --- YENİ EKLENEN: OYUNCU GÜNCELLEME ---
export const updatePlayer = async (teamId: string, player: Player) => {
    try {
        const playerRef = doc(db, `teams/${teamId}/players`, player.id);
        await updateDoc(playerRef, {
            name: player.name,
            jerseyNumber: player.jerseyNumber,
            position: player.position,
            isCaptain: player.isCaptain,
            photoUrl: player.photoUrl // Fotoğraf güncellemesi için
        });
        return true;
    } catch (error) {
        console.error("Oyuncu güncellenirken hata:", error);
        return false;
    }
};

// --- GÜNCELLENEN: TAKIM ORTALAMALARINI VE PERFORMANSINI HESAPLA ---
export const getTeamAggregates = async (teamId: string) => {
    try {
        const tourSnapshot = await getDocs(collection(db, `teams/${teamId}/tournaments`));
        let allMatches: Match[] = [];
        
        for (const tourDoc of tourSnapshot.docs) {
            const matchesSnapshot = await getDocs(collection(db, `teams/${teamId}/tournaments/${tourDoc.id}/matches`));
            const matchesData = matchesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Match));
            allMatches = [...allMatches, ...matchesData];
        }

        let totalGoals = 0, totalAssists = 0, totalBlocks = 0, totalTurns = 0, totalDrops = 0;
        let totalSuccessfulPass = 0;
        let oPoints = 0, oHolds = 0, cleanHolds = 0;
        let dPoints = 0, dBreaks = 0;
        let totalPointsPlayed = 0;
        let totalBlockPoints = 0;
        let blocksConvertedToGoals = 0;
        let uniquePlayerIds = new Set<string>();

        const totalMatches = allMatches.length;

        // Her maçı ve oynanan her sayıyı (point) tek tek tarıyoruz
        allMatches.forEach(match => {
            match.pointsArchive?.forEach(point => {
                totalPointsPlayed++; // Oynanan her pozisyonu/sayıyı say
                let pointHasOurGoal = false;
                let pointTurnovers = 0; // Bu sayı içinde yapılan toplam top kaybı
                let pointBlocks = 0; // Bu sayı içinde yapılan toplam blok

                point.stats?.forEach(stat => {
                    uniquePlayerIds.add(stat.playerId);
                    totalGoals += stat.goal || 0;
                    totalAssists += stat.assist || 0;
                    totalBlocks += stat.block || 0;
                    totalTurns += stat.throwaway || 0;
                    totalDrops += stat.drop || 0;
                    totalSuccessfulPass += stat.successfulPass || 0;
                    
                    pointTurnovers += (stat.throwaway || 0) + (stat.drop || 0);
                    pointBlocks += stat.block || 0;

                    if (stat.goal && stat.goal > 0) {
                        pointHasOurGoal = true; 
                    }
                });

                // Blok Dönüşümü Hesabı (App ile birebir aynı: Blok olan sayılarda gol attık mı?)
                if (pointBlocks > 0) {
                    totalBlockPoints++;
                    if (pointHasOurGoal) {
                        blocksConvertedToGoals++;
                    }
                }

                // Verimlilik: Hold, Break ve Clean Hold (Hatasız Hücum) Hesabı
                if (point.startMode === 'OFFENSE') {
                    oPoints++;
                    if (pointHasOurGoal) {
                        oHolds++;
                        if (pointTurnovers === 0) cleanHolds++; // Hiç turnover yapmadan sayı olduysa
                    }
                } else if (point.startMode === 'DEFENSE') {
                    dPoints++;
                    if (pointHasOurGoal) dBreaks++;
                }
            });
        });

        const playerCount = uniquePlayerIds.size || 1;
        const absoluteTurnovers = totalTurns + totalDrops;
        
        // Uygulamadaki Gerçek Pas ve Verimlilik (Possession) Hesaplaması
        const totalPassesCompleted = totalSuccessfulPass + totalAssists;
        const totalPassAttempts = totalPassesCompleted + totalTurns;
        const totalPossessions = totalGoals + totalTurns + totalDrops;

        return {
            totalMatches,
            totalPointsPlayed,
            avgGoals: parseFloat((totalGoals / playerCount).toFixed(1)),
            avgAssists: parseFloat((totalAssists / playerCount).toFixed(1)),
            avgBlocks: parseFloat((totalBlocks / playerCount).toFixed(1)),
            avgTurns: parseFloat((absoluteTurnovers / playerCount).toFixed(1)),
            holdPercentage: oPoints > 0 ? ((oHolds / oPoints) * 100).toFixed(1) : 0,
            breakPercentage: dPoints > 0 ? ((dBreaks / dPoints) * 100).toFixed(1) : 0,
            passSuccess: totalPassAttempts > 0 ? ((totalPassesCompleted / totalPassAttempts) * 100).toFixed(1) : 0,
            conversionRate: totalPossessions > 0 ? ((totalGoals / totalPossessions) * 100).toFixed(1) : 0,
            blockConversionRate: totalBlockPoints > 0 ? ((blocksConvertedToGoals / totalBlockPoints) * 100).toFixed(1) : 0,
            totalPassAttempts,
            totalPassesCompleted,
            totalTurnovers: absoluteTurnovers,
            totalPossessions,
            totalGoals,
            cleanHolds,
            totalBlockPoints,
            blocksConvertedToGoals,
            oHolds, oPoints,
            dBreaks, dPoints
        };
    } catch (e) {
        console.error("Takım ortalamaları hatası:", e);
        return null;
    }
};

// --- GÜNCELLENEN: Oyuncunun tüm kariyer istatistiklerini hesaplayan fonksiyon ---
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
                    
                    // Pas dağılımını hesapla
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
            oPoints, dPoints, pointsPlayed, plusMinus, catchRate, passRate, passDistribution
        };
    } catch (error) {
        console.error("İstatistikler çekilirken hata oluştu:", error);
        return null;
    }
};
export const getMatch = async (tournamentId: string, matchId: string): Promise<Match | null> => {
    // BURASI DÜZELTİLDİ: activeTeamId yerine selectedTeamId
    const activeTeamId = localStorage.getItem('selectedTeamId');
    if (!activeTeamId) return null;

    const matchDocRef = doc(db, 'teams', activeTeamId, 'tournaments', tournamentId, 'matches', matchId);
    const matchSnap = await getDoc(matchDocRef);

    if (matchSnap.exists()) {
        return { id: matchSnap.id, ...matchSnap.data() } as Match;
    }
    return null;
};

export const getMatchEvents = (tournamentId: string, matchId: string, callback: (events: MatchEvent[]) => void) => {
    // BURASI DÜZELTİLDİ: activeTeamId yerine selectedTeamId
    const activeTeamId = localStorage.getItem('selectedTeamId');
    if (!activeTeamId) {
        callback([]);
        return () => {};
    }

    const eventsCollectionRef = collection(db, 'teams', activeTeamId, 'tournaments', tournamentId, 'matches', matchId, 'events');

    const unsubscribe = onSnapshot(eventsCollectionRef, (querySnapshot) => {
        const events = querySnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
        } as MatchEvent));
        
        callback(events.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)));
    });

    return unsubscribe;
};
// src/services/repository.ts dosyasına eklenecek:


// ... (diğer importlar aynı)

// createMatch fonksiyonunu revize ediyoruz
// src/services/repository.ts içindeki ilgili fonksiyonları bu şekilde revize edin

// --- GÜNCELLENEN: createMatch ---
export const createMatch = async (teamId: string, tournamentId: string, opponentName: string, ourTeamName: string) => {
    try {
        const tournamentRef = doc(db, 'teams', teamId, 'tournaments', tournamentId);
        const matchesRef = collection(tournamentRef, 'matches');
        const newMatchDoc = doc(matchesRef);
        
        const newMatch: Match = {
            id: newMatchDoc.id,
            opponentName: opponentName,
            ourTeamName: ourTeamName, 
            scoreUs: 0,
            scoreThem: 0,
            pointsArchive: [],
            matchDurationSeconds: 0,
            isProMode: false, 
            date: new Date().toISOString(),
            tournamentId: tournamentId,
            teamNames: [ourTeamName, opponentName],
            score: [0, 0],
            finished: false
        };
        
        // 1. Maçı alt koleksiyona kaydet
        await setDoc(newMatchDoc, newMatch);

        // 2. KRİTİK: Ana turnuva belgesini güncelle ki Android'deki 'getTournaments' tetiklensin
        // Android tarafı bu alanı dinleyerek verileri yeniler.
        await updateDoc(tournamentRef, {
            lastUpdated: Date.now()
        });
        
        return newMatchDoc.id;
    } catch (error) {
        console.error("Maç oluşturulurken hata:", error);
        return null;
    }
};

// --- GÜNCELLENEN: updateMatchData ---
export const updateMatchData = async (teamId: string, tournamentId: string, match: Match) => {
    try {
        const tournamentRef = doc(db, 'teams', teamId, 'tournaments', tournamentId);
        const matchRef = doc(tournamentRef, 'matches', match.id);
        
        // 1. Maç verilerini güncelle
        await updateDoc(matchRef, { ...match });

        // 2. KRİTİK: Android uygulamasının anlık olarak değişikliği görmesi için tetikleyici
        await updateDoc(tournamentRef, {
            lastUpdated: Date.now()
        });
        
        return true;
    } catch (error) {
        console.error("Maç güncellenirken hata:", error);
        return false;
    }
};
// --- MATCH TRACKING (CANLI İSTATİSTİK) FONKSİYONLARI ---

import { arrayUnion, arrayRemove } from 'firebase/firestore';

export const addMatchEvent = async (tournamentId: string, matchId: string, event: MatchEvent) => {
    const matchRef = doc(db, 'tournaments', tournamentId, 'matches', matchId);
    await updateDoc(matchRef, {
        events: arrayUnion(event)
    });
};

export const archivePoint = async (tournamentId: string, matchId: string, lineup: string[], startMode: 'OFFENSE' | 'DEFENSE', whoScored: 'US' | 'THEM') => {
    const matchRef = doc(db, 'tournaments', tournamentId, 'matches', matchId);
    const matchSnap = await getDoc(matchRef);
    if (!matchSnap.exists()) return;

    const matchData = matchSnap.data();
    const currentEvents = matchData.events || [];

    // Mevcut sahadaki 7 oyuncu için istatistik objesini sıfırdan oluştur
    const statsMap: Record<string, any> = {};
    lineup.forEach(id => {
        statsMap[id] = { playerId: id, goal: 0, assist: 0, block: 0, successfulPass: 0, throwaway: 0, drop: 0, callahan: 0, pointsPlayed: 1 };
    });

    // Event'leri sayılara dönüştür
    currentEvents.forEach((e: any) => {
        if (!e.playerId || !statsMap[e.playerId]) return;
        switch (e.eventType) {
            case 'Goal': statsMap[e.playerId].goal += 1; break;
            case 'Assist': statsMap[e.playerId].assist += 1; break;
            case 'D-Up': statsMap[e.playerId].block += 1; break;
            case 'Completion': statsMap[e.playerId].successfulPass += 1; break;
            case 'Throwaway': statsMap[e.playerId].throwaway += 1; break;
            case 'Drop': statsMap[e.playerId].drop += 1; break;
            case 'Callahan': statsMap[e.playerId].callahan += 1; break;
        }
    });

    const newPoint = {
        id: Date.now().toString(),
        startMode,
        whoScored,
        playerIds: lineup,
        stats: Object.values(statsMap),
        durationSeconds: 0 
    };

    let newScoreUs = matchData.scoreUs ?? matchData.score?.[0] ?? 0;
    let newScoreThem = matchData.scoreThem ?? matchData.score?.[1] ?? 0;
    
    if (whoScored === 'US') newScoreUs += 1;
    else if (whoScored === 'THEM') newScoreThem += 1;

    // Firebase'e arşivi pushla ve sahayı temizle
    await updateDoc(matchRef, {
        pointsArchive: arrayUnion(newPoint),
        events: [],
        scoreUs: newScoreUs,
        scoreThem: newScoreThem,
        score: [newScoreUs, newScoreThem] // Eski verilerle uyumluluk için
    });
};

export const undoLastEvent = async (tournamentId: string, matchId: string) => {
    const matchRef = doc(db, 'tournaments', tournamentId, 'matches', matchId);
    const matchSnap = await getDoc(matchRef);
    if (!matchSnap.exists()) return;

    const matchData = matchSnap.data();
    const events = matchData.events || [];

    // Eğer o an devam eden sayıda (events) aksiyon varsa son aksiyonu sil
    if (events.length > 0) {
        const lastEvent = events[events.length - 1];
        await updateDoc(matchRef, {
            events: arrayRemove(lastEvent)
        });
    } 
    // Eğer saha boşsa ve yanlışlıkla sayı verildiyse son sayıyı (pointsArchive) iptal et
    else {
        const pointsArchive = matchData.pointsArchive || [];
        if (pointsArchive.length > 0) {
            const lastPoint = pointsArchive[pointsArchive.length - 1];
            let newScoreUs = matchData.scoreUs ?? matchData.score?.[0] ?? 0;
            let newScoreThem = matchData.scoreThem ?? matchData.score?.[1] ?? 0;
            
            if (lastPoint.whoScored === 'US') newScoreUs = Math.max(0, newScoreUs - 1);
            else if (lastPoint.whoScored === 'THEM') newScoreThem = Math.max(0, newScoreThem - 1);

            await updateDoc(matchRef, {
                pointsArchive: arrayRemove(lastPoint),
                scoreUs: newScoreUs,
                scoreThem: newScoreThem,
                score: [newScoreUs, newScoreThem]
            });
        }
    }
};