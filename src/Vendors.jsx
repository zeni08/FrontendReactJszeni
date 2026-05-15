import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, FormControl, Row, Col, Badge, Navbar, Offcanvas, Container } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Vendors = () => {
    const navigate = useNavigate();
    
    // AMBIL ROLE DARI LOCAL STORAGE
    const userRole = localStorage.getItem('role');
    const role = userRole ? userRole.toLowerCase() : '';

    // STATE UI RESPONSIVE
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    const [vendors, setVendors] = useState([]);
    const [search, setSearch] = useState('');
    
    // STATE MODAL TAMBAH/EDIT
    const [show, setShow] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({ name: '', address: '', contact: '', email: '' });

    // STATE MODAL DETAIL
    const [showDetail, setShowDetail] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState(null);

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            const res = await axios.get('https://zeni08.pythonanywhere.com/api/vendors/');
            setVendors(Array.isArray(res.data) ? res.data : []);
        } catch (error) { setVendors([]); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editId) await axios.put(`https://zeni08.pythonanywhere.com/api/vendors/${editId}/`, formData);
            else await axios.post('https://zeni08.pythonanywhere.com/api/vendors/', formData);
            
            alert("✅ Data Vendor Berhasil Disimpan!");
            fetchVendors();
            handleClose();
        } catch (error) { 
            alert("⛔ Gagal! Server bilang: \n" + JSON.stringify(error.response?.data));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Yakin hapus vendor ini?")) {
            try { await axios.delete(`https://zeni08.pythonanywhere.com/api/vendors/${id}/`); fetchVendors(); }
            catch (error) { alert("Gagal hapus vendor."); }
        }
    };

    const handleEdit = (item) => {
        setEditId(item.id);
        setFormData({ name: item.name || '', address: item.address || '', contact: item.contact || '', email: item.email || '' });
        setShow(true);
    };

    const handleShowDetail = (item) => {
        setSelectedVendor(item);
        setShowDetail(true);
    };

    const handleWA = (contact, name) => {
        if (!contact) return alert("Nomor kosong!");
        let phone = contact.replace(/\D/g, '');
        if (phone.startsWith('0')) phone = '62' + phone.substring(1);
        const msg = `Halo ${name}, saya dari Suzuki. Ingin menanyakan perihal supply barang.`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleClose = () => { setShow(false); setEditId(null); setFormData({ name: '', address: '', contact: '', email: '' }); };
    const handleLogout = () => { localStorage.clear(); navigate('/'); };

    const filteredVendors = vendors.filter(v => (v.name || "").toLowerCase().includes(search.toLowerCase()));

    // HAK AKSES
    const canAdd = role === 'manager' || role === 'admin';
    const canEditDelete = role === 'manager';

    // --- SIDEBAR CONTENT (REUSABLE) ---
    const SidebarContent = () => (
        <div className="p-3">
            <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/dashboard')}>📊 Dashboard</Button>
            {(role === 'manager' || role === 'admin') && <Button variant="primary" className="w-100 text-start mb-2 fw-bold">🏢 Vendor Data</Button>}
            {(role === 'manager' || role === 'admin') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/parts')}>⚙️ Part Data</Button>}
            {(role === 'manager' || role === 'admin' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/schedule')}>📅 Receiving Schedule</Button>}
            {(role === 'manager' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/qc-report')}>📑 QC Report</Button>}
            {(role === 'manager' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/ng-handling')}>🔧 Pengelolaan NG</Button>}
            {(role === 'manager' || role === 'foreman' || role === 'admin') &&  <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/production')}>🏭 Production Request</Button>}
            {role === 'manager' && (<Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/recycle-bin'); setShowMobileMenu(false);}}>♻️ Recycle Bin</Button>)}
            <Button variant="danger" className="w-100 mt-4" onClick={handleLogout}>🚪 Logout</Button>
        </div>
    );

    const responsiveStyles = `
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
    `;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f9' }}>
            <style>{responsiveStyles}</style>

            {/* SIDEBAR DESKTOP */}
            <div className="desktop-sidebar bg-white border-end" style={{ width: '250px', minHeight: '100vh', position: 'fixed', zIndex: 1000 }}>
                <div className="p-4 text-center border-bottom"><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '120px' }} /></div>
                <SidebarContent />
            </div>

            {/* HEADER MOBILE */}
            <Navbar bg="white" expand={false} fixed="top" className="mobile-header border-bottom shadow-sm px-3">
                <Button variant="outline-dark" size="sm" onClick={() => setShowMobileMenu(true)}>☰ Menu</Button>
                <Navbar.Brand className="ms-2 fw-bold text-primary" style={{fontSize:'1rem'}}>Vendor Data</Navbar.Brand>
            </Navbar>

            {/* OFFCANVAS MOBILE */}
            <Offcanvas show={showMobileMenu} onHide={() => setShowMobileMenu(false)} style={{width: '280px'}}>
                <Offcanvas.Header closeButton><Offcanvas.Title><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '100px' }} /></Offcanvas.Title></Offcanvas.Header>
                <Offcanvas.Body className="p-0"><SidebarContent /></Offcanvas.Body>
            </Offcanvas>

            {/* KONTEN UTAMA */}
            <div className="main-content p-3 p-md-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                    <h3 className="fw-bold text-dark mb-0">Data Vendor / Supplier</h3>
                    {canAdd && (
                        <Button variant="primary" style={{ backgroundColor: '#003399' }} onClick={() => setShow(true)}>+ Tambah Vendor</Button>
                    )}
                </div>

                <Card className="border-0 shadow-sm p-3">
                    <div className="mb-3">
                        <FormControl type="text" placeholder="Cari nama vendor..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="table-responsive">
                        <Table hover striped className="align-middle">
                            <thead className="bg-light">
                                <tr><th>No</th><th>Nama Vendor</th><th className="d-none d-md-table-cell">Alamat</th><th>Kontak</th><th>Aksi</th></tr>
                            </thead>
                            <tbody>
                                {filteredVendors.length > 0 ? filteredVendors.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{index + 1}</td>
                                        <td>
                                            <span 
                                                className="fw-bold text-primary" 
                                                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                onClick={() => handleShowDetail(item)}
                                            >
                                                {item.name}
                                            </span>
                                        </td>
                                        <td className="d-none d-md-table-cell">{item.address || '-'}</td>
                                        <td>
                                            <small>📞 {item.contact || '-'}</small>
                                            <div className="d-none d-md-block text-muted" style={{fontSize:'0.8rem'}}>📧 {item.email || '-'}</div>
                                        </td>
                                        <td>
                                            <div className="d-flex gap-2">
                                                {canEditDelete && (
                                                    <>
                                                        <Button size="sm" variant="outline-primary" onClick={() => handleEdit(item)}>Edit</Button>
                                                        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(item.id)}>Hapus</Button>
                                                    </>
                                                )}
                                                {!canEditDelete && <Badge bg="light" text="dark" className="border">View Only</Badge>}
                                            </div>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="5" className="text-center py-5 text-muted">Belum ada data vendor.</td></tr>}
                            </tbody>
                        </Table>
                    </div>
                </Card>
            </div>

            {/* MODAL 1: FORM TAMBAH/EDIT */}
            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton><Modal.Title>{editId ? 'Edit Vendor' : 'Tambah Vendor Baru'}</Modal.Title></Modal.Header>
                <Form onSubmit={handleSave}>
                    <Modal.Body>
                        <Form.Group className="mb-3"><Form.Label>Nama Vendor</Form.Label><Form.Control required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></Form.Group>
                        <Form.Group className="mb-3"><Form.Label>Alamat</Form.Label><Form.Control as="textarea" rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></Form.Group>
                        <Row>
                            <Col xs={12} md={6}><Form.Group className="mb-3"><Form.Label>Kontak (HP)</Form.Label><Form.Control type="text" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} /></Form.Group></Col>
                            <Col xs={12} md={6}><Form.Group className="mb-3"><Form.Label>Email</Form.Label><Form.Control type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></Form.Group></Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer><Button variant="secondary" onClick={handleClose}>Batal</Button><Button variant="primary" type="submit">Simpan</Button></Modal.Footer>
                </Form>
            </Modal>

            {/* MODAL 2: DETAIL VENDOR POPUP */}
            <Modal show={showDetail} onHide={() => setShowDetail(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white"><Modal.Title>🏢 Profil Vendor</Modal.Title></Modal.Header>
                <Modal.Body>
                    {selectedVendor && (
                        <div className="text-center p-2">
                            <div className="mb-3">
                                <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center" style={{width: '70px', height: '70px', fontSize: '25px'}}>🏢</div>
                            </div>
                            <h4 className="fw-bold text-dark">{selectedVendor.name}</h4>
                            <p className="text-muted small mb-3">{selectedVendor.email || 'Email tidak tersedia'}</p>
                            
                            <Card className="text-start bg-light border-0">
                                <Card.Body className="p-3">
                                    <div className="mb-2 small"><strong>📍 Alamat:</strong> <br/> {selectedVendor.address || '-'}</div>
                                    <div className="small"><strong>📞 Kontak:</strong> <br/> {selectedVendor.contact || '-'}</div>
                                </Card.Body>
                            </Card>

                            <div className="mt-4 d-grid gap-2">
                                <Button variant="success" onClick={() => handleWA(selectedVendor.contact, selectedVendor.name)}>💬 Chat WhatsApp</Button>
                                <Button variant="secondary" onClick={() => setShowDetail(false)}>Tutup</Button>
                            </div>
                        </div>
                    )}
                </Modal.Body>
            </Modal>
        </div>
    );
};
export default Vendors;