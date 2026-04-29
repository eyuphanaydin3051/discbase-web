import React, { useState } from 'react';
import { Stage, Layer, Rect, Circle, Line, Group, Text } from 'react-konva';
import type { Playbook } from '../types';

const FIELD_WIDTH = 800;
const FIELD_HEIGHT = 350;
const ENDZONE_SIZE = 120;

const Gameplay: React.FC = () => {
    const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
    const [playbook, setPlaybook] = useState<Playbook>({
        id: '1',
        title: 'Yeni Hücum Taktiği',
        frames: [
            {
                actors: [
                    { id: '1', type: 'offense', x: 250, y: 150 },
                    { id: '2', type: 'offense', x: 250, y: 200 },
                    { id: '3', type: 'offense', x: 350, y: 100 },
                    { id: 'D1', type: 'defense', x: 280, y: 150 },
                    { id: 'D2', type: 'defense', x: 280, y: 200 },
                    { id: 'Disk', type: 'disc', x: 265, y: 150 },
                ],
                pathSettings: {}
            }
        ],
        createdAt: Date.now(),
    });

    const currentFrame = playbook.frames[currentFrameIdx];

    const addFrame = () => {
        const lastFrame = playbook.frames[playbook.frames.length - 1];
        // Bir önceki adımı (snapshot) kopyala
        const newFrame = JSON.parse(JSON.stringify(lastFrame));
        setPlaybook({ ...playbook, frames: [...playbook.frames, newFrame] });
        setCurrentFrameIdx(playbook.frames.length);
    };

    const handleDragEnd = (id: string, x: number, y: number) => {
        const updatedFrames = [...playbook.frames];
        const actorIdx = updatedFrames[currentFrameIdx].actors.findIndex(a => a.id === id);
        updatedFrames[currentFrameIdx].actors[actorIdx] = {
            ...updatedFrames[currentFrameIdx].actors[actorIdx], x, y
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

                {/* Saha Alanı */}
                <div className="flex justify-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                    <Stage width={FIELD_WIDTH} height={FIELD_HEIGHT} className="rounded-lg overflow-hidden shadow-inner cursor-crosshair border-2 border-gray-300">
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
                                // Eğer oyuncu/disk önceki adımdan farklı bir yerdeyse arasına çizgi çek
                                if (!prevActor || (prevActor.x === actor.x && prevActor.y === actor.y)) return null;

                                const isDisc = actor.type === 'disc';
                                return (
                                    <Line
                                        key={`path-${actor.id}`}
                                        points={[prevActor.x, prevActor.y, actor.x, actor.y]}
                                        stroke={isDisc ? '#FBBF24' : '#E5E7EB'} // Disk pası sarı, koşu yolu beyazımsı
                                        strokeWidth={isDisc ? 3 : 2}
                                        dash={isDisc ? [] : [10, 5]} // Disk düz, koşu kesik çizgi
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