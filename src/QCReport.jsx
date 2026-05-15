import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { Card, Table, Badge, Button, Row, Col, Form, Modal, Alert, Image, Navbar, Offcanvas } from 'react-bootstrap';

const QCReport = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userRole = localStorage.getItem('role');
    const role = userRole ? userRole.toLowerCase() : '';

    // STATE UI RESPONSIVE
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // STATE DATA UTAMA
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
            const res = await axios.get('https://zeni08.pythonanywhere.com/api/inspections/');
            const sorted = res.data.sort((a, b) => b.id - a.id);
            setInspections(sorted);
            setFilteredData(sorted);
        } catch (error) { console.error("Gagal ambil data report:", error); }
    };

    // --- FUNGSI EXPORT EXCEL ---
    const exportToExcel = () => {
        const dataForExcel = filteredData.map(item => {
            let teksKeterangan = item.description || "";
            if (item.logs && item.logs.length > 0) {
                const catatanLogs = item.logs.map(log => `[${log.action_type}] ${log.note || ''}`).join(', ');
                teksKeterangan = teksKeterangan ? `${teksKeterangan} | ${catamanLogs}` : catatanLogs;
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

    // --- FUNGSI EXPORT PDF ---
    const exportToPDF = () => {
        try {
            const doc = new jsPDF();
            const currentUsername = localStorage.getItem('username') || 'Zeni';

            doc.addImage("/logo.png", "PNG", 14, 10, 35, 10);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.text("LAPORAN QC INCOMING - PT SUZUKI INDOMOBIL MOTOR", 14, 25);
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 31);
            doc.text(`Total Data: ${filteredData.length} baris `, 14, 36);

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
                startY: 40,
                theme: 'grid',
                headStyles: { fillColor: [0, 91, 172] },
                styles: { fontSize: 8 }
            });

            const finalY = doc.lastAutoTable.finalY + 15;
            if (finalY > 250) doc.addPage(); 

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Dibuat Oleh:", 150, finalY);
            
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

    const getFullImageUrl = (item) => {
        const path = item?.repair_photo || item?.pic || item?.photo; 
        if (!path) return null;
        const baseUrl = "https://zeni08.pythonanywhere.com";
        if (path.startsWith('http')) return `${path}?t=${new Date().getTime()}`;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}?t=${new Date().getTime()}`;
    };

    // KOMPONEN SIDEBAR DINAMIS
    const SidebarContent = () => (
        <div className="p-3">
            {role !== 'foreman' && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/dashboard'); setShowMobileMenu(false); }}>📊 Dashboard</Button>
            )}
            {(role === 'manager' || role === 'admin') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/vendors'); setShowMobileMenu(false); }}>🏢 Vendor Data</Button>
            )}
            {(role === 'manager' || role === 'admin') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/parts'); setShowMobileMenu(false); }}>⚙️ Part Data</Button>
            )}
            {(role === 'manager' || role === 'admin' || role === 'hintan') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/schedule'); setShowMobileMenu(false); }}>📅 Receiving Schedule</Button>
            )}
            {(role === 'manager' || role === 'hintan') && (
                <Button variant="primary" className="w-100 text-start mb-2 fw-bold">📑 QC Report</Button>
            )}
            {(role === 'manager' || role === 'hintan') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/ng-handling'); setShowMobileMenu(false); }}>🔧 Pengelolaan NG</Button>
            )}
            {(role === 'manager' || role === 'foreman') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/production'); setShowMobileMenu(false); }}>🏭 Production Request</Button>
            )}
            {role === 'manager' && (<Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/recycle-bin'); setShowMobileMenu(false); }}>♻️ Recycle Bin</Button>)}
            <Button variant="danger" className="w-100 mt-4" onClick={handleLogout}>🚪 Logout</Button>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f9' }}>
            <style>{`
                @media (max-width: 768px) { 
                    .desktop-sidebar { display: none !important; } 
                    .mobile-header { display: block !important; } 
                    .main-content { margin-left: 0 !important; margin-top: 60px; } 
                } 
                @media (min-width: 769px) { 
                    .desktop-sidebar { display: block !important; } 
                    .mobile-header { display: none !important; } 
                    .main-content { margin-left: 250px !important; margin-top: 0; } 
                }
            `}</style>
            
            {/* SIDEBAR VIEW DESKTOP */}
            <div className="desktop-sidebar bg-white border-end" style={{ width: '250px', minHeight: '100vh', position: 'fixed', zIndex: 1000 }}>
                <div className="p-4 text-center border-bottom"><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '120px' }} /></div>
                <SidebarContent />
            </div>

            {/* NAVBAR HEADER MOBILE */}
            <Navbar bg="white" expand={false} fixed="top" className="mobile-header border-bottom shadow-sm px-3" style={{ display: 'none' }}>
                <Button variant="outline-dark" size="sm" onClick={() => setShowMobileMenu(true)}>☰ Menu</Button>
                <Navbar.Brand className="ms-2 fw-bold text-primary fs-6">Laporan QC</Navbar.Brand>
            </Navbar>

            {/* OFF-CANVAS DRAWER MOBILE MENU */}
            <Offcanvas show={showMobileMenu} onHide={() => setShowMobileMenu(false)} style={{ width: '280px' }}>
                <Offcanvas.Header closeButton><Offcanvas.Title><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '100px' }} /></Offcanvas.Title></Offcanvas.Header>
                <Offcanvas.Body className="p-0"><SidebarContent /></Offcanvas.Body>
            </Offcanvas>

            {/* MAIN CONTENT VIEW */}
            <div className="main-content p-3 p-md-4"> 
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 mb-md-4 gap-3">
                    <div>
                        <h3 className="fw-bold text-dark mb-0 fs-4 fs-md-3">Laporan Hasil QC</h3>
                        <p className="text-muted mb-0 small">Klik pada baris tabel atau card untuk melihat detail lengkap</p>
                    </div>
                    <div className="d-flex gap-2">
                        <Button variant="success" size="sm" className="fw-bold px-3" onClick={exportToExcel}>📊 Excel</Button>
                        <Button variant="danger" size="sm" className="fw-bold px-3" onClick={exportToPDF}>📄 PDF</Button>
                    </div>
                </div>

                {/* FILTER CARD RESPONSIF CONTROLS */}
                <Card className="border-0 shadow-sm p-3 mb-3 mb-md-4">
                    <Row className="g-2">
                        <Col xs={12} sm={6} md={4}>
                            <Form.Group><Form.Label className="small fw-bold">Filter Tanggal</Form.Label><Form.Control size="sm" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} /></Form.Group>
                        </Col>
                        <Col xs={12} sm={6} md={4}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Status QC</Form.Label>
                                <Form.Select size="sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                    <option value="ALL">Semua Data</option><option value="OK">OK (Lolos)</option><option value="NG">NG (Reject)</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col xs={12} md={4} className="d-flex align-items-end">
                            <Button size="sm" variant="secondary" className="w-100 mt-2 mt-md-0" onClick={() => { setFilterDate(''); setFilterStatus('ALL'); }}>Reset Filter</Button>
                        </Col>
                    </Row>
                </Card>

                {/* CONTAINER REPORT AREA */}
                <Card className="border-0 shadow-sm p-0 overflow-hidden">
                    
                    {/* 🖥️ VIEW LAPTOP: Berwujud Tabel Panjang Horizontal Bawaan */}
                    <div className="table-responsive d-none d-md-block">
                        <Table hover striped className="m-0 align-middle">
                            <thead className="bg-primary text-white text-nowrap">
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
                            <tbody className="small">
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

                                            {((item.description && item.description.toUpperCase().includes("REPAIR")) || 
                                              (item.logs && item.logs.some(log => log.action_type === 'REPAIR'))) && (
                                                <div className="mt-1">
                                                    <Badge bg="warning" text="dark" className="fw-bold shadow-sm">🛠️ REPAIRED</Badge>
                                                </div>
                                            )}

                                            {((item.description && item.description.toUpperCase().includes("RETURN")) || 
                                              (item.logs && item.logs.some(log => log.action_type === 'RETURN'))) && (
                                                <div className="mt-1">
                                                    <Badge bg="warning" text="dark" className="fw-bold shadow-sm">🚚 RETURNED</Badge>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="7" className="text-center py-5 text-muted">Tidak ada data laporan.</td></tr>}
                            </tbody>
                        </Table>
                    </div>

                    {/* 📱 VIEW HP: Berubah Menjadi Desain List Card Laporan Ringkas */}
                    <div className="d-block d-md-none">
                        {filteredData.length === 0 ? (
                            <div className="p-4 text-center text-muted small">Tidak ada data laporan.</div>
                        ) : (
                            filteredData.map((item, index) => (
                                <div key={item.id} onClick={() => handleRowClick(item)} className="p-3 border-bottom bg-white" style={{ cursor: 'pointer' }}>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div>
                                            <span className="text-muted small fw-bold">#{index + 1}</span>
                                            <span className="text-muted small ms-2">📅 {item.schedule_date} (🕒 {item.inspection_time?.substring(0,5)})</span>
                                        </div>
                                        {item.final_judgement === 'OK' ? (
                                            <Badge bg="success" pill>PASSED</Badge>
                                        ) : (
                                            <Badge bg="danger" pill>REJECT</Badge>
                                        )}
                                    </div>

                                    <div className="d-flex gap-2 align-items-start bg-light p-2 rounded mb-2">
                                        {getFullImageUrl(item) && (
                                            <Image 
                                                src={getFullImageUrl(item)} 
                                                rounded 
                                                style={{ width: '65px', height: '50px', objectFit: 'cover', border: '1px solid #ccc' }}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        )}
                                        <div className="overflow-hidden">
                                            <h6 className="fw-bold text-primary mb-0 text-truncate small">{item.part_name}</h6>
                                            <div className="text-muted" style={{ fontSize: '11px' }}>PN: {item.part_number}</div>
                                            <div className="text-dark font-medium" style={{ fontSize: '11px' }}>🏭 {item.vendor_name}</div>
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center mt-1">
                                        <div className="small text-muted">
                                            Inspector: <strong>{item.inspector_name} (S-{item.shift})</strong>
                                        </div>
                                        <div className="d-flex gap-1.5 align-items-center">
                                            <Badge bg="success" className="fw-normal">OK: {item.qty_ok}</Badge>
                                            <Badge bg="danger" className="fw-normal">NG: {item.qty_ng}</Badge>
                                            
                                            {(((item.description && item.description.toUpperCase().includes("REPAIR")) || (item.logs && item.logs.some(log => log.action_type === 'REPAIR')))) && (
                                                <Badge bg="warning" text="dark">🛠️</Badge>
                                            )}
                                            {(((item.description && item.description.toUpperCase().includes("RETURN")) || (item.logs && item.logs.some(log => log.action_type === 'RETURN')))) && (
                                                <Badge bg="warning" text="dark">🚚</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* MODAL DETAIL: RESPONSIVE CONTROL GRID ATAS-BAWAH DI MOBILE */}
            <Modal show={showDetail} onHide={() => setShowDetail(false)} centered size="xl">
                <Modal.Header closeButton className={selectedItem?.final_judgement === 'NG' ? 'bg-danger text-white py-2' : 'bg-success text-white py-2'}>
                    <Modal.Title className="fs-6 fw-bold">{selectedItem?.final_judgement === 'OK' ? '✅ Detail Hasil: PASSED' : '⛔ Detail Hasil: REJECT'}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-3 p-md-4">
                    {selectedItem && (
                        <div>
                            {/* Mengatur g-3 agar tabel & dokumentasi menumpuk rapi secara vertikal di HP (xs={12}) */}
                            <Row className="g-3 mb-4">
                                <Col xs={12} lg={5}>
                                    <h5 className="fw-bold mb-2 text-wrap fs-5">{selectedItem.part_name}</h5>
                                    <Table striped bordered size="sm" className="shadow-sm small m-0">
                                        <tbody>
                                            <tr><td className="text-muted p-2" style={{ width: '35%' }}>Vendor Name</td><td className="fw-bold p-2">{selectedItem.vendor_name}</td></tr>
                                            <tr><td className="text-muted p-2">Lot Number</td><td className="p-2 font-mono">{selectedItem.lot_number || '-'}</td></tr>
                                            <tr><td className="text-muted p-2">Inspector PIC</td><td className="p-2">👨‍🔧 {selectedItem.inspector_name} (Shift {selectedItem.shift})</td></tr>
                                            <tr>
                                                <td className="text-muted p-2">Skor Kuantitas</td>
                                                <td className="p-2">
                                                    <Badge bg="success" className="me-2">OK: {selectedItem.qty_ok} Pcs</Badge> 
                                                    <Badge bg="danger">NG: {selectedItem.qty_ng} Pcs</Badge>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </Table>
                                </Col>

                                <Col xs={12} lg={7} className="text-center border-start-md ps-md-4">
                                    <div className="p-2 bg-light border rounded shadow-sm">
                                        <h6 className="fw-bold text-primary mb-2" style={{ fontSize: '11px' }}>📸 DOKUMENTASI VISUAL TERBARU</h6>
                                        {getFullImageUrl(selectedItem) ? (
                                            <Image 
                                                src={getFullImageUrl(selectedItem)} 
                                                fluid 
                                                rounded 
                                                style={{ maxHeight: '240px', objectFit: 'contain' }}
                                                onError={(e) => { e.target.src = "https://placehold.co/600x400?text=Foto+Gagal+Muat"; }} 
                                            />
                                        ) : (
                                            <div className="py-5 text-muted small italic">Belum ada lampiran lampiran bukti visual.</div>
                                        )}
                                    </div>
                                </Col>
                            </Row>

                            <div className="mt-2">
                                <h6 className="fw-bold text-muted small mb-2">DETAIL RIWAYAT AKTIVITAS TIM:</h6>
                                <div className="table-responsive">
                                    <Table bordered hover size="sm" className="m-0 small shadow-sm text-nowrap">
                                        <thead className="table-dark text-white text-center">
                                            <tr>
                                                <th>Waktu</th>
                                                <th>Tindakan</th>
                                                <th>Qty</th>
                                                <th>PIC</th>
                                                <th>Catatan Note</th>
                                            </tr>
                                        </thead>
                                        <tbody style={{ fontSize: '12px' }}>
                                            {selectedItem.logs?.length > 0 ? selectedItem.logs.map((log) => (
                                                <tr key={log.id} className="text-center">
                                                    <td>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                                                    <td><Badge bg={log.action_type === 'REPAIR' ? 'success' : 'danger'}>{log.action_type}</Badge></td>
                                                    <td className="fw-bold">{log.qty}</td>
                                                    <td>👨‍🔧 {log.pic}</td>
                                                    <td className="text-wrap text-start">"{log.note || '-'}"</td>
                                                </tr>
                                            )) : (
                                                <tr className="text-center">
                                                    <td>{selectedItem.schedule_date} {selectedItem.inspection_time?.substring(0,5)}</td>
                                                    <td><Badge bg="info">INSPECTION</Badge></td>
                                                    <td className="fw-bold">{selectedItem.qty_ng + selectedItem.qty_ok}</td>
                                                    <td>👨‍🔧 {selectedItem.inspector_name}</td>
                                                    <td className="text-start text-wrap">Inspeksi awal kedatangan komponen part pabrik.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="py-1.5 px-2">
                    <Button variant="secondary" size="sm" className="w-100 w-md-auto px-4" onClick={() => setShowDetail(false)}>Tutup Detail</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default QCReport;