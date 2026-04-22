const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Firebase Admin SDK'yı başlat
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json());

// 1. API Endpoint: TAKIM ORTALAMALARI
app.get('/api/teams/:teamId/aggregates', async (req, res) => {
    try {
        const { teamId } = req.params;
        const tourSnapshot = await db.collection(`teams/${teamId}/tournaments`).get();
        let allMatches = [];
        
        for (const tourDoc of tourSnapshot.docs) {
            const matchesSnapshot = await db.collection(`teams/${teamId}/tournaments/${tourDoc.id}/matches`).get();
            const matchesData = matchesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            allMatches = [...allMatches, ...matchesData];
        }

        let totalGoals = 0, totalAssists = 0, totalBlocks = 0, totalTurns = 0, totalDrops = 0;
        let totalSuccessfulPass = 0;
        let oPoints = 0, oHolds = 0, cleanHolds = 0;
        let dPoints = 0, dBreaks = 0;
        let totalPointsPlayed = 0, totalBlockPoints = 0, blocksConvertedToGoals = 0;
        let uniquePlayerIds = new Set();

        const totalMatches = allMatches.length;

        allMatches.forEach(match => {
            if(!match.pointsArchive) return;
            match.pointsArchive.forEach(point => {
                totalPointsPlayed++;
                let pointHasOurGoal = false;
                let pointTurnovers = 0;
                let pointBlocks = 0;

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

                    if (stat.goal && stat.goal > 0) pointHasOurGoal = true; 
                });

                if (pointBlocks > 0) {
                    totalBlockPoints++;
                    if (pointHasOurGoal) blocksConvertedToGoals++;
                }

                if (point.startMode === 'OFFENSE') {
                    oPoints++;
                    if (pointHasOurGoal) {
                        oHolds++;
                        if (pointTurnovers === 0) cleanHolds++;
                    }
                } else if (point.startMode === 'DEFENSE') {
                    dPoints++;
                    if (pointHasOurGoal) dBreaks++;
                }
            });
        });

        const playerCount = uniquePlayerIds.size || 1;
        const absoluteTurnovers = totalTurns + totalDrops;
        const totalPassesCompleted = totalSuccessfulPass + totalAssists;
        const totalPassAttempts = totalPassesCompleted + totalTurns;
        const totalPossessions = totalGoals + totalTurns + totalDrops;

        const result = {
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
            totalPassAttempts, totalPassesCompleted, totalTurnovers: absoluteTurnovers,
            totalPossessions, totalGoals, cleanHolds, totalBlockPoints,
            blocksConvertedToGoals, oHolds, oPoints, dBreaks, dPoints
        };

        res.json(result);
    } catch (e) {
        console.error("Takım ortalamaları hatası:", e);
        res.status(500).json({ error: e.message });
    }
});

