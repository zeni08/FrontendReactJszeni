import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Modal, Form, Row, Col, Image, InputGroup, Navbar, Offcanvas } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const NGHandling = () => {
    const navigate = useNavigate();
    // Mengambil role dari localStorage hasil login
    const userRole = localStorage.getItem('role') || 'Staff';
    const role = userRole.toUpperCase();

    // STATE UI RESPONSIVE
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // STATE DATA UTAMA
    const [ngList, setNgList] = useState([]); 
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); 

    // STATE MODAL TINDAKAN
    const [showAction, setShowAction] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [actionType, setActionType] = useState('');
    const [qtyHandle, setQtyHandle] = useState(0);
    const [remarks, setRemarks] = useState('');
    const [photoFile, setPhotoFile] = useState(null);

    // STATE MODAL DETAIL LOG
    const [showDetail, setShowDetail] = useState(false);
    const [detailItem, setDetailItem] = useState(null);

    useEffect(() => { fetchNGData(); }, []);

    const fetchNGData = async () => {
        try {
            const res = await axios.get('https://zeni08.pythonanywhere.com/api/inspections/');
            setNgList(res.data.sort((a, b) => b.id - a.id));
        } catch (error) { console.error("Gagal ambil data:", error); }
    };

    const filteredList = ngList.filter(item => {
        const matchSearch = (item.part_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (item.lot_number?.toLowerCase().includes(searchQuery.toLowerCase()));
        let matchStatus = true;
        if (statusFilter === "PENDING") matchStatus = item.qty_ng > 0;
        else if (statusFilter === "HANDLED") matchStatus = item.qty_ng === 0;
        return matchSearch && matchStatus;
    });

    const handleActionClick = (item) => {
        setSelectedItem(item);
        setQtyHandle(item.qty_ng);
        setShowAction(true);
        setActionType('');
        setPhotoFile(null);
        setRemarks('');
    };

    const handleHistoryClick = (item) => {
        setDetailItem(item);
        setShowDetail(true);
    };

    const submitAction = async () => {
        if (!actionType) return alert("Pilih tindakan!");
        const formData = new FormData();
        formData.append('action', actionType);
        formData.append('qty', qtyHandle);
        formData.append('remarks', remarks);
        if (photoFile) { formData.append('repair_photo', photoFile); }

        try {
            await axios.post(`https://zeni08.pythonanywhere.com/api/inspections/${selectedItem.id}/resolve_ng/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(`✅ SUKSES! Tindakan dan Foto Berhasil Disimpan.`);
            setShowAction(false);
            fetchNGData();
        } catch (error) { alert("⛔ Gagal menyimpan data perbaikan."); }
    };

    // LOGIKA ANTI-DOUBLE HTTP
    const getFullImageUrl = (item) => {
        const path = item?.repair_photo || item?.pic;
        if (!path) return null;
        if (path.startsWith('http')) return `${path}?t=${new Date().getTime()}`;
        
        const baseUrl = "https://zeni08.pythonanywhere.com";
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}?t=${new Date().getTime()}`;
    };

    // KOMPONEN SIDEBAR DINAMIS
    const SidebarContent = () => (
        <div className="p-3">
            {(role === 'MANAGER' || role === 'ADMIN' || role === 'HINTAN') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/dashboard'); setShowMobileMenu(false); }}>📊 Dashboard</Button>
            )}
            {(role === 'MANAGER' || role === 'ADMIN') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/vendors'); setShowMobileMenu(false); }}>🏢 Vendor Data</Button>
            )}
            {(role === 'MANAGER' || role === 'ADMIN') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/parts'); setShowMobileMenu(false); }}>⚙️ Part Data</Button>
            )}
            {(role === 'MANAGER' || role === 'ADMIN' || role === 'HINTAN') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/schedule'); setShowMobileMenu(false); }}>📅 Receiving Schedule</Button>
            )}
            {(role === 'MANAGER' || role === 'HINTAN') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/qc-report'); setShowMobileMenu(false); }}>📑 QC Report</Button>
            )}
            {role !== 'FOREMAN' && (<Button variant="primary" className="w-100 text-start mb-2 fw-bold">🔧 Pengelolaan NG</Button>)}
            {(role === 'MANAGER' || role === 'FOREMAN') && (<Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/production'); setShowMobileMenu(false); }}>🏭 Production Request</Button>)}
            {role === 'MANAGER' && (<Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/recycle-bin'); setShowMobileMenu(false); }}>♻️ Recycle Bin</Button>)}
            <Button variant="danger" className="w-100 mt-4" onClick={() => { localStorage.clear(); navigate('/'); }}>🚪 Logout</Button>
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
            
            {/* SIDEBAR LAPTOP */}
            <div className="desktop-sidebar bg-white border-end" style={{ width: '250px', minHeight: '100vh', position: 'fixed', zIndex: 1000 }}>
                <div className="p-4 text-center border-bottom"><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '120px' }} /></div>
                <SidebarContent />
            </div>

            {/* NAVBAR MOBILE HEADER (Tombol Hamburger Menu) */}
            <Navbar bg="white" expand={false} fixed="top" className="mobile-header border-bottom shadow-sm px-3" style={{ display: 'none' }}>
                <Button variant="outline-dark" size="sm" onClick={() => setShowMobileMenu(true)}>☰ Menu</Button>
                <Navbar.Brand className="ms-2 fw-bold text-primary fs-6">Pengelolaan NG</Navbar.Brand>
            </Navbar>

            {/* DRAWER MENU OFF-CANVAS MOBILE */}
            <Offcanvas show={showMobileMenu} onHide={() => setShowMobileMenu(false)} style={{ width: '280px' }}>
                <Offcanvas.Header closeButton><Offcanvas.Title><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '100px' }} /></Offcanvas.Title></Offcanvas.Header>
                <Offcanvas.Body className="p-0"><SidebarContent /></Offcanvas.Body>
            </Offcanvas>

            {/* ISI UTAMA HALAMAN (Menghapus inline style marginLeft paten agar tidak tabrakan di HP) */}
            <div className="main-content p-3 p-md-4">
                <h3 className="fw-bold mb-3 mb-md-4 fs-4 fs-md-3">Pengelolaan Barang NG</h3>
                
                {/* FILTER SEARCH RESPONSIVE */}
                <Card className="border-0 shadow-sm p-3 mb-3 mb-md-4">
                    <Row className="g-2">
                        <Col xs={12} md={6}>
                            <InputGroup>
                                <InputGroup.Text className="bg-white">🔍</InputGroup.Text>
                                <Form.Control type="text" placeholder="Cari Lot/Part..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
                            </InputGroup>
                        </Col>
                        <Col xs={12} md={4}>
                            <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="ALL">Semua Status</option>
                                <option value="PENDING">⚠️ Pending</option>
                                <option value="HANDLED">✅ Selesai</option>
                            </Form.Select>
                        </Col>
                    </Row>
                </Card>

                {/* CONTAINER DATA MASTER */}
                <Card className="border-0 shadow-sm overflow-hidden">
                    
                    {/* 🖥️ VIEW LAPTOP: Berwujud Tabel Horizontal Penuh */}
                    <div className="table-responsive d-none d-md-block">
                        <Table hover striped className="m-0 align-middle">
                            <thead className="bg-dark text-white text-nowrap">
                                <tr><th>Lot Number</th><th>Part Information</th><th>Qty NG</th><th>Action</th><th>Log</th></tr>
                            </thead>
                            <tbody>
                                {filteredList.map((item) => (
                                    <tr key={item.id}>
                                        <td><Badge bg="dark" className="p-2 font-mono">{item.lot_number}</Badge></td>
                                        <td><strong>{item.part_name}</strong><br/><small className="text-muted">{item.vendor_name}</small></td>
                                        <td className="text-danger fw-bold">{item.qty_ng} Pcs</td>
                                        <td>{item.qty_ng > 0 ? <Button size="sm" variant="danger" onClick={() => handleActionClick(item)}>Proses</Button> : <Badge bg="success" className="p-2">Selesai</Badge>}</td>
                                        <td><Button size="sm" variant="outline-info" onClick={() => handleHistoryClick(item)}>📜 Detail</Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>

                    {/* 📱 VIEW HP: Berubah Menjadi Desain List Card Elegan */}
                    <div className="d-block d-md-none">
                        {filteredList.length === 0 ? (
                            <div className="p-4 text-center text-muted small">Tidak ada data penanganan NG.</div>
                        ) : (
                            filteredList.map((item) => (
                                <div key={item.id} className="p-3 border-bottom bg-white">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <Badge bg="dark" className="p-2 font-mono small">{item.lot_number}</Badge>
                                        <span className="text-danger fw-bold fs-6">{item.qty_ng} Pcs</span>
                                    </div>
                                    
                                    <div className="bg-light p-2 rounded mb-3">
                                        <div className="fw-bold text-dark small">{item.part_name}</div>
                                        <div className="text-muted" style={{ fontSize: '11px' }}>{item.vendor_name}</div>
                                    </div>
                                    
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            {item.qty_ng > 0 ? (
                                                <Button size="sm" variant="danger" className="fw-bold px-3 py-1" onClick={() => handleActionClick(item)}>Proses Perbaikan</Button>
                                            ) : (
                                                <Badge bg="success" pill className="px-3 py-1.5">Selesai Diatasi</Badge>
                                            )}
                                        </div>
                                        <Button size="sm" variant="outline-info" className="py-1" onClick={() => handleHistoryClick(item)}>📜 Log Detail</Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* Modal Input Tindakan Perbaikan */}
            <Modal show={showAction} onHide={() => setShowAction(false)} centered>
                <Modal.Header closeButton className="bg-danger text-white"><Modal.Title className="fs-6">⚙️ Tindakan Perbaikan</Modal.Title></Modal.Header>
                <Modal.Body className="p-3">
                    <div className="d-flex gap-2 mb-3">
                        <Button variant={actionType === 'REPAIR' ? 'primary' : 'outline-primary'} className="w-50 fw-bold" onClick={() => setActionType('REPAIR')}>🛠️ Repair</Button>
                        <Button variant={actionType === 'RETURN' ? 'danger' : 'outline-danger'} className="w-50 fw-bold" onClick={() => setActionType('RETURN')}>🚚 Return</Button>
                    </div>
                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-bold">Jumlah Qty yang ditangani:</Form.Label>
                        <Form.Control type="number" value={qtyHandle} onChange={(e) => setQtyHandle(e.target.value)}/>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold text-primary small">📸 Upload Foto Bukti Fisik:</Form.Label>
                        <Form.Control type="file" accept="image/*" className="small" onChange={(e) => setPhotoFile(e.target.files[0])} />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label className="small fw-bold">Catatan Tambahan:</Form.Label>
                        <Form.Control as="textarea" rows={2} placeholder="Kondisi defect akhir..." value={remarks} onChange={e => setRemarks(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer><Button variant="success" className="w-100 fw-bold py-2" onClick={submitAction}>Simpan & Update Stok</Button></Modal.Footer>
            </Modal>

            {/* Modal Detail Log & Foto */}
            <Modal show={showDetail} onHide={() => setShowDetail(false)} centered size="lg">
                <Modal.Header closeButton className="bg-info text-white"><Modal.Title className="fs-6">📜 Riwayat & Dokumentasi Fisik</Modal.Title></Modal.Header>
                <Modal.Body className="p-3">
                    {detailItem && (
                        <div>
                            <div className="mb-3 text-center">
                                <h5 className="fw-bold fs-6 mb-1">{detailItem.part_name}</h5>
                                <Badge bg="dark" className="mb-3 font-mono">{detailItem.lot_number}</Badge>
                                <div className="p-2 bg-light border rounded shadow-sm mx-auto" style={{ maxWidth: '100%' }}>
                                    <h6 className="text-primary fw-bold mb-2" style={{ fontSize: '11px' }}>📸 DOKUMENTASI VISUAL TERBARU</h6>
                                    {getFullImageUrl(detailItem) ? (
                                        <Image src={getFullImageUrl(detailItem)} fluid thumbnail style={{ maxHeight: '250px', objectFit: 'contain' }}
                                               onError={(e) => { e.target.src = "https://placehold.co/600x400?text=Gambar+Tidak+Ditemukan"; }} />
                                    ) : (
                                        <div className="py-4 text-muted small italic">Belum ada lampiran foto bukti.</div>
                                    )}
                                </div>
                            </div>
                            
                            <h6 className="fw-bold text-muted mt-4" style={{ fontSize: '11px' }}>DETAIL RIWAYAT AKTIVITAS:</h6>
                            {/* Membungkus tabel log modal agar aman di-scroll ke samping jika data log di HP kepanjangan */}
                            <div className="table-responsive">
                                <Table bordered hover size="sm" className="m-0 small shadow-sm text-nowrap">
                                    <thead className="table-dark text-white">
                                        <tr><th>Waktu</th><th>Tindakan</th><th>Qty</th><th>PIC</th><th>Catatan</th></tr>
                                    </thead>
                                    <tbody style={{ fontSize: '12px' }}>
                                        {detailItem.logs?.length > 0 ? detailItem.logs.map((log) => (
                                            <tr key={log.id}>
                                                <td>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                                                <td><Badge bg={log.action_type === 'REPAIR' ? 'success' : 'danger'}>{log.action_type}</Badge></td>
                                                <td className="fw-bold">{log.qty}</td>
                                                <td>👨‍🔧 {log.pic}</td>
                                                <td className="text-wrap">"{log.note || '-'}"</td>
                                            </tr>
                                        )) : <tr><td colSpan="5" className="text-center py-3 text-muted">Belum ada catatan aktivitas.</td></tr>}
                                    </tbody>
                                </Table>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" className="py-1.5 small" onClick={() => setShowDetail(false)}>Tutup Detail</Button></Modal.Footer>
            </Modal>
        </div>
    );
};

export default NGHandling;