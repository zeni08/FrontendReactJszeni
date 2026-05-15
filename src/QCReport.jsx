import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, Table, Badge, Button, Row, Col, Form, Modal, Alert, Image } from 'react-bootstrap';
// URL Logo Suzuki untuk PDF
const suzukiLogo = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Suzuki_logo_2.svg/2560px-Suzuki_logo_2.svg.png";

const QCReport = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userRole = localStorage.getItem('role');
    const role = userRole ? userRole.toLowerCase() : '';
    const [inspections, setInspections] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [filterDate, setFilterDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [showDetail, setShowDetail] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [repairInfo, setRepairInfo] = useState(null); 

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (location.state && location.state.filterStatus) {
            setFilterStatus(location.state.filterStatus);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    useEffect(() => {
        let result = inspections;
        if (filterDate) result = result.filter(item => item.schedule_date === filterDate);
        if (filterStatus !== 'ALL') result = result.filter(item => item.final_judgement === filterStatus);
        setFilteredData(result);
    }, [filterDate, filterStatus, inspections]);

    const fetchData = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/inspections/');
            const sorted = res.data.sort((a, b) => b.id - a.id);
            setInspections(sorted);
            setFilteredData(sorted);
        } catch (error) { console.error("Gagal ambil data report:", error); }
    };

    // --- FUNGSI EXPORT EXCEL ---
    const exportToExcel = () => {
    const dataForExcel = filteredData.map(item => {
        // Gabungkan Keterangan awal dan Catatan dari Logs
        let teksKeterangan = item.description || "";
        
        if (item.logs && item.logs.length > 0) {
            const catatanLogs = item.logs.map(log => `[${log.action_type}] ${log.note || ''}`).join(', ');
            teksKeterangan = teksKeterangan ? `${teksKeterangan} | ${catatanLogs}` : catatanLogs;
        }

        return {
            Tanggal: item.schedule_date,
            Jam: item.inspection_time || '-',
            Part: item.part_name,
            Vendor: item.vendor_name,
            Shift: item.shift,
            Inspector: item.inspector_name,
            OK: item.qty_ok,
            NG: item.qty_ng,
            Status: item.final_judgement,
            Keterangan: teksKeterangan
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "QC Report");
    XLSX.writeFile(workbook, "Laporan_QC_Suzuki.xlsx");
};

    // --- FUNGSI EXPORT PDF (UPDATE: DENGAN LOGO) ---
    const exportToPDF = () => {
    try {
        const doc = new jsPDF();
        
        // Ambil nama user dari localStorage
        const currentUsername = localStorage.getItem('username') || 'Zeni';

        // 1. HEADER LOGO (Panggil dari folder public)
        doc.addImage("/logo.png", "PNG", 14, 10, 35, 10);

        // 2. HEADER TEKS & INFORMASI LAPORAN
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("LAPORAN QC INCOMING - PT SUZUKI INDOMOBIL MOTOR", 14, 25);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        // Informasi waktu cetak
        doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 31);
        // TAMBAHAN: Informasi Total Data agar lebih padat
        doc.text(`Total Data: ${filteredData.length} baris `, 14, 36);

        // 3. TABEL DATA
        autoTable(doc, {
            head: [["No", "Tgl", "Part Name", "Vendor", "OK", "NG", "Status"]],
            body: filteredData.map((item, index) => [
                index + 1,
                item.schedule_date, 
                item.part_name, 
                item.vendor_name, 
                item.qty_ok, 
                item.qty_ng, 
                item.final_judgement
            ]),
            startY: 40, // Jarak mulai tabel diturunkan sedikit (tadi 38) biar tidak nempel tulisan Total Data
            theme: 'grid',
            headStyles: { fillColor: [0, 91, 172] }, // Biru Suzuki
            styles: { fontSize: 8 }
        });

        // 4. TANDA TANGAN DINAMIS (Username Login)
        const finalY = doc.lastAutoTable.finalY + 15;
        if (finalY > 250) doc.addPage(); 

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Dibuat Oleh:", 150, finalY);
        
        doc.setFont("helvetica", "bold");
        doc.text(currentUsername, 150, finalY + 15); 
        doc.line(150, finalY + 16, 185, finalY + 16);

        doc.save(`Laporan_QC_${currentUsername}_${new Date().getTime()}.pdf`);

    } catch (error) {
        console.error("Gagal export PDF:", error);
        alert("⛔ Gagal membuat PDF. Cek data tabel atau status login.");
    }
};
    // --- LOGIKA PARSING DATA REPAIR ---
    const handleRowClick = (item) => {
        setSelectedItem(item);
        if (item.description && item.description.includes("[REPAIRED")) {
            const parts = item.description.split("[REPAIRED");
            if (parts.length > 1) {
                const rawInfo = parts[1].replace("]", ""); 
                const details = rawInfo.split("|"); 
                const infoObj = {
                    qty: details[1]?.replace("Qty:", "").trim(),
                    pic: details[2]?.replace("By:", "").trim(),
                    time: details[3]?.replace("At:", "").trim(),
                    note: details[4]?.replace("Note:", "").trim()
                };
                setRepairInfo(infoObj);
            }
        } else {
            setRepairInfo(null);
        }
        setShowDetail(true);
    };

    const handleLogout = () => { localStorage.clear(); navigate('/'); };

    // --- FIX LOGIKA FOTO TIDAK MUNCUL ---
    const getFullImageUrl = (item) => {
        // Ambil path foto dari database (mendukung field repair_photo atau visual_evidence)
        const path = item?.repair_photo || item?.pic || item?.photo; 
        if (!path) return null;
        
        // URL Backend Django
        const baseUrl = "http://127.0.0.1:8000";
        
        // Proteksi jika path sudah mengandung http
        if (path.startsWith('http')) return `${path}?t=${new Date().getTime()}`;
        
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        // Tambahkan timestamp (?t=...) agar gambar tidak tersangkut di cache browser
        return `${baseUrl}${cleanPath}?t=${new Date().getTime()}`;
    };

    return (
        <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f4f6f9' }}>
            
            {/* SIDEBAR */}
            <div className="bg-white border-end" style={{ width: '250px', minHeight: '100vh', position: 'fixed', zIndex: 1000 }}>
                <div className="p-4 text-center border-bottom"><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '120px' }} /></div>
                <div className="p-3">
                    {role !== 'foreman' && (
                        <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/dashboard')}>📊 Dashboard</Button>
                    )}
                    {(role === 'manager' || role === 'admin') && (
                        <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/vendors')}>🏢 Vendor Data</Button>
                    )}
                    {(role === 'manager' || role === 'admin') && (
                        <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/parts')}>⚙️ Part Data</Button>
                    )}
                    {(role === 'manager' || role === 'admin' || role === 'hintan') && (
                        <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/schedule')}>📅 Receiving Schedule</Button>
                    )}
                    {(role === 'manager' || role === 'hintan') && (
                        <Button variant="primary" className="w-100 text-start mb-2 fw-bold">📑 QC Report</Button>
                    )}
                    {(role === 'manager' || role === 'hintan') && (
                        <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/ng-handling')}>🔧 Pengelolaan NG</Button>
                    )}
                    {(role === 'manager' || role === 'foreman') && (
                        <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/production')}>🏭 Production Request</Button>
                    )}
                    {role === 'manager' && (<Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/recycle-bin'); setShowMobileMenu(false);}}>♻️ Recycle Bin</Button>)}
                    <Button variant="danger" className="w-100 mt-4" onClick={handleLogout}>🚪 Logout</Button>
                </div>
            </div>

            {/* KONTEN UTAMA */}
            <div className="flex-grow-1 p-4" style={{ marginLeft: '250px' }}> 
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h3 className="fw-bold text-dark">Laporan Hasil QC</h3>
                        <p className="text-muted mb-0">Klik pada baris tabel untuk melihat detail lengkap</p>
                    </div>
                    <div>
                        <Button variant="success" className="me-2" onClick={exportToExcel}>📊 Export Excel</Button>
                        <Button variant="danger" onClick={exportToPDF}>📄 Export PDF</Button>
                    </div>
                </div>

                <Card className="border-0 shadow-sm p-3 mb-4">
                    <Row>
                        <Col md={4}>
                            <Form.Group><Form.Label>Filter Tanggal</Form.Label><Form.Control type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} /></Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Status QC</Form.Label>
                                <Form.Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                    <option value="ALL">Semua Data</option><option value="OK">OK (Lolos)</option><option value="NG">NG (Reject)</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4} className="d-flex align-items-end">
                            <Button variant="secondary" className="w-100" onClick={() => { setFilterDate(''); setFilterStatus('ALL'); }}>Reset Filter</Button>
                        </Col>
                    </Row>
                </Card>

                <Card className="border-0 shadow-sm p-0 overflow-hidden">
                    <Table hover responsive striped className="m-0 align-middle">
                        <thead className="bg-primary text-white">
                            <tr>
                                <th className="py-3">No</th>
                                <th className="py-3">Waktu QC</th>
                                <th className="py-3">Part Info</th>
                                <th className="py-3 text-center">Visual Evidence</th>
                                <th className="py-3">Inspector Info</th>
                                <th className="py-3 text-center">Hasil Check</th>
                                <th className="py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length > 0 ? filteredData.map((item, index) => (
                                <tr key={item.id} onClick={() => handleRowClick(item)} style={{ cursor: 'pointer' }}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <div className="fw-bold">{item.schedule_date}</div>
                                        <small className="text-muted">{item.inspection_time ? item.inspection_time.substring(0, 5) : '-'}</small>
                                    </td>
                                    <td>
                                        <div className="fw-bold text-primary">{item.part_name}</div>
                                        <div className="small text-muted">{item.part_number}</div>
                                        <Badge bg="light" text="dark" className="border mt-1 me-1">{item.vendor_name}</Badge>
                                    </td>
                                    <td className="text-center">
                                        {/* FIX: FOTO DI TABEL SEKARANG MUNCUL */}
                                        {getFullImageUrl(item) ? (
                                            <Image 
                                                src={getFullImageUrl(item)} 
                                                rounded 
                                                style={{ width: '80px', height: '50px', objectFit: 'cover', border: '1px solid #ddd' }} 
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <small className="text-muted fst-italic">No Photo</small>
                                        )}
                                    </td>
                                    <td>
                                        <div>👨‍🔧 {item.inspector_name}</div>
                                        <div className="small text-muted">Shift: {item.shift || '-'}</div>
                                    </td>
                                    <td className="text-center">
                                        <div className="d-flex justify-content-center gap-2">
                                            <div className="border rounded px-2 py-1 bg-success bg-opacity-10"><small className="d-block text-success fw-bold">OK</small><strong>{item.qty_ok}</strong></div>
                                            <div className="border rounded px-2 py-1 bg-danger bg-opacity-10"><small className="d-block text-danger fw-bold">NG</small><strong>{item.qty_ng}</strong></div>
                                        </div>
                                    </td>
                                    <td>
                                        {item.final_judgement === 'OK' ? (
                                            <Badge bg="success" className="fs-6">PASSED</Badge>
                                        ) : (
                                            <Badge bg="danger" className="fs-6">REJECT</Badge>
                                        )}

                                        {( 
                                            (item.description && item.description.toUpperCase().includes("REPAIR")) || 
                                            (item.logs && item.logs.some(log => log.action_type === 'REPAIR')) 
                                        ) && (
                                            <div className="mt-1">
                                                <Badge bg="warning" text="dark" className="fw-bold shadow-sm">🛠️ REPAIRED</Badge>
                                            </div>
                                        )}

                                        {( 
                                            (item.description && item.description.toUpperCase().includes("RETURN")) || 
                                            (item.logs && item.logs.some(log => log.action_type === 'RETURN')) 
                                        ) && (
                                            <div className="mt-1">
                                                <Badge bg="warning" text="dark" className="fw-bold shadow-sm">🚚 RETURNED</Badge>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )) : <tr><td colSpan="7" className="text-center py-5 text-muted">Tidak ada data laporan.</td></tr>}
                        </tbody>
                    </Table>
                </Card>
            </div>

            <Modal show={showDetail} onHide={() => setShowDetail(false)} centered size="xl">
                <Modal.Header closeButton className={selectedItem?.final_judgement === 'NG' ? 'bg-danger text-white' : 'bg-success text-white'}>
                    <Modal.Title>{selectedItem?.final_judgement === 'OK' ? '✅ Detail: PASSED' : '⛔ Detail: REJECT'}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
    {selectedItem && (
        <div>
            {/* BAGIAN ATAS: INFO UTAMA & FOTO */}
            <Row className="mb-4">
                <Col md={5}>
                    <h4 className="fw-bold mb-3">{selectedItem.part_name}</h4>
                    <Table striped bordered size="sm" className="shadow-sm small">
                        <tbody>
                            <tr><td className="text-muted p-2">Vendor</td><td className="fw-bold p-2">{selectedItem.vendor_name}</td></tr>
                            <tr><td className="text-muted p-2">Lot Number</td><td className="p-2">{selectedItem.lot_number || '-'}</td></tr>
                            <tr><td className="text-muted p-2">Inspector</td><td className="p-2">👨‍🔧 {selectedItem.inspector_name}</td></tr>
                            <tr>
                                <td className="text-muted p-2">Hasil Akhir</td>
                                <td className="p-2">
                                    <Badge bg="success" className="me-2">OK: {selectedItem.qty_ok}</Badge> 
                                    <Badge bg="danger">NG: {selectedItem.qty_ng}</Badge>
                                </td>
                            </tr>
                        </tbody>
                    </Table>
                </Col>

                <Col md={7} className="text-center border-start ps-4">
                    <div className="p-2 bg-light border rounded shadow-sm">
                        <h6 className="fw-bold text-primary mb-2 small">📸 DOKUMENTASI VISUAL TERBARU</h6>
                        {/* FIX: FOTO DI MODAL SEKARANG MUNCUL */}
                        {getFullImageUrl(selectedItem) ? (
                            <Image 
                                src={getFullImageUrl(selectedItem)} 
                                fluid 
                                rounded 
                                style={{ maxHeight: '250px', objectFit: 'contain' }}
                                onError={(e) => { e.target.src = "https://placehold.co/600x400?text=Foto+Gagal+Muat"; }} 
                            />
                        ) : (
                            <div className="py-5 text-muted small">Belum ada lampiran foto.</div>
                        )}
                    </div>
                </Col>
            </Row>

            <div className="mt-4">
                <h6 className="fw-bold text-muted small mb-2">DETAIL RIWAYAT AKTIVITAS:</h6>
                <Table bordered hover responsive size="sm" className="small shadow-sm">
                    <thead className="table-dark text-center">
                        <tr>
                            <th>Waktu</th>
                            <th>Tindakan</th>
                            <th>Qty</th>
                            <th>PIC</th>
                            <th>Catatan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedItem.logs?.length > 0 ? selectedItem.logs.map((log) => (
                            <tr key={log.id} className="text-center">
                                <td>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                                <td><Badge bg={log.action_type === 'REPAIR' ? 'success' : 'danger'}>{log.action_type}</Badge></td>
                                <td className="fw-bold">{log.qty}</td>
                                <td>👨‍🔧 {log.pic}</td>
                                <td className="fst-italic text-start">"{log.note || '-'}"</td>
                            </tr>
                        )) : (
                            <tr className="text-center">
                                <td>{selectedItem.schedule_date} {selectedItem.inspection_time}</td>
                                <td><Badge bg="info">INSPECTION</Badge></td>
                                <td className="fw-bold">{selectedItem.qty_ng + selectedItem.qty_ok}</td>
                                <td>👨‍🔧 {selectedItem.inspector_name}</td>
                                <td className="text-start">Inspeksi awal kedatangan part.</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>
        </div>
    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" className="px-4" onClick={() => setShowDetail(false)}>Tutup Detail</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default QCReport;