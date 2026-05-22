import React, { useState, useEffect, useRef } from 'react'; // useRef eklendi
import { Stage, Layer, Rect, Circle, Line, Group, Text, Arrow } from 'react-konva';
import type { Playbook, PathType, PlaybookActor } from '../types'; // PlaybookActor eklendi
import Konva from 'konva'; // Konva ana objesi

const FIELD_WIDTH = 850; // Tasarıma göre biraz genişletildi
const FIELD_HEIGHT = 370; // Tasarıma göre biraz genişletildi
const ENDZONE_SIZE = 120;

const Gameplay: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null); // Harici drag-drop koordinat hesaplaması için ref
  const [isEditing, setIsEditing] = useState(false);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  // Animasyon state'leri
  const [progress, setProgress] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  // Dinamik Numaralandırma State'i (O1, D1, C1 şeklinde başlaması için)
  const [nextActorNums, setNextActorNums] = useState({ offense: 1, defense: 1, cone: 1 });
  // Sayfa açıldığında taktikleri getir (Simülasyon)
  useEffect(() => {
    // Burada fetch('/api/gameplay/list') yapılacak
    const mockData: Playbook[] = [
      { id: '1', title: 'Vertical Stack - H1', frames: [], createdAt: Date.now() },
      { id: '2', title: 'Side Stack - Zone Defense', frames: [], createdAt: Date.now() }
    ];
    setPlaybooks(mockData);
  }, []);

  // --- YENİ TEMİZ TASARIM FONKSİYONLARI ---

  const handleCreateNew = () => {
    setPlaybook({
      id: Math.random().toString(36).substr(2, 9),
      title: 'Yeni Oyun Planı',
      frames: [{ actors: [], pathSettings: {} }], // BAŞTA SAHA BOŞ
      createdAt: Date.now(),
    });
    setNextActorNums({ offense: 1, defense: 1, cone: 1 }); // Numaraları sıfırla
    setIsEditing(true);
  };

  // Harici Drag-Drop Mantığı (Toolbar'dan sahaya bırakma)
  const handleExternalDrop = (e: React.DragEvent<HTMLDivElement>, actorType: PlaybookActor['type']) => {
    e.preventDefault();
    if (!playbook || !stageRef.current) return;

    // Sahne koordinatlarını hesapla
    stageRef.current.setPointersPositions(e);
    const pos = stageRef.current.getPointerPosition();
    if (!pos) return;

    // Dinamik ID ve Numarayı belirle
    let newId = '';
    let currentNum = 1;
    if (actorType === 'offense') {
        currentNum = nextActorNums.offense;
        newId = `O${currentNum}`;
        setNextActorNums(prev => ({ ...prev, offense: prev.offense + 1 })); // Sonraki sayıyı artır
    } else if (actorType === 'defense') {
        currentNum = nextActorNums.defense;
        newId = `D${currentNum}`;
        setNextActorNums(prev => ({ ...prev, defense: prev.defense + 1 }));
    } else if (actorType === 'cone') {
        currentNum = nextActorNums.cone;
        newId = `C${currentNum}`;
        setNextActorNums(prev => ({ ...prev, cone: prev.cone + 1 }));
    } else {
        newId = 'Disk'; // Disk tekil
    }

    // Disk zaten sahadaysa tekrar ekleme kontrolü
    if (actorType === 'disc') {
        const discExists = playbook.frames[currentFrameIdx].actors.some(a => a.type === 'disc');
        if (discExists) return; 
    }

    // Yeni aktörü oluştur
    const newActor: PlaybookActor = {
        id: newId,
        type: actorType,
        x: pos.x,
        y: pos.y
    };

    // Mevcut frame'e aktörü ekle
    const updatedFrames = [...playbook.frames];
    updatedFrames[currentFrameIdx] = {
        ...updatedFrames[currentFrameIdx],
        actors: [...updatedFrames[currentFrameIdx].actors, newActor]
    };

    setPlaybook({ ...playbook, frames: updatedFrames });
    setSelectedActorId(newId); // Bırakılanı seçili yap
  };

  // Harici sürükleme başlarken datatransfer'e tip yazma (TS hatası vermemesi için ANY)
  const handleToolbarDragStart = (e: React.DragEvent<HTMLDivElement>, type: string) => {
    e.dataTransfer.setData('actorType', type);
  };

  // Yeni Adım (Frame) Ekleme
  const addFrame = () => {
    if (!playbook) return; 
    const lastFrame = playbook.frames[playbook.frames.length - 1];
    const newFrame = JSON.parse(JSON.stringify(lastFrame));
    setPlaybook({ ...playbook, frames: [...playbook.frames, newFrame] });
    setCurrentFrameIdx(playbook.frames.length);
  };

  // Sahada oyuncu sürüklendiğinde konumunu güncelleme
  const handleDragEnd = (id: string, x: number, y: number) => {
    if (!playbook) return; 
    const updatedFrames = [...playbook.frames];
    const actorIdx = updatedFrames[currentFrameIdx].actors.findIndex(a => a.id === id);
    updatedFrames[currentFrameIdx].actors[actorIdx] = { 
        ...updatedFrames[currentFrameIdx].actors[actorIdx], x, y 
    };
    
    // Hareket ettiğinde henüz rotası yoksa varsayılan rota ata
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
    setSelectedActorId(id);
  };

  // Kavis (Curve) veya Cut köşe noktasını sürüklediğinde kaydetme
  const handleControlPointDragEnd = (actorId: string, x: number, y: number) => {
    if (!playbook || currentFrameIdx === 0) return;
    const updatedFrames = [...playbook.frames];
    const currentSettings = updatedFrames[currentFrameIdx].pathSettings || {};
    
    updatedFrames[currentFrameIdx].pathSettings = {
        ...currentSettings,
        [actorId]: { ...currentSettings[actorId], controlPoint: { x, y } }
    };
    setPlaybook({ ...playbook, frames: updatedFrames });
  };

  // Seçili oyuncunun rota (yol) türünü değiştirme
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


  // --- ANİMASYON MANTIĞI REVİZYONU ---

  // Temel animasyon akışını yöneten jenerik fonksiyon
  const runSingleStepAnimation = (duration: number = 1000): Promise<void> => {
    return new Promise((resolve) => {
        let start = performance.now();
        
        const animate = (time: number) => {
            let timeFraction = (time - start) / duration;
            if (timeFraction > 1) timeFraction = 1; 
            
            setProgress(timeFraction);

            if (timeFraction < 1) {
                requestAnimationFrame(animate); 
            } else {
                resolve(); // Animasyon bittiğinde sözü (promise) tamamla
            }
        };
        requestAnimationFrame(animate);
    });
  };

  // Senaryo 1: Tüm Adımları Başından Oynat
  const playAllSteps = async () => {
    if (!playbook || playbook.frames.length < 2 || isPlaying) return;
    setIsPlaying(true);
    setCurrentFrameIdx(0); // Başa sar
    setProgress(1); // Frame 1 pozisyonlarını anlık göster

    // Adım 1'den sona kadar döngü kur
    for (let i = 1; i < playbook.frames.length; i++) {
        setCurrentFrameIdx(i); // Şimdiki frame'i hedef yap (Çizgiler görünür olur)
        setProgress(0); // Animasyonu başlat
        await runSingleStepAnimation(1200); // 1.2sn bekle (Hareket tamamlanana kadar)
    }

    setIsPlaying(false);
  };

  // Senaryo 2: Ok Butonu - Bir Sonraki Adıma Animasyonlu Geç
  const playNextStep = async () => {
    if (!playbook || currentFrameIdx === playbook.frames.length - 1 || isPlaying) return;
    setIsPlaying(true);
    setProgress(0); // Mevcut konumdan başla
    setCurrentFrameIdx(prev => prev + 1); // Hedef frame'e geç (Çizgiler görünür olur)
    
    await runSingleStepAnimation(1200); // Animasyon tamamlanana kadar bekle

    setIsPlaying(false);
  };

  // Önceki fonksiyonları silmek için boş Ctrl+F blokları:
  // BUL: playAnimation = () => { ... requestAnimationFrame(animate); };
  // SİL.

  const handleEditPlay = (play: Playbook) => {
    setPlaybook(play);
    setIsEditing(true);
    setCurrentFrameIdx(0);
  };

 // --- LİSTE EKRANI ---
  if (!isEditing) {
    return (
      <div className="p-4 lg:p-8 bg-[#F9F9FB] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Oyun Planı Arşivi</h1>
              <p className="text-gray-500 mt-1">Daha önce oluşturulmuş taktikleri yönetin.</p>
            </div>
            <button 
              onClick={handleCreateNew}
              className="flex items-center gap-2.5 bg-[#5B4DBC] text-white px-7 py-3.5 rounded-2xl font-bold shadow-lg hover:bg-[#4A3E9F] transition-all transform hover:-translate-y-0.5"
            >
              <span className="material-icons-outlined">add_circle_outline</span>
              Yeni Plan Oluştur
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playbooks.map((play) => (
              <div 
                key={play.id} 
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-all cursor-pointer group transform hover:-translate-y-1"
                onClick={() => handleEditPlay(play)}
              >
                <div className="w-full h-36 bg-gray-50 rounded-2xl mb-5 flex items-center justify-center text-gray-300 group-hover:bg-[#5B4DBC]/5 transition-colors border border-gray-100 shadow-inner">
                  <span className="material-icons-outlined text-5xl">architecture</span>
                </div>
                <h3 className="font-bold text-gray-800 mb-1.5 group-hover:text-[#5B4DBC]">{play.title}</h3>
                <p className="text-xs text-gray-400 flex items-center gap-1.5 bg-gray-50 p-2 rounded-lg inline-block">
                  <span className="material-icons-outlined text-[15px]">calendar_today</span>
                  {new Date(play.createdAt).toLocaleDateString('tr-TR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- REVİZE EDİLMİŞ EDİTÖR EKRANI ---
  if (!playbook) return null; 
  const currentFrame = playbook.frames[currentFrameIdx];

  // Toolbar'daki dinamik etiketler (User isteği: O1 yerleşince O2 görünür)
  const toolbarLabels = {
    offense: `O${nextActorNums.offense}`,
    defense: `D${nextActorNums.defense}`,
    cone: `C${nextActorNums.cone}`,
    disc: '🥏 Disc'
  };

  return (
    <div className="bg-[#F6F7F9] min-h-screen">
      
      {/* 1. ÜST TOOLBAR (Görseldeki gibi temiz) */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={() => setIsEditing(false)} className="mr-1 p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <span className="material-icons-outlined">arrow_back</span>
            </button>
            <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#5B4DBC]/10 flex items-center justify-center text-[#5B4DBC] border border-[#5B4DBC]/20 shadow-inner">
                    <span className="material-icons-outlined text-[20px]">architecture</span>
                </div>
                <h2 className="text-lg font-bold text-gray-800">{playbook.title}</h2>
            </div>
        </div>

        <div className="flex gap-2.5 items-center">
            {/* OYNAT BUTONU (Hepsini oynatır) */}
            <button 
                onClick={playAllSteps}
                disabled={isPlaying || currentFrameIdx === 0}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${isPlaying ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-[#5B4DBC] border border-blue-100 hover:bg-blue-100 shadow-sm'}`}
            >
              <span className="material-icons-outlined text-[20px]">{isPlaying ? 'hourglass_empty' : 'play_arrow'}</span>
              {isPlaying ? 'Oynatılıyor' : 'Tümünü Oynat'}
            </button>
            
            {/* SONRAKİ ADIM BUTONU (User isteği: Ok butonu) */}
            <button 
                onClick={playNextStep}
                disabled={isPlaying || currentFrameIdx === playbook.frames.length - 1}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-200 transition-all disabled:opacity-50"
                title="Sonraki Adıma Animasyonlu Geç"
            >
              <span className="material-icons-outlined text-[20px]">double_arrow</span>
            </button>
            
            <button 
                onClick={addFrame} 
                disabled={isPlaying}
                className="ml-2 px-5 py-2.5 bg-[#22C55E] text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#1DA851] transition-all shadow disabled:opacity-50"
            >
              <span className="material-icons-outlined text-[20px]">add</span>
              Yeni Adım
            </button>
        </div>
      </div>

      <div className="p-4 lg:p-6 flex flex-col items-center">
        
        {/* 2. HARİCİ SÜRÜKLEME VE TİMELINE ALANI (Görseldeki gibi) */}
        <div className="max-w-[1200px] w-full bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* SOL: Sürüklenebilir Objeler */}
            <div className="flex gap-3 items-center bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
                <span className="text-xs font-bold text-gray-500 mr-2">Ekle:</span>
                {[
                    { type: 'cone', label: toolbarLabels.cone, color: '#D97706' }, // Cone (Kuka) Eklendi
                    { type: 'offense', label: toolbarLabels.offense, color: '#2F58CD' },
                    { type: 'defense', label: toolbarLabels.defense, color: '#EF4444' },
                    { type: 'disc', label: toolbarLabels.disc, color: '#fff' }
                ].map(obj => (
                    <div
                        key={obj.type}
                        draggable
                        onDragStart={(e) => handleToolbarDragStart(e, obj.type)}
                        className="cursor-grab select-none w-14 h-14 flex items-center justify-center rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#5B4DBC]/30 hover:scale-105 transition-all bg-white"
                        style={obj.type === 'disc' ? { border: '2px solid #000' } : { borderBottom: `4px solid ${obj.color}` }}
                    >
                        {obj.type === 'cone' ? (
                            <div className="w-8 h-8 rounded bg-[#D97706] text-white font-bold flex items-center justify-center text-xs shadow-inner">C</div>
                        ) : (
                            <Circle radius={18} fill={obj.color} stroke={obj.type === 'disc' ? '#000' : '#FFF'} strokeWidth={1} shadowColor="rgba(0,0,0,0.3)" shadowBlur={2} />
                        )}
                        <Text text={obj.label} fill={obj.type === 'offense' || obj.type === 'defense' ? 'white' : 'black'} fontSize={12} fontStyle="bold" x={-10} y={-5} />
                    </div>
                ))}
            </div>

            {/* SAĞ: Gelişmiş Timeline */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full md:max-w-[50%]">
                <span className="text-xs font-bold text-gray-500">Adımlar:</span>
                {playbook.frames.map((_, idx) => (
                <button
                    key={idx}
                    onClick={() => { if(!isPlaying) setCurrentFrameIdx(idx); }}
                    disabled={isPlaying}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${currentFrameIdx === idx ? 'bg-[#5B4DBC] text-white shadow-lg scale-105' : 'bg-white text-gray-600 border border-gray-100 hover:border-gray-200'}`}
                >
                    Adım {idx + 1}
                </button>
                ))}
            </div>
        </div>

        {/* 3. SAHA ALANI (Harici Drop'u kabul eden container) */}
        <div 
            className="w-full max-w-[1200px] flex flex-col lg:flex-row gap-5 items-start justify-center"
            onDragOver={(e) => e.preventDefault()} // Sürüklemeyi kabul etmek için gerekli
            onDrop={(e) => {
                const type = e.dataTransfer.getData('actorType') as PlaybookActor['type'];
                if (type) handleExternalDrop(e, type);
            }}
        >
          {/* SAHA */}
          <div className="flex-grow flex justify-center bg-white p-3 rounded-3xl shadow-lg border border-gray-100 overflow-x-auto shadow-indigo-100/50">
            <Stage ref={stageRef} width={FIELD_WIDTH} height={FIELD_HEIGHT} className="rounded-2xl overflow-hidden shadow-inner border-2 border-dashed border-gray-200">
                <Layer>
                {/* Yeşil Saha Zemin */}
                <Rect width={FIELD_WIDTH} height={FIELD_HEIGHT} fill="#3e8e41" />
                {/* Saha Çizgileri */}
                <Line points={[ENDZONE_SIZE, 0, ENDZONE_SIZE, FIELD_HEIGHT]} stroke="white" strokeWidth={3} opacity={0.6} />
                <Line points={[FIELD_WIDTH - ENDZONE_SIZE, 0, FIELD_WIDTH - ENDZONE_SIZE, FIELD_HEIGHT]} stroke="white" strokeWidth={3} opacity={0.6} />
                <Line points={[FIELD_WIDTH / 2, 0, FIELD_WIDTH / 2, FIELD_HEIGHT]} stroke="white" strokeWidth={2} opacity={0.3} dash={[20,10]} />

                {/* Rota (Koşu ve Pas yolları) Çizimi (Ok Butonu içinRevize Edildi) */}
                {currentFrameIdx > 0 && currentFrame.actors.map(actor => {
                    const prevActor = playbook.frames[currentFrameIdx - 1].actors.find(a => a.id === actor.id);
                    if (!prevActor || (prevActor.x === actor.x && prevActor.y === actor.y)) return null;
                    
                    const isDisc = actor.type === 'disc';
                    const pathSetting = currentFrame.pathSettings?.[actor.id];
                    const pathType = pathSetting?.type || (isDisc ? 'pass' : 'sprint');
                    
                    const isSelected = selectedActorId === actor.id;
                    const strokeColor = isDisc ? '#FBBF24' : (isSelected ? '#5B4DBC' : (actor.type === 'defense' ? '#EF4444' : '#FFF'));

                    // Kavis ve Keskin Dönüş (Cut) ayarları
                    let points = [prevActor.x, prevActor.y, actor.x, actor.y];
                    let tension = 0;
                    let cp = pathSetting?.controlPoint;

                    if (pathType === 'curved' || pathType === 'cut') {
                    if (!cp) {
                        cp = { x: (prevActor.x + actor.x) / 2, y: (prevActor.y + actor.y) / 2 - 50 };
                    }
                    points = [prevActor.x, prevActor.y, cp.x, cp.y, actor.x, actor.y];
                    tension = pathType === 'curved' ? 0.4 : 0; 
                    }

                    return (
                    <Group key={`path-group-${actor.id}`}>
                        <Arrow
                        points={points}
                        tension={tension}
                        stroke={strokeColor}
                        fill={strokeColor}
                        strokeWidth={isDisc || isSelected ? 3 : 2}
                        pointerLength={isDisc ? 10 : 8}
                        pointerWidth={isDisc ? 10 : 8}
                        dash={pathType === 'sprint' ? [10, 5] : pathType === 'cut' ? [4, 4] : []}
                        opacity={isSelected ? 1 : (currentFrameIdx > 0 && progress === 0 ? 0.2 : 0.5)} // Oynat tuşuna basınca çizgiler hafifler
                        onClick={() => !isPlaying && setSelectedActorId(actor.id)}
                        onTap={() => !isPlaying && setSelectedActorId(actor.id)}
                        />
                        
                        {/* Kontrol Noktası (Oynarken gizli) */}
                        {(pathType === 'curved' || pathType === 'cut') && cp && isSelected && !isPlaying && (
                        <Circle x={cp.x} y={cp.y} radius={6} fill="#5B4DBC" stroke="#FFF" strokeWidth={2} draggable onDragEnd={(e) => handleControlPointDragEnd(actor.id, e.target.x(), e.target.y())} />
                        )}
                    </Group>
                    );
                })}

                {/* Oyuncular ve Disk Objeleri (Revize Render) */}
                {currentFrame.actors.map((actor) => {
                    // --- ANİMASYON İNTERPOLASYONU ---
                    let renderX = actor.x;
                    let renderY = actor.y;

                    // Sadece oynatılıyorsa ve önceki adımdan fark varsa hesapla
                    if (progress < 1 && currentFrameIdx > 0) {
                        const prevActor = playbook.frames[currentFrameIdx - 1].actors.find(a => a.id === actor.id);
                        if (prevActor && (prevActor.x !== actor.x || prevActor.y !== actor.y)) {
                            const isDisc = actor.type === 'disc';
                            const pathSetting = currentFrame.pathSettings?.[actor.id];
                            const pathType = pathSetting?.type || (isDisc ? 'pass' : 'sprint');
                            const cp = pathSetting?.controlPoint || { x: (prevActor.x + actor.x) / 2, y: (prevActor.y + actor.y) / 2 - 50 };

                            if (pathType === 'curved') {
                                const t = progress; // Quadratic Bezier
                                renderX = Math.pow(1-t, 2) * prevActor.x + 2 * (1-t) * t * cp.x + Math.pow(t, 2) * actor.x;
                                renderY = Math.pow(1-t, 2) * prevActor.y + 2 * (1-t) * t * cp.y + Math.pow(t, 2) * actor.y;
                            } else if (pathType === 'cut') {
                                const t = progress; // 2 Segmentli Lineer (Cut)
                                if (t < 0.5) { const segmentT = t * 2; renderX = prevActor.x + segmentT * (cp.x - prevActor.x); renderY = prevActor.y + segmentT * (cp.y - prevActor.y); } 
                                else { const segmentT = (t - 0.5) * 2; renderX = cp.x + segmentT * (actor.x - cp.x); renderY = cp.y + segmentT * (actor.y - cp.y); }
                            } else { 
                                renderX = prevActor.x + progress * (actor.x - prevActor.x); // Lineer (Sprint/Pas)
                                renderY = prevActor.y + progress * (actor.y - prevActor.y);
                            }
                        }
                    }

                    return (
                    <Group
                    key={actor.id}
                    x={renderX}
                    y={renderY}
                    draggable={!isPlaying}
                    onClick={() => !isPlaying && setSelectedActorId(actor.id)}
                    onTap={() => !isPlaying && setSelectedActorId(actor.id)}
                    onDragEnd={(e) => handleDragEnd(actor.id, e.target.x(), e.target.y())}
                    >
                    {actor.type === 'cone' ? (
                        // Kuka Görünümü
                        <Rect width={22} height={22} fill="#D97706" x={-11} y={-11} cornerRadius={4} stroke="#FFF" strokeWidth={1} shadowColor="black" shadowBlur={3} shadowOpacity={0.2} />
                    ) : (
                        // Oyuncu/Disk Görünümü
                        <Circle radius={actor.type === 'disc' ? 8 : 14} fill={actor.type === 'offense' ? '#2F58CD' : actor.type === 'defense' ? '#EF4444' : '#FFFFFF'} stroke={actor.type === 'disc' ? '#000' : '#FFF'} strokeWidth={2} shadowColor="black" shadowBlur={4} shadowOpacity={0.4} />
                    )}
                    {(actor.type === 'offense' || actor.type === 'defense') && (
                        <Text text={actor.id.substring(0,2)} fontSize={12} fill="white" x={-actor.id.length * 3.5} y={-6} fontStyle="bold" />
                    )}
                    </Group>
                    );
                })}
                </Layer>
            </Stage>
          </div>

          {/* Rota (Path) Düzenleme Paneli (Görseldeki sağ panele benzeyen context menü) */}
          {currentFrameIdx > 0 && selectedActorId && !isPlaying && (
            <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm shadow-indigo-50/50">
                <span className="text-xs font-bold text-indigo-800 flex items-center gap-1.5 bg-indigo-50 p-2 rounded-lg inline-block">
                    <span className="material-icons-outlined text-[17px]">route</span>
                    "{selectedActorId}" Rotası
                </span>
                
                <div className="grid grid-cols-1 gap-2.5">
                    {[
                        { type: 'sprint', label: 'Sprint (Düz)', icon: 'bolt' },
                        { type: 'cut', label: 'Cut (Açılı)', icon: 'linear_scale' },
                        { type: 'curved', label: 'Kavisli Koşu', icon: 'gesture' },
                    ].map(btn => (
                        <button 
                            key={btn.type}
                            onClick={() => changePathType(btn.type as PathType)} 
                            className={`px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${playbook.frames[currentFrameIdx].pathSettings?.[selectedActorId]?.type === btn.type ? 'bg-[#5B4DBC] text-white shadow' : 'bg-gray-50 text-[#5B4DBC] border border-gray-100 hover:bg-gray-100'}`}
                        >
                            <span className="material-icons-outlined text-[18px]">{btn.icon}</span>
                            {btn.label}
                        </button>
                    ))}

                    {/* Disk'e özel pas butonu */}
                    {playbook.frames[currentFrameIdx].actors.find(a => a.id === selectedActorId)?.type === 'disc' && (
                        <button 
                            onClick={() => changePathType('pass')} 
                            className={`px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${playbook.frames[currentFrameIdx].pathSettings?.[selectedActorId]?.type === 'pass' ? 'bg-yellow-500 text-white shadow' : 'bg-yellow-50 text-yellow-700 border border-yellow-100 hover:bg-yellow-100'}`}
                        >
                            <span className="material-icons-outlined text-[18px]">sports_baseball</span>
                            Pas (Disk)
                        </button>
                    )}
                </div>
                
                {(playbook.frames[currentFrameIdx].pathSettings?.[selectedActorId]?.type === 'curved' || playbook.frames[currentFrameIdx].pathSettings?.[selectedActorId]?.type === 'cut') && (
                    <div className="mt-2 p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-500 flex items-center gap-2">
                        <span className="material-icons-outlined text-[18px] text-[#5B4DBC]">info</span>
                        Kavisi/Açıyı ayarlamak için sahadaki mor noktayı sürükleyin.
                    </div>
                )}
            </div>
          )}
        </div>

        {/* 4. ALT BİLGİLENDİRME (Görseldeki gibi temiz) */}
        <div className="w-full max-w-[1200px] mt-6 p-5 bg-white border border-gray-100 rounded-3xl text-sm text-gray-600 flex items-center gap-4 shadow-inner shadow-gray-50/50">
            <div className="w-12 h-12 rounded-full bg-[#5B4DBC]/10 flex items-center justify-center text-[#5B4DBC] flex-shrink-0">
                <span className="material-icons-outlined">psychology</span>
            </div>
            <div>
                <strong className="font-bold text-gray-800">Nasıl Taktik Çizilir?</strong>
                <p className="mt-0.5">Yukarıdaki araçlardan oyuncuları (O1), savunmayı (D1) veya diski sahaya sürükleyin. <strong>'Yeni Adım'</strong> dedikten sonra oyuncuların yerini değiştirin, koşu/pas yolu otomatik çizilecektir. Tıklayıp rota türünü sağ panelden değiştirin.</p>
            </div>
        </div>
      </div>
    </div>
  );
};
export default Gameplay;