import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Badge, FormControl, Nav, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Barcode from 'react-barcode';

const Parts = () => {
    const navigate = useNavigate();
    
    // AMBIL ROLE DARI LOCAL STORAGE
    const userRole = localStorage.getItem('role');
    const role = userRole ? userRole.toLowerCase() : '';

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

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const resParts = await axios.get('https://zeni08.pythonanywhere.com/api/parts/');
            const resVendors = await axios.get('https://zeni08.pythonanywhere.com/api/vendors/');
            setParts(Array.isArray(resParts.data) ? resParts.data : []);
            setVendors(Array.isArray(resVendors.data) ? resVendors.data : []);
        } catch (error) { setParts([]); setVendors([]); }
    };

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
    
    const handleDelete = async (id) => {
        if (window.confirm("Hapus Part ini? Stok akan hilang.")) {
            try { await axios.delete(`https://zeni08.pythonanywhere.com/api/parts/${id}/`); fetchData(); } catch (error) { alert("Gagal hapus part."); }
        }
    };
    
    const handleEdit = (item) => {
        setEditId(item.id);
        setFormData({ part_name: item.part_name, part_number: item.part_number, vendor: item.vendor, min_stock: item.min_stock, current_stock: item.current_stock });
        setShow(true);
    };
    
    const handleClose = () => { setShow(false); setEditId(null); setFormData({ part_name: '', part_number: '', vendor: '', min_stock: 10, current_stock: 0 }); };
    const handleLogout = () => { localStorage.clear(); navigate('/'); };
    const filteredParts = parts.filter(p => (p.part_name || "").toLowerCase().includes(search.toLowerCase()) || (p.part_number || "").includes(search));

    // --- LOGIC HAK AKSES ---
    // 1. Tambah: Manager & Admin Boleh
    const canAdd = role === 'manager' || role === 'admin';
    
    // 2. Edit/Hapus: HANYA MANAGER
    const canEditDelete = role === 'manager';

    return (
        <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f4f6f9' }}>
            
            {/* SIDEBAR */}
            <div className="bg-white border-end" style={{ width: '250px', minHeight: '100vh', position: 'fixed', zIndex: 1000 }}>
                <div className="p-4 text-center border-bottom"><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '120px' }} /></div>
                <div className="p-3">
                    {/* DASHBOARD: Foreman tidak perlu lihat */}
                    <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/dashboard')}>📊 Dashboard</Button>
                    {(role === 'manager' || role === 'admin') && (
                        <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/vendors')}>🏢 Vendor Data</Button>
                    )}
                    {(role === 'manager' || role === 'admin') && (
                        <Button variant="primary" className="w-100 text-start mb-2 fw-bold">⚙️ Part Data</Button>
                    )}
                    {(role === 'manager' || role === 'admin' || role === 'hintan') && (
                        <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/schedule')}>📅 Receiving Schedule</Button>
                    )}
                    {(role === 'manager' || role === 'hintan') && (
                        <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/qc-report')}>📑 QC Report</Button>
                    )}
                    {(role === 'manager' || role === 'hintan') && (
                        <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/ng-handling')}>🔧 Pengelolaan NG</Button>
                    )}
                    {(role === 'manager' || role === 'foreman' || role === 'admin') && (
                        <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/production')}>🏭 Production Request</Button>
                    )}
                    {role === 'manager' && (<Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/recycle-bin'); setShowMobileMenu(false);}}>♻️ Recycle Bin</Button>)}
                    <Button variant="danger" className="w-100 mt-4" onClick={handleLogout}>🚪 Logout</Button>
                </div>
            </div>

            {/* KONTEN UTAMA */}
            <div className="flex-grow-1 p-4" style={{ marginLeft: '250px' }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3 className="fw-bold text-dark">Data Barang / Parts</h3>
                    
                    {/* TOMBOL TAMBAH: Admin & Manager BISA */}
                    {canAdd && (
                        <Button variant="primary" style={{ backgroundColor: '#003399' }} onClick={() => setShow(true)}>+ Tambah Part Baru</Button>
                    )}
                </div>

                <Card className="border-0 shadow-sm p-3">
                    <div className="mb-3"><FormControl type="text" placeholder="Cari nama part atau nomor part..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                    <Table hover responsive striped className="align-middle">
                        <thead className="bg-light"><tr><th>No</th><th>Part Number</th><th>Nama Part</th><th>Vendor</th><th>Stok Saat Ini</th><th>Min. Stok</th><th>Status</th><th>Aksi</th></tr></thead>
                        <tbody>
                            {filteredParts.length > 0 ? filteredParts.map((item, index) => (
                                <tr key={item.id}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <Badge bg="secondary" style={{cursor: 'pointer'}} onClick={() => handlePartClick(item)}>
                                            {item.part_number} 🔍
                                        </Badge>
                                    </td>
                                    <td>
                                        <span className="fw-bold text-primary" style={{cursor: 'pointer', textDecoration: 'underline'}} onClick={() => handlePartClick(item)}>
                                            {item.part_name}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{cursor: 'pointer', color: '#003399'}} onClick={() => handleVendorClick(item.vendor)}>
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
                                        {/* TOMBOL EDIT/HAPUS: HANYA MANAGER */}
                                        {canEditDelete && (
                                            <>
                                                <Button size="sm" variant="outline-primary" className="me-2" onClick={() => handleEdit(item)}>Edit</Button>
                                                <Button size="sm" variant="outline-danger" onClick={() => handleDelete(item.id)}>Hapus</Button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            )) : <tr><td colSpan="8" className="text-center py-5 text-muted">Belum ada data part.</td></tr>}
                        </tbody>
                    </Table>
                </Card>
            </div>

            {/* MODAL 1: INPUT/EDIT */}
            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton><Modal.Title>{editId ? 'Edit Part' : 'Tambah Part Baru'}</Modal.Title></Modal.Header>
                <Form onSubmit={handleSave}>
                    <Modal.Body>
                        <Form.Group className="mb-3"><Form.Label>Nama Part</Form.Label><Form.Control required type="text" value={formData.part_name} onChange={e => setFormData({...formData, part_name: e.target.value})} /></Form.Group>
                        <Form.Group className="mb-3"><Form.Label>Part Number (Barcode)</Form.Label><Form.Control required type="text" value={formData.part_number} onChange={e => setFormData({...formData, part_number: e.target.value})} /></Form.Group>
                        <Form.Group className="mb-3"><Form.Label>Vendor Suplier</Form.Label><Form.Select required value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})}><option value="">-- Pilih Vendor --</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</Form.Select></Form.Group>
                        <div className="row">
                            <div className="col-6"><Form.Group className="mb-3"><Form.Label className="fw-bold text-danger">Min. Stock Alert</Form.Label><Form.Control type="number" value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: e.target.value})} /></Form.Group></div>
                            <div className="col-6"><Form.Group className="mb-3"><Form.Label className="fw-bold">Initial Stock</Form.Label><Form.Control type="number" value={formData.current_stock} onChange={e => setFormData({...formData, current_stock: e.target.value})} /></Form.Group></div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer><Button variant="secondary" onClick={handleClose}>Batal</Button><Button variant="primary" type="submit">Simpan</Button></Modal.Footer>
                </Form>
            </Modal>

            {/* MODAL 2: PART IDENTITY (BARCODE) */}
            <Modal show={showPartDetail} onHide={() => setShowPartDetail(false)} centered>
                <Modal.Body className="text-center p-4">
                    {selectedPart && (
                        <>
                            <h4 className="fw-bold mb-3">🏷️ Part Identity</h4>
                            <div className="border p-3 rounded bg-white d-inline-block mb-3">
                                <Barcode value={selectedPart.part_number} width={2} height={60} fontSize={16} />
                            </div>
                            <h3 className="text-primary fw-bold">{selectedPart.part_name}</h3>
                            <p className="text-muted mb-0">Vendor: {selectedPart.vendor_name}</p>
                            <div className="mt-3">
                                <Badge bg="dark" className="me-2">Min Stock: {selectedPart.min_stock}</Badge>
                                <Badge bg={selectedPart.current_stock <= selectedPart.min_stock ? 'danger' : 'success'}>
                                    Stock: {selectedPart.current_stock}
                                </Badge>
                            </div>
                            <Button variant="secondary" className="mt-4" onClick={() => setShowPartDetail(false)}>Tutup</Button>
                        </>
                    )}
                </Modal.Body>
            </Modal>

            {/* MODAL 3: VENDOR PROFILE */}
            <Modal show={showVendorDetail} onHide={() => setShowVendorDetail(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white"><Modal.Title>🏢 Profil Vendor</Modal.Title></Modal.Header>
                <Modal.Body>
                    {selectedVendor && (
                        <div className="text-center p-2">
                            <h3 className="fw-bold text-dark">{selectedVendor.name}</h3>
                            <p className="text-muted">{selectedVendor.email || 'Email tidak tersedia'}</p>
                            <Card className="text-start bg-light border-0 mt-3"><Card.Body>
                                <div className="mb-2"><strong>📍 Alamat:</strong> <br/> {selectedVendor.address || '-'}</div>
                                <div className="mb-2"><strong>📞 Kontak:</strong> <br/> {selectedVendor.contact || '-'}</div>
                            </Card.Body></Card>
                            <div className="mt-4 d-flex gap-2 justify-content-center">
                                <Button variant="success" onClick={() => handleWA(selectedVendor.contact, selectedVendor.name)}>💬 WhatsApp</Button>
                                <Button variant="secondary" onClick={() => setShowVendorDetail(false)}>Tutup</Button>
                            </div>
                        </div>
                    )}
                </Modal.Body>
            </Modal>

            {/* MODAL 4: STOCK HISTORY LOG */}
            <Modal show={showHistory} onHide={() => setShowHistory(false)} size="lg" centered>
                <Modal.Header closeButton className="bg-success text-white">
                    <Modal.Title>📊 Kartu Stok: {selectedPart?.part_name}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{maxHeight: '60vh', overflowY: 'auto'}}>
                    {loadingHistory ? <div className="text-center py-4">Memuat data...</div> : (
                        <Table striped bordered hover responsive className="m-0 text-center">
                            <thead className="bg-light sticky-top">
                                <tr><th>Tanggal</th><th>Tipe</th><th>Keterangan</th><th>Qty</th><th>PIC</th></tr>
                            </thead>
                            <tbody>
                                {stockHistory.length > 0 ? stockHistory.map((log, idx) => (
                                    <tr key={idx}>
                                        <td>{log.date}<br/><small className="text-muted">{log.time}</small></td>
                                        <td>{log.type === 'IN' ? <Badge bg="success">MASUK 📥</Badge> : <Badge bg="danger">KELUAR 📤</Badge>}</td>
                                        <td className="text-start">{log.desc}</td>
                                        <td className={`fw-bold ${log.type === 'IN' ? 'text-success' : 'text-danger'}`}>{log.type === 'IN' ? '+' : '-'}{log.qty}</td>
                                        <td><small>{log.user}</small></td>
                                    </tr>
                                )) : <tr><td colSpan="5" className="py-4 text-muted">Belum ada riwayat transaksi.</td></tr>}
                            </tbody>
                        </Table>
                    )}
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowHistory(false)}>Tutup</Button></Modal.Footer>
            </Modal>

        </div>
    );
};
export default Parts;