import React, { useEffect, useState } from 'react';
import axios from 'axios';

const InspectionList = () => {
    const [inspections, setInspections] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. AMBIL DATA DARI API
    const fetchInspections = async () => {
        try {
            const response = await axios.get('http://localhost:8000/api/inspections/');
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

    if (loading) return <div className="p-10 text-center">⏳ Sedang memuat data...</div>;

    return (
        <div className="container mx-auto mt-10 p-5 bg-white shadow-lg rounded-xl">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                📋 Daftar Hasil Inspeksi & Lot Number
            </h1>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
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
                                
                                {/* KOLOM 1: LOT NUMBER (Highlight Biru) */}
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

                                {/* KOLOM 3: QTY OK (Konversi ke Box) */}
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

                                {/* KOLOM 6: HISTORY LOG (Fitur Lama yg Kita Selamatkan) */}
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

                        {inspections.length === 0 && (
                            <tr>
                                <td colSpan="6" className="text-center py-10 text-gray-500">
                                    Belum ada data inspeksi. Silakan input data baru.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InspectionList;