// 2. API Endpoint: OYUNCU KARİYER İSTATİSTİKLERİ
app.get('/api/teams/:teamId/players/:playerId/careerStats', async (req, res) => {
    try {
        const { teamId, playerId } = req.params;
        const tourSnapshot = await db.collection(`teams/${teamId}/tournaments`).get();
        
        let allMatches = [];
        let passDistribution = {};
        
        for (const tourDoc of tourSnapshot.docs) {
            const matchesSnapshot = await db.collection(`teams/${teamId}/tournaments/${tourDoc.id}/matches`).get();
            const matchesData = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allMatches = [...allMatches, ...matchesData];
        }

        let goals = 0, assists = 0, blocks = 0, drops = 0, throwaways = 0;
        let catches = 0, passes = 0, oPoints = 0, dPoints = 0, pointsPlayed = 0;

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
                    passes += (pStat.successfulPass || 0) + (pStat.assist || 0);
                    
                    if (pStat.passDistribution) {
                        Object.entries(pStat.passDistribution).forEach(([targetName, count]) => {
                            passDistribution[targetName] = (passDistribution[targetName] || 0) + count;
                        });
                    }
                }
            });
        });

        const plusMinus = (goals + assists + blocks) - (throwaways + drops);
        const catchRate = (catches + drops) > 0 ? Math.round((catches / (catches + drops)) * 100) : 0;
        const passRate = (passes + throwaways) > 0 ? Math.round((passes / (passes + throwaways)) * 100) : 0;

        res.json({
            goals, assists, blocks, drops, throwaways, catches, passes,
            oPoints, dPoints, pointsPlayed, plusMinus, catchRate, passRate, passDistribution
        });
    } catch (error) {
        console.error("İstatistikler çekilirken hata oluştu:", error);
        res.status(500).json({ error: error.message });
    }
});
// --- 6. API Endpoint: MAÇ GÜNCELLEME ---
app.put('/api/teams/:teamId/tournaments/:tournamentId/matches/:matchId', async (req, res) => {
    try {
        const { teamId, tournamentId, matchId } = req.params;
        await db.doc(`teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}`).update(req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 7. API Endpoint: MAÇ OLAYI EKLEME (MATCH EVENT) ---
app.post('/api/teams/:teamId/tournaments/:tournamentId/matches/:matchId/events', async (req, res) => {
    try {
        const { teamId, tournamentId, matchId } = req.params;
        const matchRef = db.doc(`teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}`);
        await matchRef.update({
            events: admin.firestore.FieldValue.arrayUnion(req.body)
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 8. API Endpoint: SON OLAYI GERİ ALMA (UNDO EVENT) ---
app.delete('/api/teams/:teamId/tournaments/:tournamentId/matches/:matchId/events/undo', async (req, res) => {
    try {
        const { teamId, tournamentId, matchId } = req.params;
        const matchRef = db.doc(`teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}`);
        const matchSnap = await matchRef.get();
        
        if (matchSnap.exists) {
            const matchData = matchSnap.data();
            const events = matchData.events || [];
            if (events.length > 0) {
                const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
                const eventsToKeep = sortedEvents.slice(0, -1);
                await matchRef.update({ events: eventsToKeep });
            }
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 9. API Endpoint: MAÇI KOMPLE SİLME ---
app.delete('/api/teams/:teamId/tournaments/:tournamentId/matches/:matchId', async (req, res) => {
    try {
        const { teamId, tournamentId, matchId } = req.params;
        await db.doc(`teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}`).delete();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 10. API Endpoint: SON SAYIYI (POINT) GERİ ALMA ---
app.delete('/api/teams/:teamId/tournaments/:tournamentId/matches/:matchId/points/undo', async (req, res) => {
    try {
        const { teamId, tournamentId, matchId } = req.params;
        const matchRef = db.doc(`teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}`);
        const matchSnap = await matchRef.get();
        
        if (matchSnap.exists) {
            const matchData = matchSnap.data();
            const pointsArchive = matchData.pointsArchive || [];
            const events = matchData.events || []; 
            
            if (pointsArchive.length > 0) {
                const lastPoint = pointsArchive[pointsArchive.length - 1];
                const newArchive = pointsArchive.slice(0, -1);
                
                let newScoreUs = matchData.scoreUs || 0;
                let newScoreThem = matchData.scoreThem || 0;
                
                if (lastPoint.whoScored === 'US' && newScoreUs > 0) newScoreUs--;
                if (lastPoint.whoScored === 'THEM' && newScoreThem > 0) newScoreThem--;

                const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
                let scoreEventIndices = [];
                for (let i = sortedEvents.length - 1; i >= 0; i--) {
                    const type = sortedEvents[i].eventType;
                    if (type === 'Goal' || type === 'Callahan' || type === 'OpponentGoal') {
                        scoreEventIndices.push(i);
                    }
                }

                let newEvents = [];
                if (scoreEventIndices.length > 1) {
                    newEvents = sortedEvents.slice(0, scoreEventIndices[1] + 1);
                }

                await matchRef.update({
                    pointsArchive: newArchive,
                    scoreUs: newScoreUs,
                    scoreThem: newScoreThem,
                    score: [newScoreUs, newScoreThem],
                    events: newEvents
                });

                await db.doc(`teams/${teamId}/tournaments/${tournamentId}`).update({ lastUpdated: Date.now() });
            }
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 11. API Endpoint: ANTRENMAN KAYDET/GÜNCELLE ---
app.post('/api/teams/:teamId/trainings', async (req, res) => {
    try {
        const { teamId } = req.params;
        const training = req.body;
        await db.doc(`teams/${teamId}/trainings/${training.id}`).set(training, { merge: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 12. API Endpoint: ANTRENMAN SİL ---
app.delete('/api/teams/:teamId/trainings/:trainingId', async (req, res) => {
    try {
        const { teamId, trainingId } = req.params;
        await db.doc(`teams/${teamId}/trainings/${trainingId}`).delete();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// --- YENİ: TÜM OKUMA (READ) API ENDPOINT'LERİ ---

// Kullanıcının dahil olduğu takımları getir
app.get('/api/teams', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "userId gerekli" });
        
        // members nested objesinde userId'si olan takımları filtrele
        const snapshot = await db.collection('teams').where(`members.${userId}`, '!=', null).get();
        const teams = snapshot.docs.map(doc => ({ teamId: doc.id, ...doc.data() }));
        res.json(teams);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Takımın oyuncularını getir
app.get('/api/teams/:teamId/players', async (req, res) => {
    try {
        const { teamId } = req.params;
        const snapshot = await db.collection(`teams/${teamId}/players`).get();
        const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(players);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Takımın turnuvalarını getir
app.get('/api/teams/:teamId/tournaments', async (req, res) => {
    try {
        const { teamId } = req.params;
        const snapshot = await db.collection(`teams/${teamId}/tournaments`).get();
        const tournaments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(tournaments);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Turnuvanın maçlarını getir
app.get('/api/teams/:teamId/tournaments/:tournamentId/matches', async (req, res) => {
    try {
        const { teamId, tournamentId } = req.params;
        const snapshot = await db.collection(`teams/${teamId}/tournaments/${tournamentId}/matches`).get();
        const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(matches);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Takımın antrenmanlarını getir
app.get('/api/teams/:teamId/trainings', async (req, res) => {
    try {
        const { teamId } = req.params;
        const snapshot = await db.collection(`teams/${teamId}/trainings`).get();
        const trainings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(trainings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Spesifik bir maçın detayını getir (Maç Takip Ekranı İçin)
app.get('/api/teams/:teamId/tournaments/:tournamentId/matches/:matchId', async (req, res) => {
    try {
        const { teamId, tournamentId, matchId } = req.params;
        const doc = await db.doc(`teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}`).get();
        if (!doc.exists) return res.status(404).json({ error: "Maç bulunamadı" });
        res.json({ id: doc.id, ...doc.data() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend sunucusu ${PORT} portunda çalışıyor...`);
});
// --- 3. API Endpoint: OYUNCU GÜNCELLEME ---
app.put('/api/teams/:teamId/players/:playerId', async (req, res) => {
    try {
        const { teamId, playerId } = req.params;
        const playerData = req.body;
        
        await db.doc(`teams/${teamId}/players/${playerId}`).update({
            name: playerData.name,
            jerseyNumber: playerData.jerseyNumber,
            position: playerData.position,
            isCaptain: playerData.isCaptain,
            photoUrl: playerData.photoUrl
        });
        res.json({ success: true });
    } catch (error) {
        console.error("Oyuncu güncellenirken hata:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- 4. API Endpoint: MAÇ OLUŞTURMA ---
app.post('/api/teams/:teamId/tournaments/:tournamentId/matches', async (req, res) => {
    try {
        const { teamId, tournamentId } = req.params;
        const { opponentName, ourTeamName } = req.body;
        
        const tournamentRef = db.doc(`teams/${teamId}/tournaments/${tournamentId}`);
        const matchesRef = tournamentRef.collection('matches');
        
        const newMatchRef = matchesRef.doc(); // Otomatik ID oluşturur
        const newMatch = {
            id: newMatchRef.id,
            opponentName,
            ourTeamName, 
            scoreUs: 0,
            scoreThem: 0,
            pointsArchive: [],
            matchDurationSeconds: 0,
            isProMode: false, 
            date: new Date().toISOString(),
            tournamentId,
            teamNames: [ourTeamName, opponentName],
            score: [0, 0],
            finished: false
        };
        
        await newMatchRef.set(newMatch);
        await tournamentRef.update({ lastUpdated: Date.now() });
        
        res.json({ matchId: newMatchRef.id });
    } catch (error) {
        console.error("Maç oluşturulurken hata:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- 5. API Endpoint: SAYI (POINT) ARŞİVLEME ---
app.post('/api/teams/:teamId/tournaments/:tournamentId/matches/:matchId/archive-point', async (req, res) => {
    try {
        const { teamId, tournamentId, matchId } = req.params;
        const { lineup, startMode, whoScored, pointStats } = req.body;

        const matchRef = db.doc(`teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}`);
        const matchSnap = await matchRef.get();
        
        if (!matchSnap.exists) return res.status(404).json({ error: "Maç bulunamadı" });

        const matchData = matchSnap.data();
        const allPlayerIds = Array.from(new Set([...lineup, ...pointStats.map(s => s.playerId)]));

        const statsToArchive = allPlayerIds.map(playerId => {
            const pStat = pointStats.find(s => s.playerId === playerId);
            return {
                playerId: playerId,
                pointsPlayed: 1,
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
            playerIds: allPlayerIds,
            stats: statsToArchive,
            durationSeconds: 0 
        };

        let newScoreUs = matchData.scoreUs ?? matchData.score?.[0] ?? 0;
        let newScoreThem = matchData.scoreThem ?? matchData.score?.[1] ?? 0;
        
        if (whoScored === 'US') newScoreUs += 1;
        else if (whoScored === 'THEM') newScoreThem += 1;

        await matchRef.update({
            pointsArchive: admin.firestore.FieldValue.arrayUnion(newPoint),
            scoreUs: newScoreUs,
            scoreThem: newScoreThem,
            score: [newScoreUs, newScoreThem] 
        });

        const tournamentRef = db.doc(`teams/${teamId}/tournaments/${tournamentId}`);
        await tournamentRef.update({ lastUpdated: Date.now() });

        res.json({ success: true });
    } catch (error) {
        console.error("Sayı arşivlenirken hata:", error);
        res.status(500).json({ error: error.message });
    }
});
// Turnuva oyuncularını getir
app.get('/api/teams/:teamId/tournaments/:tournamentId/players', async (req, res) => {
    try {
        const { teamId, tournamentId } = req.params;
        const snapshot = await db.collection(`teams/${teamId}/tournaments/${tournamentId}/players`).get();
        const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(players);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});