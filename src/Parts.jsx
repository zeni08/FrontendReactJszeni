import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Badge, FormControl, Navbar, Offcanvas, Row, Col, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Barcode from 'react-barcode';
import { Html5QrcodeScanner } from 'html5-qrcode'; // TAMBAHAN: Import library scanner kamera

const Parts = () => {
    const navigate = useNavigate();
    
    // AMBIL ROLE DARI LOCAL STORAGE
    const userRole = localStorage.getItem('role');
    const role = userRole ? userRole.toLowerCase() : '';

    // STATE UI RESPONSIVE
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // STATE DATA UTAMA
    const [parts, setParts] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [search, setSearch] = useState('');
    
    // STATE MODAL INPUT/EDIT
    const [show, setShow] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({ part_name: '', part_number: '', vendor: '', min_stock: 10, current_stock: 0 });

    // STATE MODAL INTERAKTIF
    const [showPartDetail, setShowPartDetail] = useState(false);
    const [selectedPart, setSelectedPart] = useState(null);

    const [showVendorDetail, setShowVendorDetail] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState(null);

    const [showHistory, setShowHistory] = useState(false);
    const [stockHistory, setStockHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // STATE MODAL KONFIRMASI HAPUS
    const [deleteModal, setDeleteModal] = useState({ show: false, item: null });

    // --- TAMBAHAN: STATE SCANNER KAMERA DI FORM PART ---
    const [isPartCameraOpen, setIsPartCameraOpen] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const resParts = await axios.get('https://zeni08.pythonanywhere.com/api/parts/');
            const resVendors = await axios.get('https://zeni08.pythonanywhere.com/api/vendors/');
            setParts(Array.isArray(resParts.data) ? resParts.data : []);
            setVendors(Array.isArray(resVendors.data) ? resVendors.data : []);
        } catch (error) { setParts([]); setVendors([]); }
    };

    // --- TAMBAHAN: LOGIKA LIFECYCLE KAMERA SCANNER PART ---
    useEffect(() => {
        let scanner = null;
        if (isPartCameraOpen) {
            scanner = new Html5QrcodeScanner(
                "part-reader", 
                { 
                    fps: 10, 
                    qrbox: { width: 250, height: 150 }, 
                    supportedScanTypes: [] 
                }, 
                false
            );

            scanner.render(
                (decodedText) => {
                    setFormData(prev => ({ ...prev, part_number: decodedText }));
                    setIsPartCameraOpen(false); // Tutup kamera otomatis setelah sukses scan
                    scanner.clear();
                },
                (error) => {
                    // Abaikan error saat kamera mencari fokus
                }
            );
        }

        return () => {
            if (scanner) {
                scanner.clear().catch(console.error);
            }
        };
    }, [isPartCameraOpen]);

    // --- KLIK PART (MUNCUL BARCODE) ---
    const handlePartClick = (item) => {
        setSelectedPart(item);
        setShowPartDetail(true);
    };

    // --- KLIK VENDOR (MUNCUL PROFILE) ---
    const handleVendorClick = (vendorId) => {
        const vendor = vendors.find(v => v.id === vendorId);
        if (vendor) {
            setSelectedVendor(vendor);
            setShowVendorDetail(true);
        }
    };

    // --- KLIK STOK (MUNCUL HISTORY) ---
    const handleStockClick = async (partId, partName) => {
        setLoadingHistory(true);
        setShowHistory(true);
        setSelectedPart({ ...selectedPart, part_name: partName }); 
        
        try {
            const resIn = await axios.get('https://zeni08.pythonanywhere.com/api/inspections/');
            const dataIn = resIn.data
                .filter(i => i.part_name === partName && i.final_judgement === 'OK')
                .map(i => ({
                    date: i.schedule_date,
                    time: i.inspection_time || '00:00',
                    type: 'IN',
                    qty: i.qty_ok,
                    desc: 'QC Passed',
                    user: i.inspector_name
                }));

            const resOut = await axios.get('https://zeni08.pythonanywhere.com/api/production/');
            const dataOut = resOut.data
                .filter(i => i.part === partId || i.part_name === partName)
                .map(i => ({
                    date: i.request_date,
                    time: i.request_time || '00:00',
                    type: 'OUT',
                    qty: i.qty_request,
                    desc: `To: ${i.line_name}`,
                    user: i.pic
                }));

            const combined = [...dataIn, ...dataOut].sort((a, b) => {
                return new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time);
            });

            setStockHistory(combined);
        } catch (error) {
            console.error(error);
            setStockHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleWA = (contact, name) => {
        if (!contact) return alert("Nomor kosong!");
        let phone = contact.replace(/\D/g, '');
        if (phone.startsWith('0')) phone = '62' + phone.substring(1);
        window.open(`https://wa.me/${phone}`, '_blank');
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editId) await axios.put(`https://zeni08.pythonanywhere.com/api/parts/${editId}/`, formData);
            else await axios.post('https://zeni08.pythonanywhere.com/api/parts/', formData);
            fetchData(); handleClose();
        } catch (error) { alert("Gagal menyimpan part."); }
    };
    
    const confirmDelete = async () => {
        const { item } = deleteModal;
        if (item) {
            try { 
                await axios.delete(`https://zeni08.pythonanywhere.com/api/parts/${item.id}/`); 
                setDeleteModal({ show: false, item: null }); 
                fetchData(); 
            } 
            catch (error) { 
                alert("Gagal hapus part."); 
                setDeleteModal({ show: false, item: null });
            }
        }
    };
    
    const handleEdit = (item) => {
        setEditId(item.id);
        setFormData({ part_name: item.part_name, part_number: item.part_number, vendor: item.vendor, min_stock: item.min_stock, current_stock: item.current_stock });
        setShow(true);
    };
    
    const handleClose = () => { 
        setShow(false); 
        setIsPartCameraOpen(false); // Pastikan kamera tertutup saat modal ditutup
        setEditId(null); 
        setFormData({ part_name: '', part_number: '', vendor: '', min_stock: 10, current_stock: 0 }); 
    };

    const handleLogout = () => { localStorage.clear(); navigate('/'); };
    const filteredParts = parts.filter(p => (p.part_name || "").toLowerCase().includes(search.toLowerCase()) || (p.part_number || "").includes(search));

    // --- LOGIC HAK AKSES ---
    const canAdd = role === 'manager' || role === 'admin';
    const canEditDelete = role === 'manager';

    // KOMPONEN SIDEBAR DINAMIS
    const SidebarContent = () => (
        <div className="p-3">
            <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/dashboard'); setShowMobileMenu(false); }}>📊 Dashboard</Button>
            {(role === 'manager' || role === 'admin') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/vendors'); setShowMobileMenu(false); }}>🏢 Vendor Data</Button>
            )}
            {(role === 'manager' || role === 'admin') && (
                <Button variant="primary" className="w-100 text-start mb-2 fw-bold">⚙️ Part Data</Button>
            )}
            {(role === 'manager' || role === 'admin' || role === 'hintan') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/schedule'); setShowMobileMenu(false); }}>📅 Receiving Schedule</Button>
            )}
            {(role === 'manager' || role === 'hintan') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/qc-report'); setShowMobileMenu(false); }}>📑 QC Report</Button>
            )}
            {(role === 'manager' || role === 'hintan') && (
                <Button variant="light" className="w-100 text-start mb-2" onClick={() => { navigate('/ng-handling'); setShowMobileMenu(false); }}>🔧 Pengelolaan NG</Button>
            )}
            {(role === 'manager' || role === 'foreman' || role === 'admin') && (
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
            
            {/* SIDEBAR VIEW LAPTOP */}
            <div className="desktop-sidebar bg-white border-end" style={{ width: '250px', minHeight: '100vh', position: 'fixed', zIndex: 1000 }}>
                <div className="p-4 text-center border-bottom"><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '120px' }} /></div>
                <SidebarContent />
            </div>

            {/* NAVBAR HEADER MOBILE SCREEN */}
            <Navbar bg="white" expand={false} fixed="top" className="mobile-header border-bottom shadow-sm px-3" style={{ display: 'none' }}>
                <Button variant="outline-dark" size="sm" onClick={() => setShowMobileMenu(true)}>☰ Menu</Button>
                <Navbar.Brand className="ms-2 fw-bold text-primary fs-6">Part Data Master</Navbar.Brand>
            </Navbar>

            {/* DRAWER MENU OFF-CANVAS MOBILE */}
            <Offcanvas show={showMobileMenu} onHide={() => setShowMobileMenu(false)} style={{ width: '280px' }}>
                <Offcanvas.Header closeButton><Offcanvas.Title><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '100px' }} /></Offcanvas.Title></Offcanvas.Header>
                <Offcanvas.Body className="p-0"><SidebarContent /></Offcanvas.Body>
            </Offcanvas>

            {/* ISI UTAMA HALAMAN */}
            <div className="main-content p-3 p-md-4 flex-grow-1">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 mb-md-4 gap-2">
                    <h3 className="fw-bold text-dark mb-0 fs-4 fs-md-3">Data Barang / Parts</h3>
                    {canAdd && (
                        <Button variant="primary" className="fw-bold" style={{ backgroundColor: '#003399' }} onClick={() => setShow(true)}>+ Tambah Part Baru</Button>
                    )}
                </div>

                <Card className="border-0 shadow-sm p-3 mb-3">
                    <InputGroup>
                        <InputGroup.Text className="bg-white">🔍</InputGroup.Text>
                        <FormControl type="text" placeholder="Cari nama part atau nomor part..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </InputGroup>
                </Card>

                <Card className="border-0 shadow-sm overflow-hidden">
                    
                    {/* 🖥️ VIEW DESKTOP: Tabel Horizontal Panjang Standar */}
                    <div className="table-responsive d-none d-md-block">
                        <Table hover striped className="m-0 align-middle">
                            <thead className="bg-light text-secondary small text-nowrap">
                                <tr><th>No</th><th>Part Number</th><th>Nama Part</th><th>Vendor</th><th>Stok Saat Ini</th><th>Min. Stok</th><th>Status</th><th>Aksi</th></tr>
                            </thead>
                            <tbody className="small">
                                {filteredParts.length > 0 ? filteredParts.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{index + 1}</td>
                                        <td>
                                            <Badge bg="secondary" style={{ cursor: 'pointer' }} onClick={() => handlePartClick(item)}>
                                                {item.part_number} 🔍
                                            </Badge>
                                        </td>
                                        <td>
                                            <span className="fw-bold text-primary" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handlePartClick(item)}>
                                                {item.part_name}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="fw-bold" style={{ cursor: 'pointer', color: '#003399' }} onClick={() => handleVendorClick(item.vendor)}>
                                                {item.vendor_name || 'Unknown'} 👤
                                            </span>
                                        </td>
                                        <td>
                                            <Button 
                                                variant={item.current_stock <= item.min_stock ? 'outline-danger' : 'outline-success'} 
                                                size="sm" 
                                                className="fw-bold"
                                                onClick={() => handleStockClick(item.id, item.part_name)}
                                            >
                                                {item.current_stock} 📊
                                            </Button>
                                        </td>
                                        <td>{item.min_stock}</td>
                                        <td>{item.current_stock <= item.min_stock ? <Badge bg="danger">LOW STOCK</Badge> : <Badge bg="success">AMAN</Badge>}</td>
                                        <td>
                                            {canEditDelete && (
                                                <div className="d-flex gap-1">
                                                    <Button size="sm" variant="outline-primary" onClick={() => handleEdit(item)}>Edit</Button>
                                                    <Button size="sm" variant="outline-danger" onClick={() => setDeleteModal({ show: true, item })}>Hapus</Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="8" className="text-center py-5 text-muted">Belum ada data part.</td></tr>}
                            </tbody>
                        </Table>
                    </div>

                    {/* 📱 VIEW HP: Berubah Menjadi Desain List Card Mewah */}
                    <div className="d-block d-md-none">
                        {filteredParts.length === 0 ? (
                            <div className="p-4 text-center text-muted small">Belum ada data part.</div>
                        ) : (
                            filteredParts.map((item, index) => (
                                <div key={item.id} className="p-3 border-bottom bg-white position-relative">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div>
                                            <span className="text-muted small fw-bold">#{index + 1} </span>
                                            <Badge bg="secondary" className="font-mono" style={{ cursor: 'pointer' }} onClick={() => handlePartClick(item)}>
                                                {item.part_number} 🔍
                                            </Badge>
                                        </div>
                                        {item.current_stock <= item.min_stock ? (
                                            <Badge bg="danger" pill>LOW STOCK ⚠️</Badge>
                                        ) : (
                                            <Badge bg="success" pill>AMAN ✅</Badge>
                                        )}
                                    </div>

                                    <div className="bg-light p-2 rounded mb-2">
                                        <h6 className="fw-bold text-primary mb-1" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handlePartClick(item)}>
                                            {item.part_name}
                                        </h6>
                                        <div className="small text-muted" style={{ cursor: 'pointer' }} onClick={() => handleVendorClick(item.vendor)}>
                                            🏭 Vendor: <span className="text-dark fw-bold">{item.vendor_name || 'Unknown'} 👤</span>
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center mt-2">
                                        <div className="small text-muted">
                                            Min: <strong className="text-dark">{item.min_stock}</strong> | 
                                            Stok: <Button 
                                                    variant={item.current_stock <= item.min_stock ? 'danger' : 'success'} 
                                                    size="sm" 
                                                    className="py-0 px-2 ms-1 fw-bold text-white small"
                                                    onClick={() => handleStockClick(item.id, item.part_name)}
                                                  >
                                                     {item.current_stock} 📊 Kartu Stok
                                                  </Button>
                                        </div>
                                        {canEditDelete && (
                                            <div className="d-flex gap-1">
                                                <Button size="sm" variant="outline-primary" className="py-0 px-2" onClick={() => handleEdit(item)}>✏️</Button>
                                                <Button size="sm" variant="outline-danger" className="py-0 px-2" onClick={() => setDeleteModal({ show: true, item })}>🗑️</Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* MODAL 1: INPUT/EDIT RESPONSIVE FORM DENGAN KAMERA SCANNER */}
            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton><Modal.Title className="fs-6 fw-bold">{editId ? '⚙️ Edit Data Part' : '⚙️ Tambah Part Baru'}</Modal.Title></Modal.Header>
                <Form onSubmit={handleSave}>
                    <Modal.Body className="small">
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Nama Part</Form.Label>
                            <Form.Control required type="text" value={formData.part_name} onChange={e => setFormData({...formData, part_name: e.target.value})} />
                        </Form.Group>

                        {/* --- TAMBAHAN: TOMBOL DAN SCANNER KAMERA UNTUK PART NUMBER --- */}
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Part Number (Barcode)</Form.Label>
                            <div className="d-flex gap-2">
                                <Form.Control 
                                    required 
                                    type="text" 
                                    value={formData.part_number} 
                                    onChange={e => setFormData({...formData, part_number: e.target.value})} 
                                    placeholder="Scan atau ketik part number..."
                                />
                                <Button 
                                    type="button"
                                    variant={isPartCameraOpen ? "danger" : "primary"} 
                                    className="fw-bold text-nowrap"
                                    onClick={() => setIsPartCameraOpen(!isPartCameraOpen)}
                                >
                                    {isPartCameraOpen ? "Tutup 📷" : "Buka 📷"}
                                </Button>
                            </div>
                            {isPartCameraOpen && (
                                <div className="mt-3 text-center">
                                    <div id="part-reader" className="w-100 overflow-hidden rounded border"></div>
                                    <p className="text-muted small mt-2 mb-0">Arahkan kamera ke barcode part number...</p>
                                </div>
                            )}
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Vendor Supplier</Form.Label>
                            <Form.Select required value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})}>
                                <option value="">-- Pilih Vendor --</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </Form.Select>
                        </Form.Group>
                        
                        <Row className="g-2">
                            <Col xs={12} sm={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-danger">Min. Stock Alert</Form.Label>
                                    <Form.Control type="number" value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-primary">Initial Stock</Form.Label>
                                    <Form.Control type="number" value={formData.current_stock} onChange={e => setFormData({...formData, current_stock: e.target.value})} />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" size="sm" onClick={handleClose}>Batal</Button>
                        <Button variant="primary" size="sm" type="submit">Simpan Data</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* MODAL 2: PART IDENTITY (BARCODE FLUID) */}
            <Modal show={showPartDetail} onHide={() => setShowPartDetail(false)} centered>
                <Modal.Body className="text-center p-4">
                    {selectedPart && (
                        <>
                            <h5 className="fw-bold mb-3">🏷️ Part Identity Card</h5>
                            <div className="border p-2 rounded bg-white d-inline-block mb-3 max-w-100 overflow-auto">
                                <Barcode value={selectedPart.part_number} width={1.8} height={50} fontSize={14} />
                            </div>
                            <h4 className="text-primary fw-bold fs-5">{selectedPart.part_name}</h4>
                            <p className="text-muted small mb-0">Vendor: {selectedPart.vendor_name}</p>
                            <div className="mt-3">
                                <Badge bg="dark" className="me-2 p-2">Min Stock: {selectedPart.min_stock}</Badge>
                                <Badge bg={selectedPart.current_stock <= selectedPart.min_stock ? 'danger' : 'success'} className="p-2">
                                    Stock: {selectedPart.current_stock} Pcs
                                </Badge>
                            </div>
                            <Button variant="secondary" size="sm" className="mt-4 w-100" onClick={() => setShowPartDetail(false)}>Tutup</Button>
                        </>
                    )}
                </Modal.Body>
            </Modal>

            {/* MODAL 3: VENDOR PROFILE */}
            <Modal show={showVendorDetail} onHide={() => setShowVendorDetail(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white py-2 px-3"><Modal.Title className="fs-6">🏢 Profil Vendor</Modal.Title></Modal.Header>
                <Modal.Body className="small">
                    {selectedVendor && (
                        <div className="text-center">
                            <h4 className="fw-bold text-dark fs-5 mb-1">{selectedVendor.name}</h4>
                            <p className="text-muted small mb-3">{selectedVendor.email || 'Email tidak tersedia'}</p>
                            <Card className="text-start bg-light border-0"><Card.Body className="p-3">
                                <div className="mb-2"><strong>📍 Alamat Pabrik:</strong> <br/> {selectedVendor.address || '-'}</div>
                                <div className="mb-0"><strong>📞 No Contact Resmi:</strong> <br/> {selectedVendor.contact || '-'}</div>
                            </Card.Body></Card>
                            <div className="mt-3 d-grid gap-2">
                                <Button variant="success" className="fw-bold py-2 btn-sm" onClick={() => handleWA(selectedVendor.contact, selectedVendor.name)}>💬 Hubungi via WhatsApp</Button>
                                <Button variant="secondary" className="btn-sm" onClick={() => setShowVendorDetail(false)}>Tutup</Button>
                            </div>
                        </div>
                    )}
                </Modal.Body>
            </Modal>

            {/* MODAL 4: STOCK HISTORY LOG (KARTU STOK FULL RESPONSIVE) */}
            <Modal show={showHistory} onHide={() => setShowHistory(false)} size="lg" centered>
                <Modal.Header closeButton className="bg-success text-white py-2 px-3">
                    <Modal.Title className="fs-6">📊 Kartu Stok: {selectedPart?.part_name}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-2" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {loadingHistory ? <div className="text-center py-4 small">Memuat Log Transaksi Gudang...</div> : (
                        <div className="table-responsive">
                            <Table striped bordered hover className="m-0 text-center small text-nowrap">
                                <thead className="table-light sticky-top">
                                    <tr><th>Tanggal / Jam</th><th>Tipe Flow</th><th>Keterangan Line</th><th>Qty Log</th><th>PIC</th></tr>
                                </thead>
                                <tbody style={{ fontSize: '12px' }}>
                                    {stockHistory.length > 0 ? stockHistory.map((log, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{log.date}</strong><br/><small className="text-muted">🕒 {log.time?.substring(0,5)}</small></td>
                                            <td>{log.type === 'IN' ? <Badge bg="success" pill>MASUK 📥</Badge> : <Badge bg="danger" pill>KELUAR 📤</Badge>}</td>
                                            <td className="text-start text-wrap">{log.desc}</td>
                                            <td className={`fw-bold fs-6 ${log.type === 'IN' ? 'text-success' : 'text-danger'}`}>{log.type === 'IN' ? '+' : '-'}{log.qty}</td>
                                            <td><small className="bg-light p-1 rounded">👤 {log.user}</small></td>
                                        </tr>
                                    )) : <tr><td colSpan="5" className="py-4 text-muted italic">Belum ada riwayat mutasi masuk/keluar untuk part ini.</td></tr>}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="py-1 px-2"><Button variant="secondary" size="sm" onClick={() => setShowHistory(false)}>Tutup Kartu Stok</Button></Modal.Footer>
            </Modal>

            {/* MODAL KONFIRMASI HAPUS PART GG WP */}
            <Modal show={deleteModal.show} onHide={() => setDeleteModal({ show: false, item: null })} centered>
                <Modal.Header className="bg-danger text-white border-0">
                    <Modal.Title className="fs-5 fw-bold w-100 text-center">
                        ⚠️ Peringatan Keras!
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center py-4 px-4">
                    <h5 className="fw-bold mb-3 text-dark">
                        Yakin ingin menghapus Part ini?
                    </h5>
                    <p className="text-danger fw-bold small mb-4 bg-danger bg-opacity-10 p-2 rounded">
                        Tindakan ini akan menghilangkan seluruh stok part ini dari gudang secara permanen.
                    </p>
                    
                    {deleteModal.item && (
                        <div className="bg-light p-3 rounded border text-start shadow-sm mx-auto mb-2" style={{ maxWidth: '400px' }}>
                            <div className="mb-2"><small className="text-muted">Part Name:</small><br/><strong className="fs-6 text-dark">{deleteModal.item.part_name}</strong></div>
                            <div className="mb-2"><small className="text-muted">Part Number:</small><br/><strong className="text-dark font-mono">{deleteModal.item.part_number}</strong></div>
                            <div className="mb-0">
                                <small className="text-muted">Stok Hangus:</small><br/>
                                <Badge bg="danger" className="fs-6 mt-1">{deleteModal.item.current_stock} Pcs</Badge>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="justify-content-center border-0 pb-4 pt-0 gap-2">
                    <Button variant="outline-secondary" className="px-4 fw-bold rounded-pill" onClick={() => setDeleteModal({ show: false, item: null })}>
                        Batal
                    </Button>
                    <Button variant="danger" className="px-4 fw-bold rounded-pill shadow-sm" onClick={confirmDelete}>
                        Ya, Hapus & Hanguskan Stok!
                    </Button>
                </Modal.Footer>
            </Modal>

        </div>
    );
};
export default Parts;