import { useEffect, useState } from 'react';
import { collection, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getPlayers, getTrainings, saveTraining, deleteTraining } from '../services/repository';
import type { Training, Player } from '../types';

type ViewMode = 'list' | 'stats';

// --- GELİŞMİŞ TARİH PARSER'I ---
// Tarihin önündeki veya sonundaki boşlukları temizler ve DD/MM/YYYY formatını kesin olarak çözer.
const parseTrainingDate = (dateStr: string | undefined): Date => {
    if (!dateStr) return new Date();
    
    // Boşlukları ve olası saat eklerini temizle ("14/04/2026 19:00" gibi durumlar için)
    const cleanStr = dateStr.trim().split(' ')[0]; 
    const parts = cleanStr.split(/[\/\.-]/);
    
    if (parts.length >= 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS'de aylar 0'dan başlar
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(year, month, day);
        }
    }
    
    const parsed = new Date(cleanStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
};

// Takvim input'u için YYYY-MM-DD
const formatDateForInput = (dateStr: string): string => {
    const d = parseTrainingDate(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Veritabanına kaydetmek için DD/MM/YYYY
const formatDateForSave = (inputVal: string): string => {
    if (!inputVal) return '';
    const [year, month, day] = inputVal.split('-');
    return `${day}/${month}/${year}`;
};

export default function Trainings() {
    const [teamId, setTeamId] = useState<string | null>(null);
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [currentTraining, setCurrentTraining] = useState<Partial<Training> | null>(null);

    useEffect(() => {
        const storedTeamId = localStorage.getItem('selectedTeamId');
        if (storedTeamId) {
            setTeamId(storedTeamId);
            const unsubPlayers = getPlayers(storedTeamId, (data) => setPlayers(data));
            const unsubTrainings = getTrainings(storedTeamId, (data) => {
                // KRONOLOJİK SIRALAMA: En yeni tarih en üstte (Aşağı doğru eskiye gider)
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

    // --- AYLARA GÖRE KRONOLOJİK GRUPLANDIRMA (DÜZELTİLDİ) ---
    const getGroupedTrainings = () => {
        // Obje yerine Map kullanıyoruz çünkü Map, ekleme sırasını asla bozmaz.
        const groupsMap = new Map<string, Training[]>();
        
        trainings.forEach(t => {
            const date = parseTrainingDate(t.date);
            const monthYear = date.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
            
            if (!groupsMap.has(monthYear)) {
                groupsMap.set(monthYear, []);
            }
            groupsMap.get(monthYear)!.push(t);
        });

        // Görüntüleme için Map'i Diziye (Array) çeviriyoruz (Böylece sıralama kesin korunur)
        return Array.from(groupsMap.entries()).map(([month, items]) => ({
            month,
            items
        }));
    };

    // --- OYUNCU İSTATİSTİKLERİ ---
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

    // --- ANDROID İLE BİREBİR AYNI FORMATTA CSV ÇIKTISI (DÜZELTİLDİ) ---
    const exportAttendanceToCSV = () => {
        try {
            let csv = "\uFEFF"; 
            csv += "İsim Soyisim;Yüzde;Toplam";
            
            // Kolonları (Tarihleri) En Eskiden (Solda) -> En Yeniye (Sağda) doğru sırala
            const chronological = [...trainings].sort((a, b) => {
                const dateA = parseTrainingDate(a.date);
                const dateB = parseTrainingDate(b.date);
                const timeA = a.time ? a.time.split(':') : ['0', '0'];
                const timeB = b.time ? b.time.split(':') : ['0', '0'];
                dateA.setHours(parseInt(timeA[0], 10), parseInt(timeA[1] || '0', 10));
                dateB.setHours(parseInt(timeB[0], 10), parseInt(timeB[1] || '0', 10));
                
                return dateA.getTime() - dateB.getTime(); 
            });

            // Başlık satırı tarihleri: Örn: "09 Ara", "12 Şub"
            chronological.forEach(t => {
                const d = parseTrainingDate(t.date);
                const day = String(d.getDate()).padStart(2, '0');
                let monthStr = d.toLocaleString('tr-TR', { month: 'short' }).replace('.', '');
                monthStr = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
                csv += `;${day} ${monthStr}`;
            });
            csv += "\n";

            // Oyuncu satırları ve katılım durumları (1 veya 0)
            getSortedPlayerStats().forEach(player => {
                let attendanceCols = "";
                chronological.forEach(t => {
                    attendanceCols += t.attendeeIds?.includes(player.id) ? ";1" : ";0";
                });
                
                // Android formatı yüzde hesabı: Örn: 57,69%
                const percentageStr = `${player.rate.toFixed(2).replace('.', ',')}%`;
                csv += `${player.name};${percentageStr};${player.attendedCount}${attendanceCols}\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            // Android uygulamasındaki gibi dinamik unix zaman damgasıyla indir
            link.setAttribute("download", `Yoklama_Cizelgesi_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            alert("CSV dışa aktarılırken bir hata oluştu.");
        }
    };

    const openCreateModal = () => {
        const today = new Date();
        const defaultDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        setCurrentTraining({
            date: defaultDate,
            time: '19:00',
            location: '', note: '', description: '', attendeeIds: [], isVisibleToMembers: true
        });
        setIsFormModalOpen(true);
    };

    const handleSaveTraining = async () => {
        if (!teamId || !currentTraining) return;
        const id = currentTraining.id || doc(collection(db, 'teams')).id;
        await saveTraining(teamId, { ...currentTraining, id } as Training);
        setIsFormModalOpen(false);
    };

    if (loading) return (
        <div className="flex justify-center items-center h-[70vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B4DBC]"></div>
        </div>
    );

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

            <div className="flex bg-gray-100 p-1 rounded-xl w-fit mb-8">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white text-[#5B4DBC] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Antrenman Listesi
                </button>
                <button 
                    onClick={() => setViewMode('stats')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'stats' ? 'bg-white text-[#5B4DBC] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Katılım İstatistikleri
                </button>
            </div>

            {viewMode === 'list' ? (
                <div className="space-y-12">
                    {groupedTrainingsArray.length > 0 ? groupedTrainingsArray.map(({ month, items }) => (
                        <section key={month}>
                            <h2 className="text-lg font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2 flex items-center gap-3">
                                {month}
                                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">{items.length} İdman</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {items.map(training => {
                                    const parsedDate = parseTrainingDate(training.date);
                                    return (
                                    <div key={training.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all group">
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="bg-purple-50 text-[#5B4DBC] px-3 py-1 rounded-lg text-xs font-bold uppercase">
                                                    {parsedDate.toLocaleDateString('tr-TR', { weekday: 'long' })}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => {setCurrentTraining(training); setIsFormModalOpen(true);}} className="p-1.5 text-gray-400 hover:text-[#5B4DBC]"><span className="material-icons-outlined text-sm">edit</span></button>
                                                    <button onClick={() => {if(window.confirm('Silinsin mi?')) deleteTraining(teamId!, training.id)}} className="p-1.5 text-gray-400 hover:text-red-500"><span className="material-icons-outlined text-sm">delete</span></button>
                                                </div>
                                            </div>
                                            <h3 className="font-black text-2xl text-gray-800 mb-1">
                                                {parsedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                                            </h3>
                                            <div className="text-gray-500 font-medium flex items-center gap-1 mb-4">
                                                <span className="material-icons-outlined text-sm">schedule</span>
                                                {training.time} • {training.location || 'Konum yok'}
                                            </div>
                                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50">
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
                                                    onClick={() => {setCurrentTraining(training); setIsAttendanceModalOpen(true);}}
                                                    className="bg-[#00C4B4] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#00a396] transition-colors"
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
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300 text-gray-400">
                            Henüz antrenman planlanmamış.
                        </div>
                    )}
                </div>
            ) : (
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
                                        {player.photoUrl ? (
                                            <img src={player.photoUrl} className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-purple-100 text-[#5B4DBC] flex items-center justify-center text-xs font-bold">
                                                {player.name.charAt(0)}
                                            </div>
                                        )}
                                        <span className="font-bold text-gray-800">{player.name}</span>
                                    </td>
                                    <td className="p-4 text-center text-gray-500 font-medium hidden md:table-cell">{trainings.length}</td>
                                    <td className="p-4 text-center text-[#5B4DBC] font-black text-lg">{player.attendedCount}</td>
                                    <td className="p-4 text-right">
                                        <div className="inline-flex items-center gap-2">
                                            <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden hidden sm:block">
                                                <div className={`h-full rounded-full ${player.rate > 75 ? 'bg-green-500' : player.rate > 40 ? 'bg-orange-500' : 'bg-red-500'}`} style={{width: `${player.rate}%`}}></div>
                                            </div>
                                            <span className={`font-black ${player.rate > 75 ? 'text-green-600' : player.rate > 40 ? 'text-orange-600' : 'text-red-600'}`}>
                                                %{player.rate.toFixed(0)}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isFormModalOpen && currentTraining && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-black text-gray-800 mb-6">{currentTraining.id ? 'Düzenle' : 'Yeni Plan'}</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Tarih</label>
                                    <input 
                                        type="date" 
                                        value={currentTraining.date ? formatDateForInput(currentTraining.date) : ''} 
                                        onChange={e => setCurrentTraining({...currentTraining, date: formatDateForSave(e.target.value)})} 
                                        className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-[#5B4DBC] outline-none transition-all" 
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Saat</label>
                                    <input type="time" value={currentTraining.time || ''} onChange={e => setCurrentTraining({...currentTraining, time: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-[#5B4DBC] outline-none transition-all" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Konum</label>
                                <input type="text" value={currentTraining.location || ''} onChange={e => setCurrentTraining({...currentTraining, location: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-[#5B4DBC] outline-none transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Kısa Not</label>
                                <input type="text" value={currentTraining.note || ''} onChange={e => setCurrentTraining({...currentTraining, note: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-[#5B4DBC] outline-none transition-all" />
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setIsFormModalOpen(false)} className="flex-1 py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors">Vazgeç</button>
                                <button onClick={handleSaveTraining} className="flex-[2] bg-[#5B4DBC] text-white py-3 rounded-2xl font-bold shadow-lg shadow-purple-100 hover:bg-[#4a3ea3] transition-colors">Kaydet</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isAttendanceModalOpen && currentTraining && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-gray-800">Yoklama Al</h2>
                                <p className="text-sm font-bold text-[#00C4B4]">{parseTrainingDate(currentTraining.date).toLocaleDateString('tr-TR', {day:'numeric', month:'long'})}</p>
                            </div>
                            <button onClick={() => setIsAttendanceModalOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors"><span className="material-icons-outlined">close</span></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                            {players.map(player => {
                                const isPresent = currentTraining.attendeeIds?.includes(player.id);
                                return (
                                    <div key={player.id} onClick={() => {
                                        const attendees = currentTraining.attendeeIds || [];
                                        setCurrentTraining({ ...currentTraining, attendeeIds: isPresent ? attendees.filter(id => id !== player.id) : [...attendees, player.id] });
                                    }} className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${isPresent ? 'bg-teal-50 border-2 border-teal-100' : 'bg-white border-2 border-transparent hover:bg-gray-50'}`}>
                                        <div className="flex items-center gap-4">
                                            {player.photoUrl ? <img src={player.photoUrl} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">{player.name.charAt(0)}</div>}
                                            <span className={`font-bold ${isPresent ? 'text-teal-800' : 'text-gray-700'}`}>{player.name}</span>
                                        </div>
                                        {isPresent ? <span className="material-icons-outlined text-teal-600">check_circle</span> : <span className="material-icons-outlined text-gray-200">radio_button_unchecked</span>}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-8 border-t border-gray-50">
                            <button onClick={async () => { await saveTraining(teamId!, currentTraining as Training); setIsAttendanceModalOpen(false); }} className="w-full bg-[#00C4B4] text-white py-4 rounded-2xl font-black shadow-xl shadow-teal-50 transition-transform active:scale-95">
                                Değişiklikleri Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}