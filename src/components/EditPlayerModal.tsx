import React, { useState } from 'react';
import type { Player } from '../types';
import { updatePlayer } from '../services/repository';

interface Props {
    player: Player;
    teamId: string;
    onClose: () => void;
    onUpdate: () => void; // Veri güncellenince tetiklenecek
}

export default function EditPlayerModal({ player, teamId, onClose, onUpdate }: Props) {
    const [formData, setFormData] = useState({ ...player });
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        const success = await updatePlayer(teamId, formData);
        setLoading(false);
        if (success) {
            onUpdate(); // Sayfayı yeniletmek için
            onClose();
        } else {
            alert("Güncelleme başarısız oldu.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Oyuncu Düzenle</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">İsim Soyisim</label>
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Forma No</label>
                            <input 
                                type="number" 
                                value={formData.jerseyNumber || ''}
                                onChange={(e) => setFormData({...formData, jerseyNumber: parseInt(e.target.value)})}
                                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pozisyon</label>
                            <select 
                                value={formData.position}
                                onChange={(e) => setFormData({...formData, position: e.target.value})}
                                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="Cutter">Cutter</option>
                                <option value="Handler">Handler</option>
                                <option value="Hybrid">Hybrid</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fotoğraf URL (İsteğe Bağlı)</label>
                        <input 
                            type="text" 
                            value={formData.photoUrl || ''}
                            onChange={(e) => setFormData({...formData, photoUrl: e.target.value})}
                            placeholder="https://..."
                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <input 
                            type="checkbox" 
                            id="isCaptain"
                            checked={formData.isCaptain}
                            onChange={(e) => setFormData({...formData, isCaptain: e.target.checked})}
                            className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <label htmlFor="isCaptain" className="text-sm font-medium text-gray-700">Takım Kaptanı</label>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">İptal</button>
                    <button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    );
}