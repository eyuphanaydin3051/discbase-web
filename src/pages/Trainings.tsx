import { useEffect, useState } from 'react';
import { collection, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getPlayers, getTrainings, saveTraining, deleteTraining } from '../services/repository';
import type { Training, Player } from '../types';

export default function Trainings() {
    const [teamId, setTeamId] = useState<string | null>(null);
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [currentTraining, setCurrentTraining] = useState<Partial<Training> | null>(null);

    useEffect(() => {
        const storedTeamId = localStorage.getItem('selectedTeamId');
        if (storedTeamId) {
            setTeamId(storedTeamId);

            // Oyuncuları çek (Yoklama için)
            const unsubPlayers = getPlayers(storedTeamId, (data) => setPlayers(data));

            // Antrenmanları çek
            const unsubTrainings = getTrainings(storedTeamId, (data) => {
                setTrainings(data as Training[]);
                setLoading(false);
            });

            return () => {
                unsubPlayers();
                unsubTrainings();
            };
        }
    }, []);

    const openCreateModal = () => {
        setCurrentTraining({
            date: new Date().toISOString().split('T')[0],
            time: '19:00',
            location: '',
            note: '',
            description: '',
            attendeeIds: [],
            isVisibleToMembers: true
        });
        setIsFormModalOpen(true);
    };

    const openEditModal = (training: Training) => {
        setCurrentTraining(training);
        setIsFormModalOpen(true);
    };

    const openAttendanceModal = (training: Training) => {
        setCurrentTraining(training);
        setIsAttendanceModalOpen(true);
    };

    const handleSaveTraining = async () => {
        if (!teamId || !currentTraining) return;

        // Yeni ekleniyorsa Firebase'den benzersiz ID oluştur
        const id = currentTraining.id || doc(collection(db, 'teams')).id;

        const trainingToSave: Training = {
            ...currentTraining,
            id
        } as Training;

        await saveTraining(teamId, trainingToSave);
        setIsFormModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (!teamId) return;
        if (window.confirm('Bu antrenmanı silmek istediğinize emin misiniz?')) {
            await deleteTraining(teamId, id);
        }
    };

    const toggleAttendance = (playerId: string) => {
        if (!currentTraining) return;
        const attendees = currentTraining.attendeeIds || [];
        const isPresent = attendees.includes(playerId);

        setCurrentTraining({
            ...currentTraining,
            attendeeIds: isPresent
                ? attendees.filter(id => id !== playerId)
                : [...attendees, playerId]
        });
    };

    const handleSaveAttendance = async () => {
        if (!teamId || !currentTraining) return;
        await saveTraining(teamId, currentTraining as Training);
        setIsAttendanceModalOpen(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[70vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B4DBC]"></div>
            </div>
        );
    }

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full pb-24 lg:pb-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <span className="material-icons-outlined text-[#5B4DBC]">fitness_center</span>
                        Antrenmanlar
                    </h1>
                    <p className="text-gray-500 mt-1">Takım antrenmanlarını ve yoklamaları yönetin.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-[#5B4DBC] text-white px-4 py-2 rounded-lg shadow hover:bg-[#4a3ea3] flex items-center gap-2 transition-colors"
                >
                    <span className="material-icons-outlined">add</span>
                    Yeni Antrenman
                </button>
            </div>

            {/* Antrenman Listesi */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {trainings.length > 0 ? trainings.map(training => (
                    <div key={training.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">{training.date} • {training.time}</h3>
                                <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                                    <span className="material-icons-outlined text-[16px]">place</span>
                                    {training.location || 'Konum Belirtilmedi'}
                                </p>
                            </div>
                            <div className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                                <span className="material-icons-outlined text-[16px]">people</span>
                                {training.attendeeIds?.length || 0} / {players.length}
                            </div>
                        </div>
                        {training.note && (
                            <div className="px-5 py-3 bg-gray-50 text-sm text-gray-600 border-b border-gray-100">
                                <span className="font-semibold text-gray-700">Not:</span> {training.note}
                            </div>
                        )}
                        <div className="p-4 bg-gray-50 flex gap-2 justify-end">
                            <button onClick={() => openAttendanceModal(training)} className="flex-1 bg-white border border-[#5B4DBC] text-[#5B4DBC] py-2 rounded-lg text-sm font-semibold hover:bg-purple-50 transition-colors">
                                Yoklama Al
                            </button>
                            <button onClick={() => openEditModal(training)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100">
                                <span className="material-icons-outlined text-sm">edit</span>
                            </button>
                            <button onClick={() => handleDelete(training.id)} className="w-10 h-10 flex items-center justify-center bg-white border border-red-200 text-red-500 rounded-lg hover:bg-red-50">
                                <span className="material-icons-outlined text-sm">delete</span>
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm border border-gray-100">
                        Henüz kayıtlı antrenman bulunmuyor. Yeni bir antrenman ekleyerek başlayın.
                    </div>
                )}
            </div>

            {/* Antrenman Ekleme/Düzenleme Modal */}
            {isFormModalOpen && currentTraining && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">
                                {currentTraining.id ? 'Antrenmanı Düzenle' : 'Yeni Antrenman'}
                            </h2>
                            <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                                    <input type="date" value={currentTraining.date || ''} onChange={e => setCurrentTraining({ ...currentTraining, date: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#5B4DBC] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Saat</label>
                                    <input type="time" value={currentTraining.time || ''} onChange={e => setCurrentTraining({ ...currentTraining, time: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#5B4DBC] outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Konum</label>
                                <input type="text" placeholder="Örn: ODTÜ Devrim Stadyumu" value={currentTraining.location || ''} onChange={e => setCurrentTraining({ ...currentTraining, location: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#5B4DBC] outline-none" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kısa Not / Odak</label>
                                <input type="text" placeholder="Örn: Rüzgarlı hava, zone defense" value={currentTraining.note || ''} onChange={e => setCurrentTraining({ ...currentTraining, note: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#5B4DBC] outline-none" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Detaylı Açıklama</label>
                                <textarea rows={3} value={currentTraining.description || ''} onChange={e => setCurrentTraining({ ...currentTraining, description: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#5B4DBC] outline-none resize-none"></textarea>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={currentTraining.isVisibleToMembers} onChange={e => setCurrentTraining({ ...currentTraining, isVisibleToMembers: e.target.checked })} className="rounded text-[#5B4DBC] focus:ring-[#5B4DBC] w-4 h-4 cursor-pointer" />
                                <span className="text-sm font-medium text-gray-700">Oyunculara Görünür Olsun</span>
                            </label>

                            <button onClick={handleSaveTraining} className="w-full bg-[#5B4DBC] text-white py-3 rounded-lg font-bold shadow hover:bg-[#4a3ea3] mt-4 transition-colors">
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Yoklama (Attendance) Modal */}
            {isAttendanceModalOpen && currentTraining && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Yoklama Çizelgesi</h2>
                                <p className="text-sm text-gray-500 mt-1">{currentTraining.date} - {currentTraining.location}</p>
                            </div>
                            <button onClick={() => setIsAttendanceModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-2 flex-1 overflow-y-auto">
                            {players.map(player => {
                                const isPresent = currentTraining.attendeeIds?.includes(player.id);
                                return (
                                    <div key={player.id} onClick={() => toggleAttendance(player.id)} className="flex items-center justify-between p-3 mb-1 hover:bg-gray-50 rounded-lg cursor-pointer border-b border-gray-50 last:border-0">
                                        <div className="flex items-center gap-3">
                                            {player.photoUrl ? (
                                                <img src={player.photoUrl} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                                                    {player.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold text-gray-800">{player.name}</div>
                                                <div className="text-xs text-gray-500">{player.position}</div>
                                            </div>
                                        </div>
                                        <div>
                                            {isPresent ? (
                                                <span className="material-icons-outlined text-[#00C4B4]">check_circle</span>
                                            ) : (
                                                <span className="material-icons-outlined text-gray-300">radio_button_unchecked</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-white rounded-b-2xl">
                            <div className="flex justify-between items-center mb-4 text-sm font-bold text-gray-700">
                                <span>Toplam Katılım:</span>
                                <span className="text-[#5B4DBC]">{currentTraining.attendeeIds?.length || 0} / {players.length} Kişi</span>
                            </div>
                            <button onClick={handleSaveAttendance} className="w-full bg-[#00C4B4] text-white py-3 rounded-lg font-bold shadow hover:bg-[#00a396] transition-colors">
                                Yoklamayı Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}