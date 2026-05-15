import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Modal, Form, Row, Col, Image, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const NGHandling = () => {
    const navigate = useNavigate();
    // Mengambil role dari localStorage hasil login
    const userRole = localStorage.getItem('role') || 'Staff';
    const role = userRole.toUpperCase();

    const [ngList, setNgList] = useState([]); 
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); 

    const [showAction, setShowAction] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [actionType, setActionType] = useState('');
    const [qtyHandle, setQtyHandle] = useState(0);
    const [remarks, setRemarks] = useState('');
    const [photoFile, setPhotoFile] = useState(null);

    const [showDetail, setShowDetail] = useState(false);
    const [detailItem, setDetailItem] = useState(null);

    useEffect(() => { fetchNGData(); }, []);

    const fetchNGData = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/inspections/');
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
            await axios.post(`http://127.0.0.1:8000/api/inspections/${selectedItem.id}/resolve_ng/`, formData, {
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
        
        const baseUrl = "http://127.0.0.1:8000";
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}?t=${new Date().getTime()}`;
    };

    // KOMPONEN SIDEBAR DINAMIS (FIX URUTAN & ROLE)
    const SidebarContent = () => (
        <div className="p-3">
            {/* 1. DASHBOARD: Manager, Admin, Hintan */}
            {(role === 'MANAGER' || role === 'ADMIN' || role === 'HINTAN') && (
                <Button 
                    variant={window.location.pathname === '/dashboard' ? 'primary' : 'light'} 
                    className="w-100 text-start mb-2" 
                    onClick={() => navigate('/dashboard')}
                >
                    📊 Dashboard
                </Button>
            )}
            {(role === 'MANAGER' || role === 'ADMIN') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/vendors')}>🏢 Vendor Data</Button>
            )}
            {(role === 'MANAGER' || role === 'ADMIN') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/parts')}>⚙️ Part Data</Button>
            )}
            {(role === 'MANAGER' || role === 'ADMIN' || role === 'HINTAN') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/schedule')}>📅 Receiving Schedule</Button>
            )}
            {(role === 'MANAGER' || role === 'HINTAN') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/qc-report')}>📑 QC Report</Button>
            )}
            {role !== 'FOREMAN' && (<Button variant="primary" className="w-100 text-start mb-2 fw-bold">🔧 Pengelolaan NG</Button>)}
            {(role === 'MANAGER' || role === 'FOREMAN') && (<Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/production')}>🏭 Production Request</Button>)}
            {role === 'MANAGER' && (<Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/recycle-bin'); setShowMobileMenu(false);}}>♻️ Recycle Bin</Button>)}
            <Button variant="danger" className="w-100 mt-4" onClick={() => {localStorage.clear(); navigate('/');}}>🚪 Logout</Button>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f9' }}>
            <style>{`@media (max-width: 768px) { .desktop-sidebar { display: none !important; } .mobile-header { display: block !important; } .main-content { margin-left: 0 !important; margin-top: 60px; } } @media (min-width: 769px) { .desktop-sidebar { display: block !important; } .mobile-header { display: none !important; } .main-content { margin-left: 250px !important; margin-top: 0; } }`}</style>
            
            <div className="desktop-sidebar bg-white border-end" style={{ width: '250px', minHeight: '100vh', position: 'fixed', zIndex: 1000 }}>
                <div className="p-4 text-center border-bottom"><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '120px' }} /></div>
                <SidebarContent />
            </div>

            <div className="main-content p-4" style={{marginLeft: '250px'}}>
                <h3 className="fw-bold mb-4">Pengelolaan Barang NG</h3>
                
                <Card className="border-0 shadow-sm p-3 mb-4">
                    <Row className="g-2">
                        <Col md={6}><InputGroup><InputGroup.Text className="bg-white">🔍</InputGroup.Text><Form.Control type="text" placeholder="Cari Lot/Part..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/></InputGroup></Col>
                        <Col md={4}><Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="ALL">Semua Status</option><option value="PENDING">⚠️ Pending</option><option value="HANDLED">✅ Selesai</option></Form.Select></Col>
                    </Row>
                </Card>

                <Card className="border-0 shadow-sm overflow-hidden">
                    <Table hover striped className="m-0 align-middle">
                        <thead className="bg-dark text-white">
                            <tr><th>Lot Number</th><th>Part Information</th><th>Qty NG</th><th>Action</th><th>Log</th></tr>
                        </thead>
                        <tbody>
                            {filteredList.map((item) => (
                                <tr key={item.id}>
                                    <td><Badge bg="dark" className="p-2">{item.lot_number}</Badge></td>
                                    <td><strong>{item.part_name}</strong><br/><small className="text-muted">{item.vendor_name}</small></td>
                                    <td className="text-danger fw-bold">{item.qty_ng} Pcs</td>
                                    <td>{item.qty_ng > 0 ? <Button size="sm" variant="danger" onClick={() => handleActionClick(item)}>Proses</Button> : <Badge bg="success">Selesai</Badge>}</td>
                                    <td><Button size="sm" variant="outline-info" onClick={() => handleHistoryClick(item)}>📜 Detail</Button></td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card>
            </div>

            {/* Modal Input Tindakan */}
            <Modal show={showAction} onHide={() => setShowAction(false)} centered>
                <Modal.Header closeButton className="bg-danger text-white"><Modal.Title>⚙️ Tindakan Perbaikan</Modal.Title></Modal.Header>
                <Modal.Body>
                    <div className="d-flex gap-2 mb-3">
                        <Button variant={actionType === 'REPAIR' ? 'primary' : 'outline-primary'} className="w-50" onClick={() => setActionType('REPAIR')}>🛠️ Repair</Button>
                        <Button variant={actionType === 'RETURN' ? 'danger' : 'outline-danger'} className="w-50" onClick={() => setActionType('RETURN')}>🚚 Return</Button>
                    </div>
                    <Form.Group className="mb-3"><Form.Label>Jumlah Qty yang ditangani:</Form.Label><Form.Control type="number" value={qtyHandle} onChange={(e) => setQtyHandle(e.target.value)}/></Form.Group>
                    <Form.Group className="mb-3"><Form.Label className="fw-bold text-primary">📸 Upload Foto Bukti:</Form.Label><Form.Control type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} /></Form.Group>
                    <Form.Group><Form.Label>Catatan Tambahan:</Form.Label><Form.Control as="textarea" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} /></Form.Group>
                </Modal.Body>
                <Modal.Footer><Button variant="success" className="w-100 fw-bold" onClick={submitAction}>Simpan & Update Stok</Button></Modal.Footer>
            </Modal>

            {/* Modal Detail Log & Foto */}
            <Modal show={showDetail} onHide={() => setShowDetail(false)} centered size="lg">
                <Modal.Header closeButton className="bg-info text-white"><Modal.Title>📜 Riwayat & Dokumentasi Fisik</Modal.Title></Modal.Header>
                <Modal.Body>
                    {detailItem && (
                        <div>
                            <div className="mb-4 text-center">
                                <h5 className="fw-bold">{detailItem.part_name}</h5>
                                <Badge bg="dark" className="mb-3">{detailItem.lot_number}</Badge>
                                <div className="p-3 bg-light border rounded shadow-sm mx-auto" style={{maxWidth: '500px'}}>
                                    <h6 className="text-primary fw-bold mb-2 small">📸 DOKUMENTASI VISUAL TERBARU</h6>
                                    {getFullImageUrl(detailItem) ? (
                                        <Image src={getFullImageUrl(detailItem)} fluid thumbnail style={{ maxHeight: '350px', objectFit: 'contain' }}
                                               onError={(e) => { e.target.src = "https://placehold.co/600x400?text=Gambar+Tidak+Ditemukan"; }} />
                                    ) : (
                                        <div className="py-5 text-muted small">Belum ada lampiran foto bukti.</div>
                                    )}
                                </div>
                            </div>
                            <h6 className="fw-bold text-muted small mt-4">DETAIL RIWAYAT AKTIVITAS:</h6>
                            <Table bordered hover responsive size="sm" className="small shadow-sm">
                                <thead className="table-dark">
                                    <tr><th>Waktu</th><th>Tindakan</th><th>Qty</th><th>PIC</th><th>Catatan</th></tr>
                                </thead>
                                <tbody>
                                    {detailItem.logs?.length > 0 ? detailItem.logs.map((log) => (
                                        <tr key={log.id}>
                                            <td>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                                            <td><Badge bg={log.action_type === 'REPAIR' ? 'success' : 'danger'}>{log.action_type}</Badge></td>
                                            <td className="fw-bold">{log.qty}</td>
                                            <td>👨‍🔧 {log.pic}</td>
                                            <td className="fst-italic">"{log.note || '-'}"</td>
                                        </tr>
                                    )) : <tr><td colSpan="5" className="text-center py-3">Belum ada catatan aktivitas.</td></tr>}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowDetail(false)}>Tutup Detail</Button></Modal.Footer>
            </Modal>
        </div>
    );
};

export default NGHandling;