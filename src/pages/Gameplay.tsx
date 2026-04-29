import React, { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Line, Group, Text } from 'react-konva';
import type { Playbook, PathType } from '../types';

const FIELD_WIDTH = 800;
const FIELD_HEIGHT = 350;
const ENDZONE_SIZE = 120;

const Gameplay: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]); // Kayıtlı taktikler listesi
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null); // Tıklanan oyuncunun ID'si

  // Sayfa açıldığında taktikleri getir (Simülasyon)
  useEffect(() => {
    // Burada fetch('/api/gameplay/list') yapılacak
    const mockData: Playbook[] = [
      { id: '1', title: 'Vertical Stack - H1', frames: [], createdAt: Date.now() },
      { id: '2', title: 'Side Stack - Zone Defense', frames: [], createdAt: Date.now() }
    ];
    setPlaybooks(mockData);
  }, []);

  const handleCreateNew = () => {
    setPlaybook({
      id: Math.random().toString(36).substr(2, 9),
      title: 'Yeni Taktik',
      frames: [{ actors: [
        { id: '1', type: 'offense', x: 250, y: 150 },
        { id: 'Disk', type: 'disc', x: 265, y: 150 }
      ], pathSettings: {} }],
      createdAt: Date.now(),
    });
    setIsEditing(true);
  };

  const handleEditPlay = (play: Playbook) => {
    setPlaybook(play);
    setIsEditing(true);
    setCurrentFrameIdx(0);
  };

  // --- LİSTE EKRANI ---
  if (!isEditing) {
    return (
      <div className="p-4 lg:p-8 bg-[#F9F9FB] min-h-screen">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Taktik Tahtası</h1>
              <p className="text-gray-500">Kayıtlı oyun planlarını yönetin ve yenilerini oluşturun.</p>
            </div>
            <button 
              onClick={handleCreateNew}
              className="flex items-center gap-2 bg-[#5B4DBC] text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-[#4A3E9F] transition-all"
            >
              <span className="material-icons-outlined">add</span>
              Yeni Taktik Oluştur
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playbooks.map((play) => (
              <div 
                key={play.id} 
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                onClick={() => handleEditPlay(play)}
              >
                <div className="w-full h-32 bg-gray-50 rounded-xl mb-4 flex items-center justify-center text-gray-300 group-hover:bg-[#5B4DBC]/5 transition-colors">
                  <span className="material-icons-outlined text-4xl">play_circle</span>
                </div>
                <h3 className="font-bold text-gray-800 mb-1">{play.title}</h3>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <span className="material-icons-outlined text-[14px]">calendar_today</span>
                  {new Date(play.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- EDİTÖR EKRANI ---
  if (!playbook) return null; // TS güvenliği: Playbook yoksa renderlama
  
  const currentFrame = playbook.frames[currentFrameIdx];
  // ... (Buradan sonrası önceki editör kodlarının devamı)

    const addFrame = () => {
    if (!playbook) return; // Null kontrolü
    const lastFrame = playbook.frames[playbook.frames.length - 1];
    // Bir önceki adımı (snapshot) kopyala
    const newFrame = JSON.parse(JSON.stringify(lastFrame));
    setPlaybook({ ...playbook, frames: [...playbook.frames, newFrame] });
    setCurrentFrameIdx(playbook.frames.length);
  };

  const handleDragEnd = (id: string, x: number, y: number) => {
    if (!playbook) return; 
    const updatedFrames = [...playbook.frames];
    const actorIdx = updatedFrames[currentFrameIdx].actors.findIndex(a => a.id === id);
    updatedFrames[currentFrameIdx].actors[actorIdx] = { 
        ...updatedFrames[currentFrameIdx].actors[actorIdx], x, y 
    };
    
    // Oyuncu hareket ettirildiyse ve henüz atanmış bir yolu yoksa varsayılan yol ata
    if (currentFrameIdx > 0) {
        const currentSettings = updatedFrames[currentFrameIdx].pathSettings || {};
        if (!currentSettings[id]) {
            const isDisc = updatedFrames[currentFrameIdx].actors[actorIdx].type === 'disc';
            updatedFrames[currentFrameIdx].pathSettings = {
                ...currentSettings,
                [id]: { type: isDisc ? 'pass' : 'sprint' }
            };
        }
    }
    
    setPlaybook({ ...playbook, frames: updatedFrames });
    setSelectedActorId(id); // Sürüklenen oyuncuyu seçili yap
  };

  // Yol tipini değiştiren fonksiyon
  const changePathType = (type: PathType) => {
    if (!playbook || !selectedActorId || currentFrameIdx === 0) return;
    const updatedFrames = [...playbook.frames];
    
    const currentSettings = updatedFrames[currentFrameIdx].pathSettings || {};
    updatedFrames[currentFrameIdx].pathSettings = {
        ...currentSettings,
        [selectedActorId]: { ...currentSettings[selectedActorId], type }
    };
    
    setPlaybook({ ...playbook, frames: updatedFrames });
  };

    return (
        <div className="p-4 lg:p-8 bg-[#F9F9FB] min-h-screen">
            <div className="max-w-5xl mx-auto">

                {/* Üst Toolbar */}
                <div className="mb-6 flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#5B4DBC]/10 flex items-center justify-center text-[#5B4DBC]">
                            <span className="material-icons-outlined">architecture</span>
                        </div>
                        <button onClick={() => setIsEditing(false)} className="mr-2 p-2 hover:bg-gray-100 rounded-full">
    <span className="material-icons-outlined">arrow_back</span>
</button>
<h2 className="text-xl font-bold text-gray-800">{playbook.title}</h2>
                    </div>

                    <div className="flex gap-2 items-center overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                        {playbook.frames.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentFrameIdx(idx)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${currentFrameIdx === idx
                                        ? 'bg-[#5B4DBC] text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                Step {idx + 1}
                            </button>
                        ))}
                        <button
                            onClick={addFrame}
                            className="px-4 py-2 bg-green-50 text-green-600 border border-green-200 rounded-xl text-sm font-bold flex items-center gap-1 hover:bg-green-100 transition-all whitespace-nowrap"
                        >
                            <span className="material-icons-outlined text-[18px]">add</span>
                            Step Ekle
                        </button>
                    </div>
                </div>

{/* Yol (Path) Düzenleme Araç Çubuğu (Sadece Step 0'dan büyükse ve bir oyuncu seçiliyse görünür) */}
        {currentFrameIdx > 0 && selectedActorId && (
            <div className="mb-4 flex flex-wrap items-center gap-3 bg-indigo-50 p-3 rounded-xl border border-indigo-100 transition-all">
                <span className="text-sm font-bold text-indigo-800 flex items-center gap-1">
                    <span className="material-icons-outlined text-[18px]">route</span>
                    "{selectedActorId}" Rotası:
                </span>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={() => changePathType('sprint')} 
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${playbook.frames[currentFrameIdx].pathSettings?.[selectedActorId]?.type === 'sprint' ? 'bg-[#5B4DBC] text-white shadow-md' : 'bg-white text-[#5B4DBC] border border-indigo-200 hover:bg-indigo-100'}`}
                    >
                        Sprint (Düz)
                    </button>
                    <button 
                        onClick={() => changePathType('cut')} 
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${playbook.frames[currentFrameIdx].pathSettings?.[selectedActorId]?.type === 'cut' ? 'bg-[#5B4DBC] text-white shadow-md' : 'bg-white text-[#5B4DBC] border border-indigo-200 hover:bg-indigo-100'}`}
                    >
                        Cut (Keskin)
                    </button>
                    <button 
                        onClick={() => changePathType('curved')} 
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${playbook.frames[currentFrameIdx].pathSettings?.[selectedActorId]?.type === 'curved' ? 'bg-[#5B4DBC] text-white shadow-md' : 'bg-white text-[#5B4DBC] border border-indigo-200 hover:bg-indigo-100'}`}
                    >
                        Kavisli Koşu
                    </button>
                    {playbook.frames[currentFrameIdx].actors.find(a => a.id === selectedActorId)?.type === 'disc' && (
                        <button 
                            onClick={() => changePathType('pass')} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${playbook.frames[currentFrameIdx].pathSettings?.[selectedActorId]?.type === 'pass' ? 'bg-yellow-500 text-white shadow-md' : 'bg-white text-yellow-600 border border-yellow-200 hover:bg-yellow-100'}`}
                        >
                            Pas (Disk)
                        </button>
                    )}
                </div>
            </div>
        )}

        {/* Saha Alanı */}
        <div className="flex justify-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">                    <Stage width={FIELD_WIDTH} height={FIELD_HEIGHT} className="rounded-lg overflow-hidden shadow-inner cursor-crosshair border-2 border-gray-300">
                        <Layer>
                            {/* Yeşil Saha Zemin */}
                            <Rect width={FIELD_WIDTH} height={FIELD_HEIGHT} fill="#3e8e41" />

                            {/* Endzone Çizgileri */}
                            <Line points={[ENDZONE_SIZE, 0, ENDZONE_SIZE, FIELD_HEIGHT]} stroke="white" strokeWidth={3} opacity={0.8} />
                            <Line points={[FIELD_WIDTH - ENDZONE_SIZE, 0, FIELD_WIDTH - ENDZONE_SIZE, FIELD_HEIGHT]} stroke="white" strokeWidth={3} opacity={0.8} />

                            {/* Orta Saha Çizgisi */}
                            <Line points={[FIELD_WIDTH / 2, 0, FIELD_WIDTH / 2, FIELD_HEIGHT]} stroke="white" strokeWidth={2} opacity={0.4} />

                            {/* Rota (Koşu ve Pas yolları) Çizimi (Şimdiki ve Önceki Step Arası) */}
              {currentFrameIdx > 0 && currentFrame.actors.map(actor => {
                const prevActor = playbook.frames[currentFrameIdx - 1].actors.find(a => a.id === actor.id);
                if (!prevActor || (prevActor.x === actor.x && prevActor.y === actor.y)) return null;
                
                const isDisc = actor.type === 'disc';
                const pathSetting = currentFrame.pathSettings?.[actor.id];
                const pathType = pathSetting?.type || (isDisc ? 'pass' : 'sprint');
                
                // Seçili oyuncunun yolu vurgulansın
                const isSelected = selectedActorId === actor.id;
                const strokeColor = isDisc ? '#FBBF24' : (isSelected ? '#5B4DBC' : '#E5E7EB');

                return (
                  <Line
                    key={`path-${actor.id}`}
                    points={[prevActor.x, prevActor.y, actor.x, actor.y]}
                    stroke={strokeColor}
                    strokeWidth={isDisc || isSelected ? 3 : 2}
                    dash={pathType === 'sprint' ? [10, 5] : pathType === 'cut' ? [5, 5] : []}
                    opacity={isSelected ? 1 : 0.7}
                    onClick={() => setSelectedActorId(actor.id)}
                    onTap={() => setSelectedActorId(actor.id)} // Mobilde dokunmak için
                  />
                );
              })}

                            {/* Oyuncular ve Disk Objeleri */}
              {currentFrame.actors.map((actor) => (
                <Group
                  key={actor.id}
                  x={actor.x}
                  y={actor.y}
                  draggable
                  onClick={() => setSelectedActorId(actor.id)}
                  onTap={() => setSelectedActorId(actor.id)} // Mobilde dokunmak için
                  onDragEnd={(e) => handleDragEnd(actor.id, e.target.x(), e.target.y())}
                >
                                    <Circle
                                        radius={actor.type === 'disc' ? 8 : 14}
                                        fill={
                                            actor.type === 'offense' ? '#2F58CD' : // Hücum - Mavi
                                                actor.type === 'defense' ? '#EF4444' : // Savunma - Kırmızı
                                                    '#FFFFFF' // Disk - Beyaz
                                        }
                                        stroke={actor.type === 'disc' ? '#000' : '#FFF'}
                                        strokeWidth={2}
                                        shadowColor="black"
                                        shadowBlur={4}
                                        shadowOpacity={0.4}
                                    />
                                    {actor.type !== 'disc' && (
                                        <Text
                                            text={actor.id}
                                            fontSize={12}
                                            fill="white"
                                            x={-actor.id.length * 3.5} // Yazıyı ortalamak için
                                            y={-6}
                                            fontStyle="bold"
                                        />
                                    )}
                                </Group>
                            ))}
                        </Layer>
                    </Stage>
                </div>

                {/* Bilgilendirme Kartı */}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                    <strong className="flex items-center gap-1 mb-1"><span className="material-icons-outlined text-[18px]">info</span> Nasıl Çalışır?</strong>
                    <p>1. Oyuncuları sürükleyerek saha üzerinde konumlandırın.<br />
                        2. <strong>"Step Ekle"</strong> butonuna basarak bir sonraki zaman dilimine geçin.<br />
                        3. Yeni step'te oyuncuların yerini değiştirdiğinizde, bir önceki konumdan yeni konuma koşu/pas yolu otomatik çizilecektir.</p>
                </div>
            </div>
        </div>
    );
};

export default Gameplay;