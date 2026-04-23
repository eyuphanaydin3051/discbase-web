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
// --- TEMEL OKUMA ENDPOINT'LERİ (LİSTELEME) ---

// 1. Kullanıcının Takımlarını Getir (Giriş sonrası ilk çağrılan)
app.get('/api/teams', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "userId query parametresi gerekli" });

        // Takımlar koleksiyonunda members objesi içinde userId'si bulunanları getir
        const snapshot = await db.collection('teams').where(`members.${userId}`, '!=', null).get();
        const teams = snapshot.docs.map(doc => ({ teamId: doc.id, ...doc.data() }));
        res.json(teams);
    } catch (e) {
        console.error("Takımlar getirilirken hata:", e);
        res.status(500).json({ error: e.message });
    }
});

// 2. Takımın Oyuncularını Getir
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

// 3. Takımın Turnuvalarını Getir
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

// 4. Turnuvanın Maçlarını Getir
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

// 5. Maç Detayını Getir (Maç Takip ekranı için kritik)
app.get('/api/teams/:teamId/tournaments/:tournamentId/matches/:matchId', async (req, res) => {
    try {
        const { teamId, tournamentId, matchId } = req.params;
        const docRef = await db.doc(`teams/${teamId}/tournaments/${tournamentId}/matches/${matchId}`).get();
        if (!docRef.exists) return res.status(404).json({ error: "Maç bulunamadı" });
        res.json({ id: docRef.id, ...docRef.data() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
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
            if (!match.pointsArchive) return;
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
// --- 13. API Endpoint: LEADERBOARD (TÜM OYUNCULARIN İSTATİSTİKLERİ - DİNAMİK HAM VERİ) ---
app.get('/api/teams/:teamId/leaderboard', async (req, res) => {
    try {
        const { teamId } = req.params;
        const { tournamentId, matchId, statType = 'PLUS_MINUS', calculationMode = 'TOTAL' } = req.query;

        // Oyuncuları Çek
        const playersSnapshot = await db.collection(`teams/${teamId}/players`).get();
        const players = playersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Filtrelere Göre Maçları Bul
        let matchesToProcess = [];
        if (tournamentId && tournamentId !== 'GENEL') {
            if (matchId) {
                // HATA DÜZELTİLDİ: Tekil doküman çekilirken doc() kullanılmalı
                const mDoc = await db.collection(`teams/${teamId}/tournaments/${tournamentId}/matches`).doc(matchId).get();
                if (mDoc.exists) matchesToProcess.push({ id: mDoc.id, tournamentId, ...mDoc.data() });
            } else {
                const mSnap = await db.collection(`teams/${teamId}/tournaments/${tournamentId}/matches`).get();
                matchesToProcess = mSnap.docs.map(d => ({ id: d.id, tournamentId, ...d.data() }));
            }
        } else {
            const tourSnapshot = await db.collection(`teams/${teamId}/tournaments`).get();
            for (const tourDoc of tourSnapshot.docs) {
                const mSnap = await db.collection(`teams/${teamId}/tournaments/${tourDoc.id}/matches`).get();
                matchesToProcess.push(...mSnap.docs.map(d => ({ id: d.id, tournamentId: tourDoc.id, ...d.data() })));
            }
        }

        // İstatistikleri Toplama (Aggregation)
        const statsMap = {};
        players.forEach(p => {
            statsMap[p.id] = {
                id: p.id, name: p.name, photoUrl: p.photoUrl, jerseyNumber: p.jerseyNumber,
                goal: 0, assist: 0, block: 0, callahan: 0, successfulPass: 0,
                drop: 0, throwaway: 0, pointsPlayed: 0, secondsPlayed: 0,
                matchesPlayedSet: [], pullAttempts: 0, totalPullTimeSeconds: 0
            };
        });

        matchesToProcess.forEach(match => {
            if (!match.pointsArchive) return;
            match.pointsArchive.forEach(point => {
                point.stats?.forEach(stat => {
                    const ps = statsMap[stat.playerId];
                    if (ps) {
                        ps.goal += stat.goal || 0;
                        ps.assist += stat.assist || 0;
                        ps.block += stat.block || 0;
                        ps.callahan += stat.callahan || 0;
                        ps.successfulPass += stat.successfulPass || 0;
                        ps.drop += stat.drop || 0;
                        ps.catchStat += stat.catchStat || 0;
                        ps.throwaway += stat.throwaway || 0;
                        ps.pointsPlayed += 1;
                        ps.secondsPlayed += stat.totalTimePlayedSeconds || stat.totalPullTimeSeconds || 0;
                        if (!ps.matchesPlayedSet.includes(match.id)) ps.matchesPlayedSet.push(match.id);
                        ps.pullAttempts += stat.pullAttempts || 0;
                        ps.totalPullTimeSeconds += stat.totalPullTimeSeconds || 0;
                    }
                });
            });
        });

        // Frontend yükünü hafifletmek için tüm hesaplamalar, filtrelemeler ve sıralama backend'de yapılıyor
        const rankedPlayers = [];
        Object.values(statsMap).forEach(ps => {
            const passes = ps.successfulPass + ps.assist + ps.throwaway;
            const completedPasses = ps.successfulPass + ps.assist;
            const turns = ps.drop + ps.throwaway;

            // HATA DÜZELTİLMESİ: Callahan'ı gol ve bloktan çıkarınca negatif değerler oluşabiliyordu.
            // Direk toplayarak daha stabil bir verimlilik (efficiency) hesaplaması yapıyoruz.
            const plusMinus = (ps.goal * 1.0) + (ps.assist * 1.0) + (ps.block * 1.5) + (ps.callahan * 3.5) - (turns * 1.0) + (completedPasses * 0.05);

            let rawValue = 0;
            if (statType === 'GOAL') rawValue = ps.goal;
            else if (statType === 'ASSIST') rawValue = ps.assist;
            else if (statType === 'BLOCK') rawValue = ps.block;
            else if (statType === 'CALLAHAN') rawValue = ps.callahan;
            else if (statType === 'THROWAWAY') rawValue = ps.throwaway;
            else if (statType === 'DROP') rawValue = ps.drop;
            else if (statType === 'PLUS_MINUS') rawValue = plusMinus;
            else if (statType === 'PASS_COUNT') rawValue = passes;
            else if (statType === 'POINTS_PLAYED') rawValue = ps.pointsPlayed;
            else if (statType === 'PLAYTIME') rawValue = ps.secondsPlayed;
            else if (statType === 'CATCH_RATE') {
                const catches = completedPasses + ps.goal;
                const attempts = catches + ps.drop;
                rawValue = attempts > 0 ? (catches / attempts) * 100 : 0;
            }
            else if (statType === 'PASS_RATE') rawValue = passes > 0 ? (completedPasses / passes) * 100 : 0;
            else if (statType === 'AVG_PULL_TIME') rawValue = ps.pullAttempts > 0 ? ps.totalPullTimeSeconds / ps.pullAttempts : 0;
            else if (statType === 'AVG_PLAYTIME') rawValue = ps.pointsPlayed > 0 ? ps.secondsPlayed / ps.pointsPlayed : 0;

            const isAlreadyAverage = ['CATCH_RATE', 'PASS_RATE', 'AVG_PULL_TIME', 'AVG_PLAYTIME'].includes(statType);
            let finalValue = rawValue;

            if (!isAlreadyAverage) {
                if (calculationMode === 'PER_MATCH') {
                    const mCount = ps.matchesPlayedSet.length;
                    finalValue = mCount > 0 ? rawValue / mCount : 0;
                } else if (calculationMode === 'PER_POINT') {
                    if (ps.pointsPlayed > 0) {
                        finalValue = statType === 'PLUS_MINUS' ? (rawValue / ps.pointsPlayed) * 10.0 : rawValue / ps.pointsPlayed;
                    } else finalValue = 0;
                }
            }

            if (finalValue > 0 || (statType === 'PLUS_MINUS' && finalValue !== 0)) {
                // Roster tablosu için toplam pas bilgisi ekleniyor
                ps.totalPasses = (ps.successfulPass + ps.assist + ps.throwaway);
                const formatTime = (seconds) => {
                    const m = Math.floor(seconds / 60);
                    const s = Math.floor(seconds % 60);
                    return `${m}:${s.toString().padStart(2, '0')}`;
                };

                let formattedValue = '';
                if (['CATCH_RATE', 'PASS_RATE'].includes(statType)) {
                    formattedValue = `${finalValue.toFixed(1)}%`;
                } else if (['PLAYTIME', 'AVG_PLAYTIME'].includes(statType)) {
                    formattedValue = formatTime(finalValue);
                } else if (statType === 'AVG_PULL_TIME') {
                    formattedValue = `${finalValue.toFixed(1)} sn`;
                } else {
                    formattedValue = finalValue.toFixed(2).replace(/\.00$/, '');
                }

                rankedPlayers.push({
                    player: { id: ps.id, name: ps.name, photoUrl: ps.photoUrl, jerseyNumber: ps.jerseyNumber },
                    value: finalValue,
                    formattedValue,
                    stats: ps
                });
            }
        });

        // Sıralayıp JSON olarak dönüyoruz
        rankedPlayers.sort((a, b) => b.value - a.value);
        res.json(rankedPlayers);
    } catch (error) {
        console.error("Leaderboard Error:", error);
        res.status(500).json({ error: error.message });
    }
});
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

app.get('/api/teams/:teamId/tournaments/:tournamentId/matches', async (req, res) => {
    try {
        const { teamId, tournamentId } = req.params;
        const matchesSnapshot = await db.collection('teams').doc(teamId)
            .collection('tournaments').doc(tournamentId)
            .collection('matches').get();
        const matches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// YENİ: Tekil Maç Detayı ve Olaylarını Getir
app.get('/api/teams/:teamId/tournaments/:tournamentId/matches/:matchId', async (req, res) => {
    try {
        const { teamId, tournamentId, matchId } = req.params;
        const matchDoc = await db.collection('teams').doc(teamId)
            .collection('tournaments').doc(tournamentId)
            .collection('matches').doc(matchId).get();

        if (!matchDoc.exists) {
            return res.status(404).json({ error: "Maç bulunamadı" });
        }

        res.json({ id: matchDoc.id, ...matchDoc.data() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// --- MAÇ İSTATİSTİK RAPORU (HESAPLAMALAR BURADA YAPILIR) ---
app.get('/api/teams/:teamId/tournaments/:tournamentId/matches/:matchId/stats', async (req, res) => {
    try {
        const { teamId, tournamentId, matchId } = req.params;
        const matchDoc = await db.collection('teams').doc(teamId).collection('tournaments').doc(tournamentId).collection('matches').doc(matchId).get();

        if (!matchDoc.exists) return res.status(404).json({ error: "Maç bulunamadı" });
        const match = matchDoc.data();
        const playersSnapshot = await db.collection('teams').doc(teamId).collection('players').get();
        const rosterPlayers = playersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // --- 1. OYUNCU İSTATİSTİKLERİ HESAPLAMA ---
        const statsMap = {};
        rosterPlayers.forEach(p => {
            statsMap[p.id] = {
                id: p.id, name: p.name, jerseyNumber: p.jerseyNumber, photoUrl: p.photoUrl,
                goals: 0, assists: 0, blocks: 0, callahans: 0, passes: 0, drops: 0,
                catchStat: 0, throwaways: 0, turns: 0, pointsPlayed: 0, totalTimePlayedSeconds: 0
            };
        });

        // A. Süre (Zaman) Hesaplaması
        const pointDurationsByPlayer = [];
        if (match.events && match.events.length > 0) {
            const sortedEvents = [...match.events].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            let currentPointStart = null;
            let lastEventTime = null;
            let activePlayers = new Set();
            let currentPointTimes = {};
            let pointIndex = 0;

            sortedEvents.forEach((evt, idx) => {
                const vTime = evt.videoTimestampSeconds;

                if ((evt.eventType.includes('Pull') || evt.eventType === 'Pickup') && currentPointStart === null) {
                    currentPointStart = vTime ?? null;
                    lastEventTime = vTime ?? null;
                    currentPointTimes = {};

                    const archivePoint = match.pointsArchive?.[pointIndex];
                    if (archivePoint) {
                        const subbedIn = new Set();
                        for (let i = idx; i < sortedEvents.length; i++) {
                            const e = sortedEvents[i];
                            if (e.eventType === 'Substitute' && e.secondaryPlayerId) subbedIn.add(e.secondaryPlayerId);
                            if (e.eventType === 'Goal' || e.eventType === 'Callahan' || e.eventType === 'OpponentGoal') break;
                        }
                        archivePoint.stats?.forEach(s => {
                            if (!subbedIn.has(s.playerId)) activePlayers.add(s.playerId);
                        });
                    }
                }

                if (currentPointStart !== null && vTime !== undefined && lastEventTime !== null) {
                    const delta = Math.max(0, vTime - lastEventTime);
                    activePlayers.forEach(pid => {
                        currentPointTimes[pid] = (currentPointTimes[pid] || 0) + delta;
                    });
                    lastEventTime = vTime;
                }

                if (evt.eventType === 'Substitute') {
                    if (evt.playerId) activePlayers.delete(evt.playerId);
                    if (evt.secondaryPlayerId) activePlayers.add(evt.secondaryPlayerId);
                }

                if (evt.eventType === 'Goal' || evt.eventType === 'Callahan' || evt.eventType === 'OpponentGoal') {
                    pointDurationsByPlayer.push(currentPointTimes);
                    currentPointStart = null;
                    lastEventTime = null;
                    activePlayers.clear();
                    pointIndex++;
                }
            });
        }

        // B. Aksiyon İstatistiklerini Toplama
        if (match.pointsArchive) {
            match.pointsArchive.forEach((point, pIndex) => {
                const playerTimes = pointDurationsByPlayer[pIndex] || {};
                point.stats?.forEach(stat => {
                    const ps = statsMap[stat.playerId];
                    if (ps) {
                        ps.goals += stat.goal || 0;
                        ps.assists += stat.assist || 0;
                        ps.blocks += stat.block || 0;
                        ps.callahans += stat.callahan || 0;
                        ps.passes += (stat.successfulPass || 0) + (stat.assist || 0);
                        ps.drops += stat.drop || 0;
                        ps.catchStat += stat.catchStat || 0;
                        ps.throwaways += stat.throwaway || 0;
                        ps.turns += (stat.drop || 0) + (stat.throwaway || 0);
                        ps.pointsPlayed += stat.pointsPlayed || 0;
                        ps.totalTimePlayedSeconds += (playerTimes[stat.playerId] || 0);
                    }
                });
            });
        }

        const computedPlayerStats = Object.values(statsMap).map(stats => {
            // DÜZELTME: Toplam pas = Başarılı Paslar (Assist dahil) + Hatalı Paslar (Throwaway). Drop dahil edilmez.
            const totalPassAttempts = stats.passes + stats.throwaways;
            const passPercentage = totalPassAttempts > 0 ? parseFloat(((stats.passes / totalPassAttempts) * 100).toFixed(1)) : 0;

            // Yakalama yüzdesi doğrudan catchStat üzerinden hesaplanmalıdır.
            const totalCatchOpportunities = stats.catchStat + stats.drops;
            const catchPercentage = totalCatchOpportunities > 0 ? parseFloat(((stats.catchStat / totalCatchOpportunities) * 100).toFixed(1)) : 0;

            // Verimlilik (Efficiency) formülü Android ile eşitlendi ve Callahan hataları giderildi.
            const efficiency = (stats.goals * 1.0) + (stats.assists * 1.0) + (stats.blocks * 1.5) + (stats.callahans * 3.5) - (stats.turns * 1.0) + (stats.passes * 0.05);

            return {
                ...stats,
                totalPasses: totalPassAttempts,
                passPercentage,
                catchPercentage,
                efficiency: efficiency.toFixed(2)
            };
        });

        // --- 2. TAKIM İSTATİSTİKLERİ HESAPLAMA ---
        let totalPointsPlayed = 0, totalGoals = 0, totalAssists = 0, totalSuccessfulPass = 0;
        let totalThrowaways = 0, totalDrops = 0, totalBlocks = 0;
        let totalOffensePoints = 0, offensiveHolds = 0, cleanHolds = 0;
        let totalDefensePoints = 0, breakPointsScored = 0;
        let totalBlockPoints = 0, blocksConvertedToGoals = 0;

        if (match.pointsArchive && match.pointsArchive.length > 0) {
            totalPointsPlayed = match.pointsArchive.length;
            match.pointsArchive.forEach(point => {
                const isOurPoint = point.whoScored === 'US' || point.whoScored === 'OURS';
                let pointTurnovers = 0, pointBlocks = 0;

                if (point.startMode === 'OFFENSE') {
                    totalOffensePoints++;
                    if (isOurPoint) offensiveHolds++;
                } else if (point.startMode === 'DEFENSE') {
                    totalDefensePoints++;
                    if (isOurPoint) breakPointsScored++;
                }

                point.stats?.forEach(stat => {
                    totalGoals += stat.goal || 0;
                    totalAssists += stat.assist || 0;
                    totalSuccessfulPass += stat.successfulPass || 0;
                    totalThrowaways += stat.throwaway || 0;
                    totalDrops += stat.drop || 0;
                    totalBlocks += stat.block || 0;

                    pointTurnovers += (stat.throwaway || 0) + (stat.drop || 0);
                    pointBlocks += stat.block || 0;
                });

                if (point.startMode === 'OFFENSE' && isOurPoint && pointTurnovers === 0) cleanHolds++;
                if (pointBlocks > 0) {
                    totalBlockPoints++;
                    if (isOurPoint) blocksConvertedToGoals++;
                }
            });
        }

        const totalPassesCompleted = totalSuccessfulPass + totalAssists;
        const totalPassesAttempted = totalPassesCompleted + totalThrowaways + totalDrops;
        const totalPossessions = totalGoals + totalThrowaways + totalDrops;

        const teamStats = {
            totalPointsPlayed, totalGoals, totalAssists, totalBlocks,
            totalTurnovers: totalThrowaways + totalDrops,
            totalPassesCompleted, totalPassesAttempted, totalPossessions,
            offensiveHolds, totalOffensePoints, cleanHolds, breakPointsScored, totalDefensePoints,
            totalBlockPoints, blocksConvertedToGoals,
            holdPercent: totalOffensePoints > 0 ? Math.round((offensiveHolds / totalOffensePoints) * 100) : 0,
            cleanHoldPercent: totalOffensePoints > 0 ? Math.round((cleanHolds / totalOffensePoints) * 100) : 0,
            breakPercent: totalDefensePoints > 0 ? Math.round((breakPointsScored / totalDefensePoints) * 100) : 0,
            passSuccess: totalPassesAttempted > 0 ? Math.round((totalPassesCompleted / totalPassesAttempted) * 100) : 0,
            conversionRate: totalPossessions > 0 ? Math.round((totalGoals / totalPossessions) * 100) : 0,
            blockConversionRate: totalBlockPoints > 0 ? Math.round((blocksConvertedToGoals / totalBlockPoints) * 100) : 0
        };

        // --- 3. OLAY GRUPLAMA (ASSIST/GOAL MERGE) ---
        const groupedEvents = [];
        let currentPointEvents = [];
        const sortedEvents = (match.events || []).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        sortedEvents.forEach(evt => {
            const p = rosterPlayers.find(rp => rp.id === evt.playerId);
            const sp = rosterPlayers.find(rp => rp.id === evt.secondaryPlayerId);
            const enrichedEvt = { ...evt, player: p, secondaryPlayer: sp };

            if (enrichedEvt.eventType === 'Goal') {
                const lastEvt = currentPointEvents[currentPointEvents.length - 1];
                if (lastEvt && lastEvt.eventType === 'Assist') {
                    enrichedEvt.secondaryPlayer = lastEvt.player;
                    currentPointEvents.pop();
                }
            }
            currentPointEvents.push(enrichedEvt);

            if (['Goal', 'Callahan', 'OpponentGoal'].includes(evt.eventType)) {
                groupedEvents.push([...currentPointEvents]);
                currentPointEvents = [];
            }
        });

        if (currentPointEvents.length > 0) groupedEvents.push(currentPointEvents);

        res.json({ playerStats: computedPlayerStats, teamStats, groupedEvents });
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ error: error.message });
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