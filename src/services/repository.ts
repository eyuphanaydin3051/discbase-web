// src/services/repository.ts

// 1. Kod olan (fonksiyonlar) buraya:
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    writeBatch
} from "firebase/firestore";

// 2. Sadece TİP olanlar (type) buraya (Hata çözümü):
import type {
    QuerySnapshot,
    DocumentData,
    QueryDocumentSnapshot
} from "firebase/firestore";

import { db } from "./firebase";
import type {
    TeamProfile,
    Player,
    Tournament,
    Match,
    UserProfile,
    Training
} from "../types";

const TEAMS_COLLECTION = "teams";
const TOURNAMENTS_COLLECTION = "tournaments";
const PLAYERS_COLLECTION = "players";
const USERS_COLLECTION = "users";
const TRAININGS_COLLECTION = "trainings";

// --- KULLANICI İŞLEMLERİ ---

export const getUserTeams = (uid: string, callback: (teams: TeamProfile[]) => void) => {
    const q = query(
        collection(db, TEAMS_COLLECTION),
        where(`members.${uid}`, "in", ["admin", "member"])
    );

    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const teams = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => doc.data() as TeamProfile);
        callback(teams);
    });
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
        const docRef = doc(db, USERS_COLLECTION, uid);
        const snap = await getDoc(docRef);
        return snap.exists() ? (snap.data() as UserProfile) : null;
    } catch (error) {
        console.error("Profil çekme hatası:", error);
        return null;
    }
};

// --- OYUNCU İŞLEMLERİ ---

export const getPlayers = (teamId: string, callback: (players: Player[]) => void) => {
    const playersRef = collection(db, TEAMS_COLLECTION, teamId, PLAYERS_COLLECTION);
    const q = query(playersRef);

    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const players = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => doc.data() as Player);
        players.sort((a: Player, b: Player) => a.name.localeCompare(b.name));
        callback(players);
    });
};

export const savePlayer = async (teamId: string, player: Player) => {
    const playerRef = doc(db, TEAMS_COLLECTION, teamId, PLAYERS_COLLECTION, player.id);
    await setDoc(playerRef, player);
};

export const deletePlayer = async (teamId: string, playerId: string) => {
    const playerRef = doc(db, TEAMS_COLLECTION, teamId, PLAYERS_COLLECTION, playerId);
    await deleteDoc(playerRef);
};

// --- TURNUVA VE MAÇ İŞLEMLERİ ---

export const getTournaments = (teamId: string, callback: (tournaments: Tournament[]) => void) => {
    const tournamentsRef = collection(db, TEAMS_COLLECTION, teamId, TOURNAMENTS_COLLECTION);
    const q = query(tournamentsRef);

    return onSnapshot(q, async (snapshot: QuerySnapshot<DocumentData>) => {
        const rawTournaments = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => doc.data() as Tournament);

        const fullTournaments = await Promise.all(rawTournaments.map(async (t: Tournament) => {
            const matchesCol = collection(db, TEAMS_COLLECTION, teamId, TOURNAMENTS_COLLECTION, t.id, "matches");
            const matchSnaps = await getDocs(matchesCol);
            const matches = matchSnaps.docs.map((d: QueryDocumentSnapshot<DocumentData>) => d.data() as Match);

            if (matches.length === 0 && t.matches && t.matches.length > 0) {
                return t;
            }

            return { ...t, matches: matches };
        }));

        fullTournaments.sort((a: Tournament, b: Tournament) => new Date(b.date).getTime() - new Date(a.date).getTime());
        callback(fullTournaments);
    });
};

export const saveMatch = async (teamId: string, tournamentId: string, match: Match) => {
    const tournamentRef = doc(db, TEAMS_COLLECTION, teamId, TOURNAMENTS_COLLECTION, tournamentId);
    const matchRef = doc(collection(tournamentRef, "matches"), match.id);

    const batch = writeBatch(db);
    batch.set(matchRef, match);
    batch.update(tournamentRef, { lastUpdated: Date.now() });

    await batch.commit();
};

export const saveTournament = async (teamId: string, tournament: Tournament) => {
    const docRef = doc(db, TEAMS_COLLECTION, teamId, TOURNAMENTS_COLLECTION, tournament.id);
    const { matches, ...tournamentData } = tournament;
    await setDoc(docRef, tournamentData);
};

// --- ANTRENMANLAR ---

export const getTrainings = (teamId: string, callback: (trainings: Training[]) => void) => {
    const ref = collection(db, TEAMS_COLLECTION, teamId, TRAININGS_COLLECTION);
    return onSnapshot(ref, (snapshot: QuerySnapshot<DocumentData>) => {
        const trainings = snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => d.data() as Training);
        callback(trainings);
    });
};