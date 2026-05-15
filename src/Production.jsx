import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Badge, Row, Col, Alert, InputGroup } from 'react-bootstrap';
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
            const resPart = await axios.get('hhttps://zeni08.pythonanywhere.com/api/parts/');
            
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
                
                // PENTING: Panggil ulang data agar status PENDING di tabel berubah
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

    // --- UPDATE PDF MENYESUAIKAN GAMBAR ---
    const exportToPDF = () => {
        try {
            const doc = new jsPDF(); 
            
            // 1. Pasang Logo Suzuki (Mengambil gambar dari folder public)
            try {
                const img = new Image();
                img.src = '/logo.png'; 
                doc.addImage(img, 'PNG', 14, 10, 35, 10);
            } catch (e) {
                // Fallback jika logo gagal dimuat (Aman)
            }

            // 2. Judul Dokumen (Sesuai Gambar)
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);
            doc.text("LAPORAN PRODUCTION REQUEST - PT SUZUKI INDOMOBIL MOTOR", 14, 28);

            // 3. Timestamp (Waktu Cetak) dan Jumlah Data
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            const now = new Date();
            const printDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`;
            
            doc.text(`Dicetak pada: ${printDate}`, 14, 34);
            doc.text(`Total Data: ${filteredRequests.length} baris`, 14, 40);

            // 4. Susun Struktur Tabel
            const tableColumn = ["No", "Tgl", "Part Name", "Line Tujuan", "Qty Keluar", "Status"];
            const tableRows = filteredRequests.map((r, index) => [
                index + 1,
                r.request_date, 
                r.part_name, 
                r.line_name,
                r.qty_request, 
                r.status || 'PENDING'
            ]);
            
            // 5. Render Tabel dengan Tema Grid & Header Biru (Sesuai Gambar)
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 45,
                theme: 'grid', // Menggunakan tema kotak-kotak
                headStyles: { fillColor: [0, 86, 179], textColor: 255, halign: 'center' }, // Biru Suzuki
                styles: { fontSize: 9, halign: 'center' },
                columnStyles: {
                    2: { halign: 'left' }, // Part name dibuat rata kiri
                    3: { halign: 'left' }  // Line tujuan dibuat rata kiri
                }
            });

            // 6. Tempat Tanda Tangan (Sesuai Gambar)
            const finalY = doc.lastAutoTable.finalY || 45; // Mengambil koordinat Y terakhir setelah tabel
            doc.setFont("helvetica", "bold");
            doc.text("Dibuat Oleh:", 150, finalY + 20); // Posisi Kanan Bawah
            
            doc.text(currentUser.toUpperCase(), 150, finalY + 40); // Nama Admin/Manager
            
            // Garis bawah untuk tanda tangan
            doc.setLineWidth(0.5);
            doc.line(150, finalY + 41, 190, finalY + 41);

            // 7. Simpan File PDF
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
            item.part_name.toLowerCase().includes(term) ||
            item.line_name.toLowerCase().includes(term) ||
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
            // KIRIM REQUEST DENGAN STATUS PENDING
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

    return (
        <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f4f6f9' }}>
            
            {/* SIDEBAR */}
            <div className="bg-white border-end" style={{ width: '250px', minHeight: '100vh', position: 'fixed', zIndex: 1000 }}>
                <div className="p-4 text-center border-bottom">
                    <img src="/logo.png" alt="Suzuki" style={{ maxWidth: '120px' }} />
                </div>
                <div className="p-3">
                    <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/dashboard')}>📊 Dashboard</Button>
                    {(role === 'manager' || role === 'admin') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/vendors')}>🏢 Vendor Data</Button>}
                    {(role === 'manager' || role === 'admin') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/parts')}>⚙️ Part Data</Button>}
                    {(role === 'manager' || role === 'admin' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/schedule')}>📅 Receiving Schedule</Button>}
                    {(role === 'manager' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/qc-report')}>📑 QC Report</Button>}
                    {(role === 'manager' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/ng-handling')}>🔧 Pengelolaan NG</Button>}
                    {(role === 'manager' || role === 'foreman' || role === 'admin') && (<Button variant="primary" className="w-100 text-start mb-2 fw-bold">🏭 Production Request</Button>)}
                    {role === 'manager' && (<Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/recycle-bin'); setShowMobileMenu(false);}}>♻️ Recycle Bin</Button>)}
                    <Button variant="danger" className="w-100 mt-4" onClick={handleLogout}>🚪 Logout</Button>
                </div>
            </div>

            {/* KONTEN UTAMA */}
            <div className="flex-grow-1 p-4" style={{ marginLeft: '250px' }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h3 className="fw-bold text-dark">Production Request</h3>
                        <p className="text-muted mb-0">Input Barang Keluar ke Line Produksi</p>
                    </div>
                    <div className="d-flex gap-2">
                        {canApprove && (
                            <>
                                <Button variant="outline-success" onClick={exportExcel}>📊 Excel</Button>
                                <Button variant="outline-danger" onClick={exportToPDF}>📕 PDF</Button>
                            </>
                        )}
                        {canInput && (
                            <Button variant="danger" onClick={() => setShowAdd(true)}>+ Input Barang Keluar</Button>
                        )}
                    </div>
                </div>

                {/* FILTER */}
                <Card className="border-0 shadow-sm p-3 mb-4">
                    <Row className="g-2">
                        <Col md={4}>
                            <Form.Label className="fw-bold small">Cari Part / Line / PIC / Lot</Form.Label>
                            <InputGroup>
                                <InputGroup.Text className="bg-white">🔍</InputGroup.Text>
                                <Form.Control 
                                    type="text" 
                                    placeholder="Ketik nama part, lot number..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </InputGroup>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="fw-bold small">Dari Tanggal</Form.Label>
                                <Form.Control type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="fw-bold small">Sampai Tanggal</Form.Label>
                                <Form.Control type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </Form.Group>
                        </Col>
                        <Col md={2} className="d-flex align-items-end">
                            <Button variant="outline-secondary" className="w-100" onClick={() => {setSearchQuery(''); setStartDate(''); setEndDate('');}}>
                                Reset Filter
                            </Button>
                        </Col>
                    </Row>
                </Card>

                {/* TABEL DATA */}
                <Card className="border-0 shadow-sm p-3">
                    <Table hover responsive striped className="align-middle">
                        <thead className="bg-light">
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
                        <tbody>
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
                </Card>
            </div>

            {/* MODAL INPUT */}
            <Modal show={showAdd} onHide={() => setShowAdd(false)}>
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title>Input Barang Keluar</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSave}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold">PIC Pengambil</Form.Label>
                                    <Form.Control type="text" value={formData.pic} onChange={e => setFormData({...formData, pic: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Line Produksi Tujuan</Form.Label>
                                    <Form.Control type="text" value={formData.line_name} onChange={e => setFormData({...formData, line_name: e.target.value})} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <div className="p-3 bg-light border rounded mb-3">
                            <Form.Group className="mb-2">
                                <Form.Label className="fw-bold">Pilih Part</Form.Label>
                                <Form.Select required value={formData.part} onChange={handlePartChange}>
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
                                    <small>Sisa Stok Tersedia:</small>
                                    <Badge bg={selectedPartStock > 0 ? 'success' : 'danger'} pill>
                                        {selectedPartStock} Pcs
                                    </Badge>
                                </div>
                            )}
                        </div>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Qty (Kelipatan 60)</Form.Label>
                                    <Form.Control 
                                        type="number" 
                                        required 
                                        min="60"
                                        step="60"
                                        className={qtyError ? 'is-invalid' : ''}
                                        value={formData.qty_request} 
                                        onChange={handleQtyChange} 
                                    />
                                    {qtyError && <div className="invalid-feedback fw-bold">{qtyError}</div>}
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Lot Number (Out)</Form.Label>
                                    <Form.Control type="text" placeholder="Scan Lot/Batch..." value={formData.lot_number_out} onChange={e => setFormData({...formData, lot_number_out: e.target.value})} />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowAdd(false)}>Batal</Button>
                        <Button variant="danger" type="submit" disabled={!!qtyError || !formData.qty_request}>Ajukan</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* MODAL DETAIL */}
            <Modal show={showDetail} onHide={() => setShowDetail(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">Bukti Pengeluaran Barang</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedRequest && (
                        <div className="p-2 text-center">
                            <h1 className="display-4 text-danger fw-bold mb-0">-{selectedRequest.qty_request}</h1>
                            <p className="text-muted mb-4">Pcs Keluar</p>
                            <Card className="bg-light border-0 p-3 text-start">
                                <Table borderless size="sm" className="m-0">
                                    <tbody>
                                        <tr><td className="text-muted">Part</td><td>: <strong>{selectedRequest.part_name}</strong></td></tr>
                                        <tr><td className="text-muted">PIC</td><td>: {selectedRequest.pic}</td></tr>
                                        <tr><td className="text-muted">Status</td><td>: <Badge bg={selectedRequest.status === 'APPROVED' ? 'success' : 'warning'}>{selectedRequest.status || 'PENDING'}</Badge></td></tr>
                                    </tbody>
                                </Table>
                            </Card>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetail(false)}>Tutup</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Production;