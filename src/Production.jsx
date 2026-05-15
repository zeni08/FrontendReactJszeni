import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Badge, Row, Col, Alert, InputGroup, Navbar, Offcanvas } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

const Production = () => {
    const navigate = useNavigate();
    
    // AMBIL ROLE & USERNAME
    const userRole = localStorage.getItem('role');
    const currentUser = localStorage.getItem('username') || 'Admin Produksi';
    
    // NORMALISASI ROLE (Biar aman huruf besar/kecil)
    const role = userRole ? userRole.toLowerCase() : '';

    // STATE UI RESPONSIVE
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // STATE DATA
    const [requests, setRequests] = useState([]);
    const [parts, setParts] = useState([]);
    
    // STATE MODAL INPUT
    const [showAdd, setShowAdd] = useState(false);
    
    // STATE MODAL DETAIL
    const [showDetail, setShowDetail] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    // STATE ERROR VALIDASI
    const [qtyError, setQtyError] = useState(""); 

    // --- STATE FILTER BARU ---
    const [searchQuery, setSearchQuery] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // --- FUNGSI WAKTU & TANGGAL ---
    const getTodayDate = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getCurrentTime = () => {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    };

    // FORM DATA
    const [formData, setFormData] = useState({
        part: '',
        line_name: 'Line Assembling Engine',
        qty_request: '',
        request_date: getTodayDate(),
        request_time: getCurrentTime(),
        pic: currentUser,
        lot_number_out: '',
        status: 'PENDING'
    });

    const [selectedPartStock, setSelectedPartStock] = useState(0); 

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const resReq = await axios.get('https://zeni08.pythonanywhere.com/api/production/');
            // FIXED BUG: Mengoreksi typo hhttps menjadi https agar data parts berhasil dimuat
            const resPart = await axios.get('https://zeni08.pythonanywhere.com/api/parts/');
            
            // Sort data terbaru di atas
            setRequests(resReq.data.sort((a, b) => b.id - a.id));
            setParts(resPart.data);
        } catch (error) { console.error(error); }
    };

    // --- LOGIKA APPROVAL ---
    const handleApproval = async (item, newStatus) => {
        if (window.confirm(`Yakin ingin ${newStatus === 'APPROVED' ? 'MENYETUJUI' : 'MENOLAK'} permintaan ini?`)) {
            try {
                // 1. Update Status ke Database
                await axios.patch(`https://zeni08.pythonanywhere.com/api/production/${item.id}/`, { 
                    status: newStatus 
                });

                // 2. JIKA APPROVED, kurangi stok
                if (newStatus === 'APPROVED') {
                    const partData = parts.find(p => p.id === item.part);
                    if (partData) {
                        const sisaStok = partData.current_stock - item.qty_request;
                        await axios.patch(`https://zeni08.pythonanywhere.com/api/parts/${item.part}/`, { 
                            current_stock: sisaStok 
                        });
                    }
                }

                alert(`✅ Permintaan Berhasil di-${newStatus}!`);
                await fetchData(); 

            } catch (error) { 
                console.error("Error Detail:", error.response?.data);
                alert("Gagal memproses approval. Cek apakah kolom 'status' sudah ada di database."); 
            }
        }
    };

    // --- LOGIKA EXPORT ---
    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(filteredRequests);
        const wb = { Sheets: { 'data': ws }, SheetNames: ['data'] };
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([excelBuffer]), `Production_Report_${getTodayDate()}.xlsx`);
    };

    const exportToPDF = () => {
        try {
            const doc = new jsPDF(); 
            try {
                const img = new Image();
                img.src = '/logo.png'; 
                doc.addImage(img, 'PNG', 14, 10, 35, 10);
            } catch (e) { }

            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);
            doc.text("LAPORAN PRODUCTION REQUEST - PT SUZUKI INDOMOBIL MOTOR", 14, 28);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            const now = new Date();
            const printDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`;
            
            doc.text(`Dicetak pada: ${printDate}`, 14, 34);
            doc.text(`Total Data: ${filteredRequests.length} baris`, 14, 40);

            const tableColumn = ["No", "Tgl", "Part Name", "Line Tujuan", "Qty Keluar", "Status"];
            const tableRows = filteredRequests.map((r, index) => [
                index + 1,
                r.request_date, 
                r.part_name, 
                r.line_name,
                r.qty_request, 
                r.status || 'PENDING'
            ]);
            
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 45,
                theme: 'grid',
                headStyles: { fillColor: [0, 86, 179], textColor: 255, halign: 'center' },
                styles: { fontSize: 9, halign: 'center' },
                columnStyles: {
                    2: { halign: 'left' },
                    3: { halign: 'left' }
                }
            });

            const finalY = doc.lastAutoTable.finalY || 45;
            doc.setFont("helvetica", "bold");
            doc.text("Dibuat Oleh:", 150, finalY + 20);
            doc.text(currentUser.toUpperCase(), 150, finalY + 40);
            
            doc.setLineWidth(0.5);
            doc.line(150, finalY + 41, 190, finalY + 41);

            doc.save(`Laporan_Production_Request_${getTodayDate()}.pdf`);
        } catch (error) {
            console.error("Gagal Download PDF:", error);
            alert("Gagal mengunduh PDF. Pastikan module jspdf-autotable sudah terinstall dengan benar.");
        }
    };

    // --- LOGIKA FILTERING ---
    const filteredRequests = requests.filter(item => {
        const term = searchQuery.toLowerCase();
        const matchSearch = 
            (item.part_name || "").toLowerCase().includes(term) ||
            (item.line_name || "").toLowerCase().includes(term) ||
            (item.pic && item.pic.toLowerCase().includes(term)) ||
            (item.lot_number_out && item.lot_number_out.toLowerCase().includes(term));

        let matchDate = true;
        if (startDate && endDate) {
            matchDate = item.request_date >= startDate && item.request_date <= endDate;
        } else if (startDate) {
            matchDate = item.request_date >= startDate;
        }

        return matchSearch && matchDate;
    });

    const handlePartChange = (e) => {
        const partId = e.target.value;
        const partData = parts.find(p => p.id == partId);
        setFormData({ ...formData, part: partId });
        if (partData) {
            setSelectedPartStock(partData.current_stock);
        } else {
            setSelectedPartStock(0);
        }
    };

    const handleQtyChange = (e) => {
        const val = parseInt(e.target.value) || 0;
        setFormData({ ...formData, qty_request: val });

        if (val <= 0) {
            setQtyError("Jumlah harus lebih dari 0.");
        } else if (val % 60 !== 0) {
            setQtyError(`⚠️ Wajib kelipatan 60!`);
        } else if (val > selectedPartStock) {
            setQtyError(`⛔ Stok tidak cukup! Sisa: ${selectedPartStock}`);
        } else {
            setQtyError(""); 
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        if (qtyError || !formData.qty_request) {
            alert("Harap perbaiki input Qty terlebih dahulu!");
            return;
        }

        try {
            await axios.post('https://zeni08.pythonanywhere.com/api/production/', { ...formData, status: 'PENDING' });
            
            alert("✅ Permintaan Berhasil Diajukan! Menunggu Approval Admin/Manager.");
            setShowAdd(false);
            fetchData();
            
            setFormData({ 
                ...formData, 
                part: '', qty_request: '', lot_number_out: '',
                request_time: getCurrentTime(),
                request_date: getTodayDate()
            });
            setSelectedPartStock(0);
            setQtyError("");

        } catch (error) {
            alert("Gagal Simpan. Cek koneksi backend.");
        }
    };

    const handleDelete = async (item) => {
        if (window.confirm("Hapus history ini? (Stok TIDAK akan kembali otomatis)")) {
            try {
                await axios.delete(`https://zeni08.pythonanywhere.com/api/production/${item.id}/`);
                fetchData();
            } catch (error) { alert("Gagal Menghapus"); }
        }
    };

    const handleRowClick = (item) => {
        setSelectedRequest(item);
        setShowDetail(true);
    };

    const handleLogout = () => { localStorage.clear(); navigate('/'); };

    // --- HAK AKSES ---
    const canInput = role === 'foreman' ;
    const canApprove = role === 'manager' || role === 'admin';
    const canDelete = role === 'manager';

    // KOMPONEN SIDEBAR DINAMIS
    const SidebarContent = () => (
        <div className="p-3">
            <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/dashboard'); setShowMobileMenu(false); }}>📊 Dashboard</Button>
            {(role === 'manager' || role === 'admin') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/vendors'); setShowMobileMenu(false); }}>🏢 Vendor Data</Button>}
            {(role === 'manager' || role === 'admin') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/parts'); setShowMobileMenu(false); }}>⚙️ Part Data</Button>}
            {(role === 'manager' || role === 'admin' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/schedule'); setShowMobileMenu(false); }}>📅 Receiving Schedule</Button>}
            {(role === 'manager' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/qc-report'); setShowMobileMenu(false); }}>📑 QC Report</Button>}
            {(role === 'manager' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/ng-handling'); setShowMobileMenu(false); }}>🔧 Pengelolaan NG</Button>}
            {(role === 'manager' || role === 'foreman' || role === 'admin') && (<Button variant="primary" className="w-100 text-start mb-2 fw-bold">🏭 Production Request</Button>)}
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
                <div className="p-4 text-center border-bottom">
                    <img src="/logo.png" alt="Suzuki" style={{ maxWidth: '120px' }} />
                </div>
                <SidebarContent />
            </div>

            {/* NAVBAR MOBILE HEADER */}
            <Navbar bg="white" expand={false} fixed="top" className="mobile-header border-bottom shadow-sm px-3" style={{ display: 'none' }}>
                <Button variant="outline-dark" size="sm" onClick={() => setShowMobileMenu(true)}>☰ Menu</Button>
                <Navbar.Brand className="ms-2 fw-bold text-primary fs-6">Production Request</Navbar.Brand>
            </Navbar>

            {/* OFF-CANVAS DRAWER MOBILE */}
            <Offcanvas show={showMobileMenu} onHide={() => setShowMobileMenu(false)} style={{ width: '280px' }}>
                <Offcanvas.Header closeButton><Offcanvas.Title><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '100px' }} /></Offcanvas.Title></Offcanvas.Header>
                <Offcanvas.Body className="p-0"><SidebarContent /></Offcanvas.Body>
            </Offcanvas>

            {/* MAIN CONTAINER CONTENT */}
            <div className="main-content p-3 p-md-4 flex-grow-1">
                {/* Diubah menjadi flex-column di HP agar tombol tidak tabrakan atau keluar layar */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 mb-md-4 gap-3">
                    <div>
                        <h3 className="fw-bold text-dark mb-0 fs-4 fs-md-3">Production Request</h3>
                        <p className="text-muted mb-0 small">Input Barang Keluar ke Line Produksi</p>
                    </div>
                    <div className="d-flex gap-2 flex-wrap">
                        {canApprove && (
                            <>
                                <Button variant="outline-success" size="sm" className="fw-bold px-3" onClick={exportExcel}>📊 Excel</Button>
                                <Button variant="outline-danger" size="sm" className="fw-bold px-3" onClick={exportToPDF}>📕 PDF</Button>
                            </>
                        )}
                        {canInput && (
                            <Button variant="danger" size="sm" className="fw-bold px-3" onClick={() => setShowAdd(true)}>+ Input Barang Keluar</Button>
                        )}
                    </div>
                </div>

                {/* FILTER FORM RESPONSIVE CONTROL */}
                <Card className="border-0 shadow-sm p-3 mb-3 mb-md-4">
                    <Row className="g-2">
                        <Col xs={12} md={4}>
                            <Form.Label className="fw-bold small mb-1">Cari Part / Line / PIC / Lot</Form.Label>
                            <InputGroup size="sm">
                                <InputGroup.Text className="bg-white">🔍</InputGroup.Text>
                                <Form.Control 
                                    type="text" 
                                    placeholder="Ketik nama part, lot number..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </InputGroup>
                        </Col>
                        <Col xs={12} sm={6} md={3}>
                            <Form.Group>
                                <Form.Label className="fw-bold small mb-1">Dari Tanggal</Form.Label>
                                <Form.Control size="sm" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            </Form.Group>
                        </Col>
                        <Col xs={12} sm={6} md={3}>
                            <Form.Group>
                                <Form.Label className="fw-bold small mb-1">Sampai Tanggal</Form.Label>
                                <Form.Control size="sm" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </Form.Group>
                        </Col>
                        <Col xs={12} md={2} className="d-flex align-items-end">
                            <Button size="sm" variant="outline-secondary" className="w-100 mt-2 mt-md-0" onClick={() => {setSearchQuery(''); setStartDate(''); setEndDate('');}}>
                                Reset Filter
                            </Button>
                        </Col>
                    </Row>
                </Card>

                {/* CONTAINER TABEL / CARD LOG */}
                <Card className="border-0 shadow-sm overflow-hidden">
                    
                    {/* 🖥️ VIEW LAPTOP: Berwujud Tabel Standar Lengkap */}
                    <div className="table-responsive d-none d-md-block">
                        <Table hover striped className="m-0 align-middle">
                            <thead className="bg-light text-secondary small text-nowrap">
                                <tr>
                                    <th>No</th>
                                    <th>Tanggal & Jam</th>
                                    <th>Part Name</th>
                                    <th>Line Tujuan</th>
                                    <th>Lot Out</th>
                                    <th>Qty Keluar</th>
                                    <th>Aksi</th>
                                    <th>Status</th>
                                    <th className="text-center">Aksi Approval</th>
                                </tr>
                            </thead>
                            <tbody className="small">
                                {filteredRequests.length > 0 ? (
                                    filteredRequests.map((item, index) => (
                                        <tr key={item.id} onClick={() => handleRowClick(item)} style={{ cursor: 'pointer' }}>
                                            <td>{index + 1}</td>
                                            <td>
                                                {item.request_date}<br/>
                                                <small className="text-muted">🕒 {item.request_time ? item.request_time.substring(0, 5) : '-'}</small>
                                            </td>
                                            <td>
                                                <strong>{item.part_name}</strong><br/>
                                                <small className="text-muted">{item.part_number}</small>
                                            </td>
                                            <td><Badge bg="secondary">{item.line_name}</Badge></td>
                                            <td>{item.lot_number_out ? <Badge bg="dark">{item.lot_number_out}</Badge> : '-'}</td>
                                            <td className="text-danger fw-bold">-{item.qty_request}</td>
                                            <td onClick={e => e.stopPropagation()}>
                                                {canDelete && (
                                                    <Button size="sm" variant="outline-secondary" onClick={() => handleDelete(item)}>Hapus</Button>
                                                )}
                                            </td>
                                            <td>
                                                <Badge bg={item.status?.toUpperCase() === 'APPROVED' ? 'success' : item.status?.toUpperCase() === 'REJECTED' ? 'danger' : 'warning'}>
                                                    {item.status || 'PENDING'}
                                                </Badge>
                                            </td>
                                            <td onClick={e => e.stopPropagation()} className="text-center">
                                                {canApprove && (item.status?.toUpperCase() === 'PENDING' || !item.status) ? (
                                                    <div className="d-flex gap-2 justify-content-center">
                                                        <Button size="sm" variant="success" className="fw-bold" onClick={() => handleApproval(item, 'APPROVED')}>✔ Setuju</Button>
                                                        <Button size="sm" variant="danger" className="fw-bold" onClick={() => handleApproval(item, 'REJECTED')}>✘ Tolak</Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted small">Selesai</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="9" className="text-center py-4 text-muted">Data tidak ditemukan sesuai filter.</td></tr>
                                )}
                            </tbody>
                        </Table>
                    </div>

                    {/* 📱 VIEW HP: Berubah Menjadi Desain List Card Elegan */}
                    <div className="d-block d-md-none">
                        {filteredRequests.length === 0 ? (
                            <div className="p-4 text-center text-muted small">Data tidak ditemukan sesuai filter.</div>
                        ) : (
                            filteredRequests.map((item, index) => (
                                <div key={item.id} className="p-3 border-bottom bg-white" onClick={() => handleRowClick(item)} style={{ cursor: 'pointer' }}>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div>
                                            <span className="text-muted small fw-bold">#{index + 1}</span>
                                            <span className="text-muted small ms-2">📅 {item.request_date} (🕒 {item.request_time?.substring(0, 5)})</span>
                                        </div>
                                        <Badge bg={item.status?.toUpperCase() === 'APPROVED' ? 'success' : item.status?.toUpperCase() === 'REJECTED' ? 'danger' : 'warning'}>
                                            {item.status || 'PENDING'}
                                        </Badge>
                                    </div>
                                    
                                    <div className="bg-light p-2 rounded mb-2">
                                        <div className="fw-bold text-dark small">{item.part_name}</div>
                                        <div className="text-muted mb-1" style={{ fontSize: '11px' }}>PN: {item.part_number}</div>
                                        <div className="d-flex gap-1 flex-wrap">
                                            <Badge bg="secondary" className="fw-normal">{item.line_name}</Badge>
                                            {item.lot_number_out && <Badge bg="dark" className="fw-normal">Lot: {item.lot_number_out}</Badge>}
                                        </div>
                                    </div>
                                    
                                    <div className="d-flex justify-content-between align-items-center mt-2">
                                        <span className="text-danger fw-bold fs-5">-{item.qty_request} <span className="small text-muted fw-normal" style={{ fontSize: '11px' }}>Pcs</span></span>
                                        <div className="d-flex gap-1" onClick={e => e.stopPropagation()}>
                                            {canDelete && (
                                                <Button size="sm" variant="outline-secondary" className="py-0 px-2 small" onClick={() => handleDelete(item)}>Hapus</Button>
                                            )}
                                            {canApprove && (item.status?.toUpperCase() === 'PENDING' || !item.status) && (
                                                <>
                                                    <Button size="sm" variant="success" className="fw-bold py-0 px-2" onClick={() => handleApproval(item, 'APPROVED')}>✔</Button>
                                                    <Button size="sm" variant="danger" className="fw-bold py-0 px-2" onClick={() => handleApproval(item, 'REJECTED')}>✘</Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* MODAL INPUT RESPONSIVE GRID */}
            <Modal show={showAdd} onHide={() => setShowAdd(false)} centered>
                <Modal.Header closeButton className="bg-danger text-white py-2 px-3">
                    <Modal.Title className="fs-6 fw-bold">Input Barang Keluar</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSave}>
                    <Modal.Body className="small">
                        <Row className="g-2">
                            <Col xs={12} sm={6}>
                                <Form.Group className="mb-2">
                                    <Form.Label className="fw-bold mb-1">PIC Pengambil</Form.Label>
                                    <Form.Control type="text" value={formData.pic} onChange={e => setFormData({...formData, pic: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Form.Group className="mb-2">
                                    <Form.Label className="fw-bold mb-1">Line Produksi Tujuan</Form.Label>
                                    <Form.Control type="text" value={formData.line_name} onChange={e => setFormData({...formData, line_name: e.target.value})} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <div className="p-2.5 bg-light border rounded mb-3 mt-2">
                            <Form.Group className="mb-1">
                                <Form.Label className="fw-bold mb-1">Pilih Part</Form.Label>
                                <Form.Select required value={formData.part} onChange={handlePartChange} className="form-select-sm">
                                    <option value="">-- Pilih Part --</option>
                                    {parts.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.part_name} (Stok: {p.current_stock})
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                            {formData.part && (
                                <div className="d-flex justify-content-between align-items-center mt-2">
                                    <small className="text-muted">Sisa Stok Gudang:</small>
                                    <Badge bg={selectedPartStock > 0 ? 'success' : 'danger'} pill>
                                        {selectedPartStock} Pcs
                                    </Badge>
                                </div>
                            )}
                        </div>
                        <Row className="g-2">
                            <Col xs={12} sm={6}>
                                <Form.Group className="mb-2">
                                    <Form.Label className="fw-bold mb-1">Qty (Kelipatan 60)</Form.Label>
                                    <Form.Control 
                                        type="number" 
                                        required 
                                        min="60"
                                        step="60"
                                        className={qtyError ? 'is-invalid' : ''}
                                        value={formData.qty_request} 
                                        onChange={handleQtyChange} 
                                    />
                                    {qtyError && <div className="invalid-feedback fw-bold text-xs">{qtyError}</div>}
                                </Form.Group>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Form.Group className="mb-2">
                                    <Form.Label className="fw-bold mb-1">Lot Number (Out)</Form.Label>
                                    <Form.Control type="text" placeholder="Scan Lot/Batch..." value={formData.lot_number_out} onChange={e => setFormData({...formData, lot_number_out: e.target.value})} />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer className="py-1 px-2">
                        <Button variant="secondary" size="sm" onClick={() => setShowAdd(false)}>Batal</Button>
                        <Button variant="danger" size="sm" type="submit" disabled={!!qtyError || !formData.qty_request}>Ajukan Permintaan</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* MODAL DETAIL */}
            <Modal show={showDetail} onHide={() => setShowDetail(false)} centered>
                <Modal.Header closeButton className="py-2 px-3">
                    <Modal.Title className="fs-6 fw-bold">Bukti Pengeluaran Barang</Modal.Title>
                </Modal.Header>
                <Modal.Body className="small">
                    {selectedRequest && (
                        <div className="p-2 text-center">
                            <h1 className="display-4 text-danger fw-bold mb-0">-{selectedRequest.qty_request}</h1>
                            <p className="text-muted mb-3 small">Pcs Keluar Produksi</p>
                            <Card className="bg-light border-0 p-3 text-start">
                                <Table borderless size="sm" className="m-0 small">
                                    <tbody>
                                        <tr><td className="text-muted" style={{ width: '35%' }}>Part Nama</td><td>: <strong>{selectedRequest.part_name}</strong></td></tr>
                                        <tr><td className="text-muted">PIC Pengambil</td><td>: {selectedRequest.pic}</td></tr>
                                        <tr><td className="text-muted">Line Tujuan</td><td>: <Badge bg="secondary" className="fw-normal">{selectedRequest.line_name}</Badge></td></tr>
                                        <tr><td className="text-muted">Lot Out</td><td>: {selectedRequest.lot_number_out ? <Badge bg="dark" className="fw-normal">{selectedRequest.lot_number_out}</Badge> : '-'}</td></tr>
                                        <tr><td className="text-muted">Status Log</td><td>: <Badge bg={selectedRequest.status === 'APPROVED' ? 'success' : selectedRequest.status === 'REJECTED' ? 'danger' : 'warning'}>{selectedRequest.status || 'PENDING'}</Badge></td></tr>
                                    </tbody>
                                </Table>
                            </Card>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="py-1 px-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowDetail(false)}>Tutup</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Production;