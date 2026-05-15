import React, { useEffect, useState } from 'react';
import axios from 'axios';

const InspectionList = () => {
    const [inspections, setInspections] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. AMBIL DATA DARI API
    const fetchInspections = async () => {
        try {
            const response = await axios.get('https://zeni08.pythonanywhere.com/api/inspections/');
            setInspections(response.data);
        } catch (error) {
            console.error("Gagal ambil data:", error);
            alert("Gagal mengambil data inspeksi.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInspections();
    }, []);

    if (loading) return <div className="p-10 text-center text-gray-500 font-medium">⏳ Sedang memuat data sistem...</div>;

    return (
        // Mengubah margin dan padding kontainer luar menjadi dinamis (mt-4 di HP, mt-10 di laptop)
        <div className="container mx-auto mt-4 md:mt-10 p-3 md:p-5 bg-white shadow-lg rounded-xl border border-gray-100">
            <h1 className="text-lg md:text-2xl font-bold mb-4 md:mb-6 text-gray-800 flex items-center gap-2 px-1">
                📋 Daftar Hasil Inspeksi & Lot Number
            </h1>

            {/* 🖥️ TAMPILAN LAPTOP / TABLET (hidden md:block -> Hilang di HP, muncul di layar sedang ke atas) */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="py-3 px-4 text-left">Tanggal & Lot No.</th>
                            <th className="py-3 px-4 text-left">Part & Vendor</th>
                            <th className="py-3 px-4 text-center">Qty OK (Box)</th>
                            <th className="py-3 px-4 text-center">Qty NG</th>
                            <th className="py-3 px-4 text-center">Status Akhir</th>
                            <th className="py-3 px-4 text-left">Riwayat Penanganan (Log)</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700 text-sm">
                        {inspections.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-gray-50 transition">
                                
                                {/* KOLOM 1: LOT NUMBER */}
                                <td className="py-3 px-4">
                                    <div className="font-bold text-gray-500">
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </div>
                                    <span className="inline-block mt-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-mono font-bold border border-blue-200">
                                        {item.lot_number || "Menunggu..."}
                                    </span>
                                </td>

                                {/* KOLOM 2: PART INFO */}
                                <td className="py-3 px-4">
                                    <div className="font-bold text-gray-900">{item.part_name}</div>
                                    <div className="text-xs text-gray-500">{item.vendor_name}</div>
                                </td>

                                {/* KOLOM 3: QTY OK */}
                                <td className="py-3 px-4 text-center">
                                    <span className="font-bold text-lg text-green-700">{item.qty_ok}</span>
                                    <div className="text-xs text-gray-400">
                                        ({Math.floor(item.qty_ok / 60)} Lot/Box)
                                    </div>
                                </td>

                                {/* KOLOM 4: QTY NG */}
                                <td className="py-3 px-4 text-center">
                                    {item.qty_ng > 0 ? (
                                        <span className="font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                                            {item.qty_ng} Pcs
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </td>

                                {/* KOLOM 5: STATUS */}
                                <td className="py-3 px-4 text-center">
                                    {item.final_judgement === 'OK' ? (
                                        <span className="bg-green-500 text-white py-1 px-3 rounded-full text-xs font-bold">
                                            ✅ OK
                                        </span>
                                    ) : (
                                        <span className="bg-red-500 text-white py-1 px-3 rounded-full text-xs font-bold animate-pulse">
                                            ⚠️ NG / PENDING
                                        </span>
                                    )}
                                </td>

                                {/* KOLOM 6: HISTORY LOG */}
                                <td className="py-3 px-4">
                                    {item.logs && item.logs.length > 0 ? (
                                        <ul className="space-y-1">
                                            {item.logs.map((log) => (
                                                <li key={log.id} className="text-xs bg-gray-100 p-1 rounded border border-gray-200">
                                                    <span className={log.action_type === 'REPAIR' ? 'text-green-600 font-bold' : 'text-orange-600 font-bold'}>
                                                        {log.action_type}
                                                    </span>
                                                    : {log.qty} pcs
                                                    <span className="text-gray-400 ml-1">
                                                        ({log.pic})
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">Belum ada history</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 📱 TAMPILAN HP: (block md:hidden -> Muncul di HP, otomatis tersembunyi di layar besar) */}
            <div className="block md:hidden space-y-3">
                {inspections.map((item, idx) => (
                    <div key={item.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50 shadow-sm">
                        
                        {/* Garis Atas: Tanggal & Badge Status Akhir */}
                        <div className="flex justify-between items-center mb-2.5">
                            <span className="text-xs font-bold text-gray-400">
                                📅 {new Date(item.created_at).toLocaleDateString()}
                            </span>
                            <div>
                                {item.final_judgement === 'OK' ? (
                                    <span className="bg-green-500 text-white py-0.5 px-2.5 rounded-full text-[11px] font-bold">
                                        ✅ OK
                                    </span>
                                ) : (
                                    <span className="bg-red-500 text-white py-0.5 px-2.5 rounded-full text-[11px] font-bold">
                                        ⚠️ NG / PENDING
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Kotak Tengah: Informasi Utama Komponen */}
                        <div className="bg-white p-3 rounded-lg border border-gray-100 mb-3">
                            <div className="font-bold text-gray-900 text-sm">{item.part_name}</div>
                            <div className="text-xs text-gray-500 mb-2">{item.vendor_name}</div>
                            <div className="text-xs pt-1.5 border-t border-gray-100">
                                <span className="text-gray-400">Lot No: </span>
                                <span className="bg-blue-50 text-blue-700 font-mono font-bold px-2 py-0.5 rounded border border-blue-100 text-[11px]">
                                    {item.lot_number || "Menunggu..."}
                                </span>
                            </div>
                        </div>

                        {/* Komponen Split Grid: Menampilkan Angka OK vs NG */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="p-2 bg-green-50 rounded-lg border border-green-100 text-center">
                                <div className="text-[11px] font-semibold text-green-700 mb-0.5">Qty OK</div>
                                <div className="font-extrabold text-base text-green-800">{item.qty_ok} <span className="text-[10px] font-normal text-green-600">Pcs</span></div>
                                <div className="text-[10px] text-green-600 font-mono">({Math.floor(item.qty_ok / 60)} Box)</div>
                            </div>
                            
                            <div className="p-2 bg-red-50 rounded-lg border border-red-100 text-center flex flex-col justify-center items-center">
                                <div className="text-[11px] font-semibold text-red-700 mb-0.5">Qty NG</div>
                                {item.qty_ng > 0 ? (
                                    <div className="font-extrabold text-base text-red-800">{item.qty_ng} <span className="text-[10px] font-normal text-red-600">Pcs</span></div>
                                ) : (
                                    <div className="font-bold text-gray-400 text-sm mt-0.5">-</div>
                                )}
                            </div>
                        </div>

                        {/* Baris Bawah: Jejak Riwayat Penanganan (Log System) */}
                        <div className="border-t border-gray-200 pt-2.5">
                            <div className="text-[11px] font-bold text-gray-500 mb-1.5">🛠️ Riwayat Log Tindakan:</div>
                            {item.logs && item.logs.length > 0 ? (
                                <div className="space-y-1">
                                    {item.logs.map((log) => (
                                        <div key={log.id} className="text-xs bg-white p-2 rounded border border-gray-100 flex justify-between items-center shadow-2xs">
                                            <div>
                                                <span className={`font-bold ${log.action_type === 'REPAIR' ? 'text-green-600' : 'text-orange-600'}`}>
                                                    {log.action_type}
                                                </span>
                                                <span className="text-gray-600 font-medium"> : {log.qty} pcs</span>
                                            </div>
                                            <span className="text-gray-400 text-[10px] bg-gray-50 px-1.5 py-0.5 rounded">
                                                👤 {log.pic}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-gray-400 italic bg-white p-2 rounded border border-gray-50 text-center">
                                    Belum ada history log penanganan
                                </div>
                            )}
                        </div>

                    </div>
                ))}
            </div>

            {/* Kondisi Jika Array Kosong */}
            {inspections.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm italic">
                    Belum ada data inspeksi. Silakan input data baru melalui menu Schedule.
                </div>
            )}
        </div>
    );
};

export default InspectionList;