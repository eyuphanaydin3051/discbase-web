// src/pages/Dashboard.tsx
import React from 'react';

export default function Dashboard() {
    return (
        <div className="min-h-screen bg-stitch-bg-light p-8">
            <h1 className="text-3xl font-bold text-stitch-primary mb-6">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Örnek İstatistik Kartı */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm">Toplam Maç</div>
                    <div className="text-4xl font-bold text-gray-800 mt-2">12</div>
                </div>

                {/* Örnek Durum Kartı */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-stitch-offense">
                    <div className="text-gray-500 text-sm">Kazanma Oranı</div>
                    <div className="text-4xl font-bold text-stitch-offense mt-2">%75</div>
                </div>
            </div>
        </div>
    );
}