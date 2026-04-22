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
import { arrayUnion } from 'firebase/firestore';
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

        await updateDoc(tournamentRef, {
            lastUpdated: Date.now()
        });
        
        return newMatchDoc.id;
    } catch (error) {
        console.error("Maç oluşturulurken hata:", error);
        return null;
    }
};

// YENİ EKLENEN: updateMatchData (Eksik fonksiyon eklendi)
export const updateMatchData = async (teamId: string, tournamentId: string, data: any) => {
    try {
        const matchRef = doc(db, `teams/${teamId}/tournaments/${tournamentId}/matches/${data.id}`);
        const { id, ...updateFields } = data;
        await updateDoc(matchRef, updateFields);
        return true;
    } catch (error) {
        console.error("Maç güncellenirken hata:", error);
        return false;
    }
};

// --- MATCH TRACKING (CANLI İSTATİSTİK) FONKSİYONLARI ---









// ... diğer importlar ...

// YENİ EKLENEN/GÜNCELLENEN: Olayı maçın içine dizi elemanı olarak kaydeder
export const addMatchEvent = async (tournamentId: string, matchId: string, event: any) => {
    try {
        const teamId = localStorage.getItem('selectedTeamId');
        if (!teamId) return;

        // Maçın yolunu buluyoruz (Kendi veritabanı ağacınıza göre güncelleyin)
        const matchRef = doc(db, `teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}`);
        
        // arrayUnion ile olayı var olan dizinin içine (diğer verileri bozmadan) itiyoruz
        await updateDoc(matchRef, {
            events: arrayUnion(event)
        });
    } catch (error) {
        console.error("Video olayı kaydedilirken hata:", error);
    }
};

// YENİ EKLENEN/GÜNCELLENEN: Son olayı geri alır (Undo)
export const undoLastEvent = async (tournamentId: string, matchId: string) => {
    try {
        const teamId = localStorage.getItem('selectedTeamId');
        if (!teamId) return;

        const matchRef = doc(db, `teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}`);
        const matchSnap = await getDoc(matchRef);
        
        if (matchSnap.exists()) {
            const matchData = matchSnap.data();
            const events = matchData.events || [];
            
            if (events.length > 0) {
                // Zaman damgasına göre ARTAN sırada sırala (eskiden yeniye)
                const sortedEvents = events.sort((a: any, b: any) => a.timestamp - b.timestamp);
                
                // En son ekleneni (dizinin en sonundaki elemanı) çıkar
                const eventsToKeep = sortedEvents.slice(0, -1);
                
                await updateDoc(matchRef, { events: eventsToKeep });
            }
        }
    } catch (error) {
        console.error("Geri alırken hata:", error);
    }
};

export const archivePoint = async (tournamentId: string, matchId: string, lineup: string[], startMode: 'OFFENSE' | 'DEFENSE', whoScored: 'US' | 'THEM', pointStats: any[] = []) => {
    const teamId = localStorage.getItem('selectedTeamId');
    if (!teamId) return;

    const matchRef = doc(db, 'teams', teamId, 'tournaments', tournamentId, 'matches', matchId);
    const matchSnap = await getDoc(matchRef);
    if (!matchSnap.exists()) return;

    const matchData = matchSnap.data();

    // DÜZELTME: Sadece 'lineup' içindeki 7 oyuncuyu değil, o sayı içinde yer almış (pointStats içinde bulunan)
    // tüm oyuncuları (oyundan sakatlık/değişiklik ile çıkanlar da dahil) hesaba katarak arşivle.
    const allPlayerIds = Array.from(new Set([...lineup, ...pointStats.map(s => s.playerId)]));

    const statsToArchive = allPlayerIds.map(playerId => {
        const pStat = pointStats.find(s => s.playerId === playerId);
        return {
            playerId: playerId,
            pointsPlayed: 1, // Her halükarda kadrodaysa veya girip çıktıysa 1 puan oynadı
            goal: pStat?.goal || 0,
            assist: pStat?.assist || 0,
            block: pStat?.block || 0,
            successfulPass: pStat?.successfulPass || 0,
            throwaway: pStat?.throwaway || 0,
            drop: pStat?.drop || 0,
            callahan: pStat?.callahan || 0,
            catchStat: pStat?.catchStat || 0,
            passDistribution: pStat?.passDistribution || {},
            pullAttempts: pStat?.pullAttempts || 0,
            successfulPulls: pStat?.successfulPulls || 0,
            totalPulls: pStat?.totalPulls || 0,
            totalPullTimeSeconds: pStat?.totalPullTimeSeconds || 0
        };
    });

    const newPoint = {
        id: Date.now().toString(),
        startMode,
        whoScored,
        playerIds: allPlayerIds, // DÜZELTME: Giren ve çıkanlar dahil tüm oyuncuların ID'sini sakla
        stats: statsToArchive,
        durationSeconds: 0 
    };

    let newScoreUs = matchData.scoreUs ?? matchData.score?.[0] ?? 0;
    let newScoreThem = matchData.scoreThem ?? matchData.score?.[1] ?? 0;
    
    if (whoScored === 'US') newScoreUs += 1;
    else if (whoScored === 'THEM') newScoreThem += 1;

    await updateDoc(matchRef, {
        pointsArchive: arrayUnion(newPoint),
        scoreUs: newScoreUs,
        scoreThem: newScoreThem,
        score: [newScoreUs, newScoreThem] 
    });

    // KRİTİK EKSİK: Sayı kaydedildiğinde istatistiklerin web arayüzüne hemen yansıması için 
    // turnuvanın lastUpdated alanını güncelliyoruz.
    const tournamentRef = doc(db, 'teams', teamId, 'tournaments', tournamentId);
    await updateDoc(tournamentRef, {
        lastUpdated: Date.now()
    });
};

