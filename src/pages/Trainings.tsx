import { useEffect, useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getPlayers, getTrainings, saveTraining, deleteTraining } from '../services/repository';
import type { Training, Player } from '../types';

type ViewMode = 'list' | 'stats' | 'ultiplays';

const parseTrainingDate = (dateStr: string | undefined): Date => {
    if (!dateStr) return new Date();
    const cleanStr = dateStr.trim().split(' ')[0]; 
    const parts = cleanStr.split(/[\/\.-]/);
    
    if (parts.length >= 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(year, month, day);
        }
    }
    
    const parsed = new Date(cleanStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const formatDateForInput = (dateStr: string): string => {
    const d = parseTrainingDate(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateForSave = (inputVal: string): string => {
    if (!inputVal) return '';
    const [year, month, day] = inputVal.split('-');
    return `${day}/${month}/${year}`;
};

// --- YENİ: Ultiplays URL Formatlayıcı ---
// Standart takvim linkini API linkine dönüştürür
const formatUltiplaysLink = (link: string) => {
    if (!link) return '';
    // Eğer direkt API linki kopyalanmışsa olduğu gibi bırak
    if (link.includes('/api/teams/')) return link;
    
    const match = link.match(/ultiplays\.com\/teams\/([^\/]+)\/calendar\/([^\/]+)/);
    if (match) {
        return `https://www.ultiplays.com/api/teams/${match[1]}/events/${match[2]}`;
    }
    return link;
};

export default function Trainings() {
    const [teamId, setTeamId] = useState<string | null>(null);
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [currentTraining, setCurrentTraining] = useState<Partial<Training> | null>(null);

    // Ultiplays Event Verileri İçin State'ler
    const [ultiplaysEventData, setUltiplaysEventData] = useState<any>(null);
    const [isLoadingEvent, setIsLoadingEvent] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showRawData, setShowRawData] = useState(false); // DEBUG İÇİN YENİ

    // --- Ultiplays ID Kaydetme ---
    const handleSaveUltiplaysId = async (playerId: string, newId: string) => {
        if (!teamId) return;
        try {
            const cleanId = newId.trim(); // YENİ: Boşlukları temizle
            const playerRef = doc(db, `teams/${teamId}/players`, playerId);
            await setDoc(playerRef, { ultiplaysId: cleanId }, { merge: true });
            setPlayers(players.map(p => p.id === playerId ? { ...p, ultiplaysId: cleanId } as any : p));
        } catch (error) {
            console.error("Ultiplays ID kaydedilirken hata:", error);
        }
    };

    // --- Ultiplays Event Detaylarını Çekme ---
    useEffect(() => {
        if (isDetailModalOpen && (currentTraining as any)?.ultiplaysLink) {
            setIsLoadingEvent(true);
            const rawUrl = (currentTraining as any).ultiplaysLink;
            // CORS Tarayıcı engeline takılmamak için public proxy üzerinden istek atıyoruz
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`;
            
            fetch(proxyUrl)
                .then(res => {
                    if (!res.ok) throw new Error("Ağ hatası veya CORS engeli");
                    return res.json();
                })
                .then(data => {
                    console.log("Ultiplays Başarılı İstek:", data); // Eğer hata alırsan tarayıcı konsolunda veriyi görebilirsin
                    setUltiplaysEventData(data);
                })
                .catch(err => {
                    console.error("Ultiplays verisi çekilemedi (CORS hatası olabilir):", err);
                    setUltiplaysEventData(null);
                })
                .finally(() => setIsLoadingEvent(false));
        } else {
            setUltiplaysEventData(null);
        }
    }, [isDetailModalOpen, currentTraining]);

    // --- YENİ: Toplu Ultiplays Eşitleme (Sync) Fonksiyonu ---
    const syncUltiplaysEvents = async () => {
        if (!teamId || trainings.length === 0) return;
        setIsSyncing(true);
        let updatedCount = 0;

        try {
            for (const t of trainings) {
                const link = (t as any).ultiplaysLink;
                if (link && link.includes('/api/teams/')) {
                    try {
                        // CORS engeline takılmamak için public proxy kullanıyoruz
                        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(link)}`;
                        const res = await fetch(proxyUrl);
                        
                        if (res.ok) {
                            const data = await res.json();
                            
                            // Attending (Katılıyor) olan kullanıcı ID'lerini bul
                            const attendingUserIds = (data.rsvps || [])
                                .filter((r: any) => r.status === 'attending')
                                .map((r: any) => r.userId);
                            
                            // Local oyuncularla eşleşenlerin Discbase ID'lerini çıkar (Trim korumalı)
                            const newAttendeeIds = players
                                .filter(p => {
                                    const uId = (p as any).ultiplaysId;
                                    return uId && attendingUserIds.includes(uId.trim());
                                })
                                .map(p => p.id);
                            
                            // Sadece bir değişiklik varsa veritabanını güncelle
                            const currentIds = [...(t.attendeeIds || [])].sort();
                            const newlySorted = [...newAttendeeIds].sort();
                            
                            if (JSON.stringify(currentIds) !== JSON.stringify(newlySorted)) {
                                await saveTraining(teamId, { ...t, attendeeIds: newAttendeeIds } as Training);
                                updatedCount++;
                            }
                        }
                    } catch (e) {
                        console.error(`Eşitleme hatası (${t.id}):`, e);
                    }
                }
            }
            alert(`Eşitleme Tamamlandı! ${updatedCount} antrenmanın yoklaması Ultiplays verilerine göre güncellendi.`);
        } catch (error) {
            alert("Eşitleme sırasında bir hata oluştu.");
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        const storedTeamId = localStorage.getItem('selectedTeamId');
        if (storedTeamId) {
            setTeamId(storedTeamId);
            const unsubPlayers = getPlayers(storedTeamId, (data) => setPlayers(data));
            const unsubTrainings = getTrainings(storedTeamId, (data) => {
                const sorted = [...data].sort((a, b) => {
                    const dateA = parseTrainingDate(a.date);
                    const dateB = parseTrainingDate(b.date);
                    const timeA = a.time ? a.time.split(':') : ['0', '0'];
                    const timeB = b.time ? b.time.split(':') : ['0', '0'];
                    dateA.setHours(parseInt(timeA[0], 10), parseInt(timeA[1] || '0', 10));
                    dateB.setHours(parseInt(timeB[0], 10), parseInt(timeB[1] || '0', 10));
                    return dateB.getTime() - dateA.getTime();
                });
                setTrainings(sorted as Training[]);
                setLoading(false);
            });
            return () => { unsubPlayers(); unsubTrainings(); };
        }
    }, []);

    const getGroupedTrainings = () => {
        const groupsMap = new Map<string, Training[]>();
        trainings.forEach(t => {
            const date = parseTrainingDate(t.date);
            const monthYear = date.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
            if (!groupsMap.has(monthYear)) groupsMap.set(monthYear, []);
            groupsMap.get(monthYear)!.push(t);
        });
        return Array.from(groupsMap.entries()).map(([month, items]) => ({ month, items }));
    };

    const getSortedPlayerStats = () => {
        return players.map(player => {
            const attendedCount = trainings.filter(t => t.attendeeIds?.includes(player.id)).length;
            const rate = trainings.length > 0 ? (attendedCount / trainings.length) * 100 : 0;
            return { ...player, attendedCount, rate };
        }).sort((a, b) => {
            if (b.attendedCount !== a.attendedCount) return b.attendedCount - a.attendedCount;
            return a.name.localeCompare(b.name);
        });
    };

    const exportAttendanceToCSV = () => {
        try {
            let csv = "\uFEFFİsim Soyisim;Yüzde;Toplam";
            const chronological = [...trainings].sort((a, b) => {
                const dateA = parseTrainingDate(a.date);
                const dateB = parseTrainingDate(b.date);
                const timeA = a.time ? a.time.split(':') : ['0', '0'];
                const timeB = b.time ? b.time.split(':') : ['0', '0'];
                dateA.setHours(parseInt(timeA[0], 10), parseInt(timeA[1] || '0', 10));
                dateB.setHours(parseInt(timeB[0], 10), parseInt(timeB[1] || '0', 10));
                return dateA.getTime() - dateB.getTime(); 
            });

            chronological.forEach(t => {
                const d = parseTrainingDate(t.date);
                const day = String(d.getDate()).padStart(2, '0');
                let monthStr = d.toLocaleString('tr-TR', { month: 'short' }).replace('.', '');
                monthStr = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
                csv += `;${day} ${monthStr}`;
            });
            csv += "\n";

            getSortedPlayerStats().forEach(player => {
                let attendanceCols = "";
                chronological.forEach(t => { attendanceCols += t.attendeeIds?.includes(player.id) ? ";1" : ";0"; });
                const percentageStr = `${player.rate.toFixed(2).replace('.', ',')}%`;
                csv += `${player.name};${percentageStr};${player.attendedCount}${attendanceCols}\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.setAttribute("href", URL.createObjectURL(blob));
            link.setAttribute("download", `Yoklama_Cizelgesi_${Date.now()}.csv`);
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
        } catch (e) { alert("CSV dışa aktarılırken bir hata oluştu."); }
    };

    const openCreateModal = () => {
        const today = new Date();
        const defaultDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        setCurrentTraining({
            date: defaultDate,
            time: '19:00',
            location: '', note: '', description: '', attendeeIds: [], isVisibleToMembers: true,
            ultiplaysLink: ''
        } as any);
        setIsFormModalOpen(true);
    };

    const handleSaveTraining = async () => {
        if (!teamId || !currentTraining) return;
        const id = currentTraining.id || doc(collection(db, 'teams')).id;
        await saveTraining(teamId, { ...currentTraining, id } as Training);
        setIsFormModalOpen(false);
    };

    if (loading) return <div className="flex justify-center items-center h-[70vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B4DBC]"></div></div>;

    const groupedTrainingsArray = getGroupedTrainings();
    const sortedPlayerStats = getSortedPlayerStats();

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <span className="material-icons-outlined text-[#5B4DBC]">fitness_center</span>
                        Antrenman Yönetimi
                    </h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    {/* YENİ: Eşitleme Butonu */}
                    <button 
                        onClick={syncUltiplaysEvents} 
                        disabled={isSyncing}
                        className="bg-white border border-blue-200 text-blue-700 px-4 py-2 rounded-lg shadow-sm hover:bg-blue-50 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        <span className={`material-icons-outlined text-blue-500 ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                        {isSyncing ? 'Eşitleniyor...' : 'Ultiplays Eşitle'}
                    </button>
                    <button onClick={exportAttendanceToCSV} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-all">
                        <span className="material-icons-outlined text-green-600">file_download</span>
                        CSV Dışa Aktar
                    </button>
                    <button onClick={openCreateModal} className="bg-[#5B4DBC] text-white px-4 py-2 rounded-lg shadow hover:bg-[#4a3ea3] flex items-center gap-2 transition-all">
                        <span className="material-icons-outlined">add</span>
                        Yeni Antrenman
                    </button>
                </div>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-xl w-fit mb-8 overflow-x-auto max-w-full">
                <button onClick={() => setViewMode('list')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${viewMode === 'list' ? 'bg-white text-[#5B4DBC] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Antrenman Listesi</button>
                <button onClick={() => setViewMode('stats')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${viewMode === 'stats' ? 'bg-white text-[#5B4DBC] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Katılım İstatistikleri</button>
                <button onClick={() => setViewMode('ultiplays')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${viewMode === 'ultiplays' ? 'bg-white text-[#5B4DBC] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><span className="material-icons-outlined text-[18px]">link</span>Ultiplays ID</button>
            </div>

            {/* ANTRENMAN LİSTESİ */}
            {viewMode === 'list' && (
                <div className="space-y-12">
                    {groupedTrainingsArray.length > 0 ? groupedTrainingsArray.map(({ month, items }) => (
                        <section key={month}>
                            <h2 className="text-lg font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2 flex items-center gap-3">
                                {month} <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">{items.length} İdman</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {items.map(training => {
                                    const parsedDate = parseTrainingDate(training.date);
                                    return (
                                    <div key={training.id} onClick={() => { setCurrentTraining(training); setIsDetailModalOpen(true); setShowRawData(false); }} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md hover:border-[#5B4DBC]/30 transition-all group cursor-pointer flex flex-col justify-between">
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="bg-purple-50 text-[#5B4DBC] px-3 py-1 rounded-lg text-xs font-bold uppercase flex items-center gap-2">
                                                    {parsedDate.toLocaleDateString('tr-TR', { weekday: 'long' })}
                                                    {(training as any).ultiplaysLink && <span className="material-icons-outlined text-[14px]">link</span>}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => {e.stopPropagation(); setCurrentTraining(training); setIsFormModalOpen(true);}} className="p-1.5 text-gray-400 hover:text-[#5B4DBC] bg-gray-50 rounded-lg"><span className="material-icons-outlined text-sm">edit</span></button>
                                                    <button onClick={(e) => {e.stopPropagation(); if(window.confirm('Silinsin mi?')) deleteTraining(teamId!, training.id)}} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 rounded-lg"><span className="material-icons-outlined text-sm">delete</span></button>
                                                </div>
                                            </div>
                                            <h3 className="font-black text-2xl text-gray-800 mb-1">
                                                {parsedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                                            </h3>
                                            <div className="text-gray-500 font-medium flex items-center gap-1 mb-4">
                                                <span className="material-icons-outlined text-sm">schedule</span>
                                                {training.time} • {training.location || 'Konum yok'}
                                            </div>
                                        </div>
                                        <div className="p-6 pt-0 mt-auto">
                                            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                                <div className="flex -space-x-2">
                                                    {training.attendeeIds?.slice(0, 5).map(uid => {
                                                        const p = players.find(pl => pl.id === uid);
                                                        return p?.photoUrl ? (
                                                            <img key={uid} src={p.photoUrl} className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                                                        ) : (
                                                            <div key={uid} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">{p?.name?.charAt(0) || '?'}</div>
                                                        );
                                                    })}
                                                    {(training.attendeeIds?.length || 0) > 5 && (
                                                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                            +{(training.attendeeIds?.length || 0) - 5}
                                                        </div>
                                                    )}
                                                </div>
                                                <button 
                                                    onClick={(e) => {e.stopPropagation(); setCurrentTraining(training); setIsAttendanceModalOpen(true);}}
                                                    className="bg-[#00C4B4] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#00a396] transition-colors shadow-sm"
                                                >
                                                    Yoklama ({training.attendeeIds?.length || 0})
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </section>
                    )) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300 text-gray-400">Henüz antrenman planlanmamış.</div>
                    )}
                </div>
            )}

            {/* İSTATİSTİKLER TABLOSU */}
            {viewMode === 'stats' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-4 font-bold text-gray-600 text-sm">Oyuncu</th>
                                <th className="p-4 font-bold text-gray-600 text-sm text-center hidden md:table-cell">Toplam Antrenman</th>
                                <th className="p-4 font-bold text-[#5B4DBC] text-sm text-center">Katılım Sayısı</th>
                                <th className="p-4 font-bold text-gray-600 text-sm text-right">Katılım Oranı</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPlayerStats.map((player, index) => (
                                <tr key={player.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="font-black text-gray-300 w-4 text-xs">{index + 1}.</div>
                                        {player.photoUrl ? <img src={player.photoUrl} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-purple-100 text-[#5B4DBC] flex items-center justify-center text-xs font-bold">{player.name.charAt(0)}</div>}
                                        <span className="font-bold text-gray-800">{player.name}</span>
                                    </td>
                                    <td className="p-4 text-center text-gray-500 font-medium hidden md:table-cell">{trainings.length}</td>
                                    <td className="p-4 text-center text-[#5B4DBC] font-black text-lg">{player.attendedCount}</td>
                                    <td className="p-4 text-right">
                                        <div className="inline-flex items-center gap-2">
                                            <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden hidden sm:block"><div className={`h-full rounded-full ${player.rate > 75 ? 'bg-green-500' : player.rate > 40 ? 'bg-orange-500' : 'bg-red-500'}`} style={{width: `${player.rate}%`}}></div></div>
                                            <span className={`font-black ${player.rate > 75 ? 'text-green-600' : player.rate > 40 ? 'text-orange-600' : 'text-red-600'}`}>%{player.rate.toFixed(0)}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ULTIPLAYS ID GİRİŞ EKRANI */}
            {viewMode === 'ultiplays' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden max-w-4xl mx-auto">
                    <div className="p-6 sm:p-8 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                            <span className="material-icons-outlined text-[#5B4DBC]">badge</span>
                            Ultiplays ID Eşleştirme
                        </h2>
                        <p className="text-sm text-gray-500 mt-2 font-medium">
                            Oyuncuların isimlerinin yanındaki kutuya Ultiplays ID'sini yapıştırın. <strong className="text-gray-700">Kutudan çıktığınız an otomatik kaydedilir.</strong>
                        </p>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {players.sort((a, b) => a.name.localeCompare(b.name)).map((player, idx) => (
                            <div key={player.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="font-black text-gray-300 w-4 text-xs">{idx + 1}.</div>
                                    {player.photoUrl ? (
                                        <img src={player.photoUrl} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-purple-100 text-[#5B4DBC] flex items-center justify-center font-bold shadow-sm">
                                            {player.name.charAt(0)}
                                        </div>
                                    )}
                                    <span className="font-bold text-gray-800">{player.name}</span>
                                </div>
                                <div className="w-full sm:w-72">
                                    <input 
                                        type="text"
                                        placeholder="Ultiplays ID girin..."
                                        defaultValue={(player as any).ultiplaysId || ''}
                                        onBlur={(e) => handleSaveUltiplaysId(player.id, e.target.value)}
                                        className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-[#5B4DBC] focus:bg-purple-50/30 outline-none transition-all font-mono text-sm"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ANTRENMAN EKLE/DÜZENLE MODALI */}
            {isFormModalOpen && currentTraining && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-black text-gray-800 mb-6">{currentTraining.id ? 'İdmanı Düzenle' : 'Yeni Plan'}</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-gray-400 uppercase">Tarih</label>
                                <input type="date" value={currentTraining.date ? formatDateForInput(currentTraining.date) : ''} onChange={e => setCurrentTraining({...currentTraining, date: formatDateForSave(e.target.value)})} className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-[#5B4DBC] outline-none transition-all" /></div>
                                <div><label className="text-xs font-bold text-gray-400 uppercase">Saat</label>
                                <input type="time" value={currentTraining.time || ''} onChange={e => setCurrentTraining({...currentTraining, time: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-[#5B4DBC] outline-none transition-all" /></div>
                            </div>
                            <div><label className="text-xs font-bold text-gray-400 uppercase">Konum</label>
                            <input type="text" value={currentTraining.location || ''} onChange={e => setCurrentTraining({...currentTraining, location: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-[#5B4DBC] outline-none transition-all" /></div>
                            <div><label className="text-xs font-bold text-gray-400 uppercase">Kısa Not</label>
                            <input type="text" value={currentTraining.note || ''} onChange={e => setCurrentTraining({...currentTraining, note: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-[#5B4DBC] outline-none transition-all" /></div>
                            
                            {/* YENİ: URL OnBlur Formatlama */}
                            <div>
                                <label className="text-xs font-bold text-[#00C4B4] uppercase flex items-center gap-1"><span className="material-icons-outlined text-[14px]">link</span>Ultiplays Etkinlik Linki</label>
                                <input 
                                    type="text" 
                                    placeholder="https://ultiplays.com/..." 
                                    value={(currentTraining as any).ultiplaysLink || ''} 
                                    onChange={e => setCurrentTraining({...currentTraining, ultiplaysLink: e.target.value} as any)} 
                                    onBlur={e => setCurrentTraining({...currentTraining, ultiplaysLink: formatUltiplaysLink(e.target.value)} as any)}
                                    className="w-full border-2 border-teal-100 bg-teal-50/30 rounded-xl p-3 focus:border-[#00C4B4] outline-none transition-all text-sm" 
                                />
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setIsFormModalOpen(false)} className="flex-1 py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors">Vazgeç</button>
                                <button onClick={handleSaveTraining} className="flex-[2] bg-[#5B4DBC] text-white py-3 rounded-2xl font-bold shadow-lg shadow-purple-100 hover:bg-[#4a3ea3] transition-colors">Kaydet</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* YOKLAMA MODALI */}
            {isAttendanceModalOpen && currentTraining && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
                        <div className="p-6 sm:p-8 border-b border-gray-50 flex justify-between items-center">
                            <div><h2 className="text-2xl font-black text-gray-800">Yoklama Al</h2><p className="text-sm font-bold text-[#00C4B4]">{parseTrainingDate(currentTraining.date).toLocaleDateString('tr-TR', {day:'numeric', month:'long'})}</p></div>
                            <div className="flex items-center gap-4">
                                <div className="bg-teal-50 text-teal-700 px-4 py-2 rounded-xl text-sm font-bold hidden sm:block">{currentTraining.attendeeIds?.length || 0} Kişi Katıldı</div>
                                <button onClick={() => setIsAttendanceModalOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors"><span className="material-icons-outlined">close</span></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
                                {sortedPlayerStats.map(player => {
                                    const isPresent = currentTraining.attendeeIds?.includes(player.id);
                                    return (
                                        <div key={player.id} onClick={() => {
                                            const attendees = currentTraining.attendeeIds || [];
                                            setCurrentTraining({ ...currentTraining, attendeeIds: isPresent ? attendees.filter(id => id !== player.id) : [...attendees, player.id] });
                                        }} className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border-2 h-fit ${isPresent ? 'bg-white border-[#00C4B4] shadow-sm' : 'bg-white border-transparent hover:border-gray-200 shadow-sm opacity-70 hover:opacity-100'}`}>
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                {player.photoUrl ? <img src={player.photoUrl} className="w-10 h-10 min-w-[40px] rounded-full object-cover" /> : <div className="w-10 h-10 min-w-[40px] rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400">{player.name.charAt(0)}</div>}
                                                <div className="flex flex-col truncate pr-2"><span className={`font-bold text-sm truncate ${isPresent ? 'text-gray-900' : 'text-gray-600'}`}>{player.name}</span><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{player.attendedCount} İdman Katılımı</span></div>
                                            </div>
                                            <div className="flex-shrink-0">{isPresent ? <span className="material-icons-outlined text-[#00C4B4]">check_circle</span> : <span className="material-icons-outlined text-gray-200">radio_button_unchecked</span>}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="p-6 sm:p-8 border-t border-gray-50 bg-white rounded-b-3xl">
                            <button onClick={async () => { await saveTraining(teamId!, currentTraining as Training); setIsAttendanceModalOpen(false); }} className="w-full bg-[#00C4B4] text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-teal-50 transition-transform active:scale-95">Yoklamayı Kaydet ({currentTraining.attendeeIds?.length || 0} Kişi)</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ANTRENMAN DETAY & ULTIPLAYS EVENT MODALI */}
            {isDetailModalOpen && currentTraining && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-start bg-gray-50/50 rounded-t-3xl">
                            <div>
                                <div className="bg-purple-100 text-[#5B4DBC] px-4 py-1 rounded-lg text-xs font-bold uppercase tracking-wider w-fit mb-3">
                                    {parseTrainingDate(currentTraining.date).toLocaleDateString('tr-TR', { weekday: 'long' })}
                                </div>
                                <h2 className="text-3xl font-black text-gray-800">
                                    {parseTrainingDate(currentTraining.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </h2>
                            </div>
                            <button onClick={() => setIsDetailModalOpen(false)} className="w-12 h-12 rounded-full bg-white shadow-sm border border-gray-100 text-gray-400 hover:text-gray-800 flex items-center justify-center transition-colors"><span className="material-icons-outlined">close</span></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="flex flex-wrap gap-4 border-b border-gray-100 pb-6">
                                <div className="flex items-center gap-2 text-gray-700 font-bold bg-gray-50 px-4 py-2 rounded-xl">
                                    <span className="material-icons-outlined text-[#5B4DBC]">schedule</span>{currentTraining.time}
                                </div>
                                <div className="flex items-center gap-2 text-gray-700 font-bold bg-gray-50 px-4 py-2 rounded-xl">
                                    <span className="material-icons-outlined text-[#5B4DBC]">place</span>{currentTraining.location || 'Konum belirtilmedi'}
                                </div>
                                {(currentTraining as any).ultiplaysLink && (
                                    <a href={(currentTraining as any).ultiplaysLink.replace('/api/', '/').replace('/events/', '/calendar/')} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#00C4B4] font-bold bg-teal-50 px-4 py-2 rounded-xl hover:bg-teal-100 transition-colors">
                                        <span className="material-icons-outlined">open_in_new</span>Ultiplays'te Aç
                                    </a>
                                )}
                            </div>
                            
                            {currentTraining.note && (
                                <div><h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Kısa Not</h3><p className="text-gray-800 bg-purple-50/50 border border-purple-100 p-5 rounded-2xl font-medium text-lg leading-relaxed">{currentTraining.note}</p></div>
                            )}

                            {/* --- YENİ: ULTIPLAYS EVENT LİSTESİ --- */}
                            {/* --- YENİ: ULTIPLAYS EVENT LİSTESİ --- */}
                            <div className="pt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                                        <span className="material-icons-outlined text-[#00C4B4]">fact_check</span>
                                        Ultiplays Event Yanıtları
                                    </h3>
                                    {/* DEBUG BUTONU */}
                                    <button 
                                        onClick={() => setShowRawData(!showRawData)}
                                        className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[#5B4DBC] flex items-center gap-1 border border-gray-200 px-2 py-1 rounded-lg"
                                    >
                                        <span className="material-icons-outlined text-[14px]">{showRawData ? 'visibility_off' : 'bug_report'}</span>
                                        {showRawData ? 'Veriyi Gizle' : 'Ham Veriyi Gör'}
                                    </button>
                                </div>
                                
                                {isLoadingEvent ? (
                                    <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00C4B4]"></div></div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* HAM VERİ GÖRÜNÜMÜ (DEBUG) */}
                                        {showRawData && (
                                            <div className="bg-gray-900 rounded-2xl p-4 overflow-hidden relative group">
                                                <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-2">
                                                    <span className="text-teal-400 text-[10px] font-mono">API Link: {(currentTraining as any).ultiplaysLink}</span>
                                                    <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText((currentTraining as any).ultiplaysLink);
                                                            alert('Link kopyalandı! Tarayıcıda açıp kontrol edebilirsiniz.');
                                                        }}
                                                        className="text-white bg-gray-800 px-2 py-1 rounded text-[10px] hover:bg-teal-600"
                                                    >
                                                        Linki Kopyala
                                                    </button>
                                                </div>
                                                <pre className="text-green-500 text-[11px] font-mono overflow-auto max-h-[300px] whitespace-pre-wrap">
                                                    {ultiplaysEventData ? JSON.stringify(ultiplaysEventData, null, 2) : 'Veri henüz yüklenmedi veya link hatalı.'}
                                                </pre>
                                            </div>
                                        )}

                                        {!ultiplaysEventData ? (
                                            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center">
                                                <span className="material-icons-outlined text-4xl text-gray-300 mb-2">link_off</span>
                                                <p className="text-gray-500 font-medium">Ultiplays verisi çekilemedi. Lütfen Ham Veri kısmından API linkini tarayıcıda açarak kontrol edin.</p>
                                            </div>
                                        ) : ultiplaysEventData.rsvps && ultiplaysEventData.rsvps.length > 0 ? (
                                            <div className="space-y-2">
                                                {ultiplaysEventData.rsvps.map((rsvp: any) => {
                                                    const matchedPlayer = players.find(p => {
                                                        const uId = (p as any).ultiplaysId;
                                                        return uId && uId.trim() === rsvp.userId.trim();
                                                    });
                                                    const isAttending = rsvp.status === 'attending';
                                                    const dateMod = new Date(rsvp.dateModified).toLocaleString('tr-TR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
                                                    return (
                                                        <div key={rsvp.userId} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors shadow-sm">
                                                            {matchedPlayer ? (
                                                                <div className="flex items-center gap-3">
                                                                    {matchedPlayer.photoUrl ? <img src={matchedPlayer.photoUrl} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-bold flex justify-center items-center text-sm">{matchedPlayer.name.charAt(0)}</div>}
                                                                    <span className="font-bold text-gray-800 text-lg">{matchedPlayer.name}</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-500 font-bold flex justify-center items-center text-xl">?</div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-gray-800">Eşleşmeyen Oyuncu</span>
                                                                        <span className="text-[10px] text-gray-400 font-mono select-all">ID: {rsvp.userId}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-xs font-bold text-gray-400 hidden sm:block">{dateMod}</span>
                                                                <span className={`px-3 py-1 rounded-lg text-xs font-bold w-24 text-center ${isAttending ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{isAttending ? 'Katılıyor' : 'Katılmıyor'}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="bg-orange-50 border-2 border-dashed border-orange-200 rounded-3xl p-8 text-center">
                                                <span className="material-icons-outlined text-4xl text-orange-300 mb-2">warning</span>
                                                <p className="text-orange-700 font-medium">Bağlantı başarılı ancak RSVPS listesi boş geliyor.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}