// Maçı ve içindeki verileri silme fonksiyonu
export const deleteMatch = async (tournamentId: string, matchId: string) => {
    try {
        const teamId = localStorage.getItem('selectedTeamId');
        if (!teamId) return false;
        
        const matchRef = doc(db, `teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}`);
        await deleteDoc(matchRef);
        return true;
    } catch (error) {
        console.error("Maç silinirken hata oluştu:", error);
        return false;
    }
};
// src/services/repository.ts dosyasının içine uygun bir yere ekleyin:

export const deleteLastPoint = async (tournamentId: string, matchId: string) => {
    const teamId = localStorage.getItem('selectedTeamId');
    if (!teamId) return;

    const matchRef = doc(db, `teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}`);
    const matchSnap = await getDoc(matchRef);
    
    if (matchSnap.exists()) {
        const matchData = matchSnap.data();
        const pointsArchive = matchData.pointsArchive || [];
        const events = matchData.events || []; // Event geçmişini de çektik
        
        if (pointsArchive.length > 0) {
            const lastPoint = pointsArchive[pointsArchive.length - 1];
            
            // Son sayıyı arşivden çıkar
            const newArchive = pointsArchive.slice(0, -1);
            
            // Skoru geri al
            let newScoreUs = matchData.scoreUs || 0;
            let newScoreThem = matchData.scoreThem || 0;
            
            if (lastPoint.whoScored === 'US' && newScoreUs > 0) newScoreUs--;
            if (lastPoint.whoScored === 'THEM' && newScoreThem > 0) newScoreThem--;

            // Sildiğimiz sayıya ait olayları "events" listesinden temizliyoruz
            const sortedEvents = events.sort((a: any, b: any) => a.timestamp - b.timestamp);
            let scoreEventIndices: number[] = [];
            
            // Sondan geriye doğru skor yaratan olayları buluyoruz
            for (let i = sortedEvents.length - 1; i >= 0; i--) {
                const type = sortedEvents[i].eventType;
                if (type === 'Goal' || type === 'Callahan' || type === 'OpponentGoal') {
                    scoreEventIndices.push(i);
                }
            }

            let newEvents = [];
            if (scoreEventIndices.length > 1) {
                // Sildiğimiz sayıdan bir önceki sayıya kadar olan tüm eventleri koru
                newEvents = sortedEvents.slice(0, scoreEventIndices[1] + 1);
            } else {
                // Ekranda sadece 1 skor varsa veya henüz hiç yoksa tüm geçmişi temizle
                newEvents = [];
            }

            // Firebase'i güncelle (Sayı, Skorlar ve Temizlenmiş Event Geçmişi ile)
            await updateDoc(matchRef, {
                pointsArchive: newArchive,
                scoreUs: newScoreUs,
                scoreThem: newScoreThem,
                score: [newScoreUs, newScoreThem],
                events: newEvents
            });

            // KRİTİK EKSİK: Sayı silindiğinde de istatistiklerin yenilenmesi için tetikliyoruz.
            const tournamentRef = doc(db, 'teams', teamId, 'tournaments', tournamentId);
            await updateDoc(tournamentRef, {
                lastUpdated: Date.now()
            });
        }
    }
};
// --- ANTRENMAN (TRAINING) FONKSİYONLARI ---

export const getTrainings = (teamId: string, callback: (trainings: any[]) => void) => {
    const trainingsRef = collection(db, `teams/${teamId}/trainings`);
    return onSnapshot(trainingsRef, (snapshot) => {
        const trainingsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as any[];
        // Tarihe göre sırala (En yeni en üstte)
        trainingsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        callback(trainingsData);
    });
};

export const saveTraining = async (teamId: string, training: any) => {
    try {
        const trainingRef = doc(db, `teams/${teamId}/trainings`, training.id);
        await setDoc(trainingRef, training, { merge: true });
        return true;
    } catch (error) {
        console.error("Antrenman kaydedilirken hata:", error);
        return false;
    }
};

export const deleteTraining = async (teamId: string, trainingId: string) => {
    try {
        await deleteDoc(doc(db, `teams/${teamId}/trainings`, trainingId));
        return true;
    } catch (error) {
        console.error("Antrenman silinirken hata:", error);
        return false;
    }
};