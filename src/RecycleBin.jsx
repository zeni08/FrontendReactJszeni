import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Tabs, Tab, Navbar, Offcanvas } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const RecycleBin = () => {
    const navigate = useNavigate();
    const userRole = localStorage.getItem('role');
    const role = userRole ? userRole.toLowerCase() : '';
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    
    // STATE DATA TERHAPUS
    const [deletedVendors, setDeletedVendors] = useState([]);
    const [deletedParts, setDeletedParts] = useState([]);
    const [deletedSchedules, setDeletedSchedules] = useState([]);
    // State baru untuk Production Request
    const [deletedProductions, setDeletedProductions] = useState([]); 

    useEffect(() => {
        if (role !== 'manager') {
            navigate('/dashboard');
        }
        fetchDeletedItems();
    }, [role, navigate]);

    const fetchDeletedItems = async () => {
        try {
            const resVendors = await axios.get('https://zeni08.pythonanywhere.com/api/vendors/deleted_items/');
            const resParts = await axios.get('https://zeni08.pythonanywhere.com/api/parts/deleted_items/');
            const resSchedules = await axios.get('https://zeni08.pythonanywhere.com/api/schedule/deleted_items/');
            // Fetch Production Request terhapus
            const resProductions = await axios.get('https://zeni08.pythonanywhere.com/api/production/deleted_items/'); 
            
            setDeletedVendors(resVendors.data);
            setDeletedParts(resParts.data);
            setDeletedSchedules(resSchedules.data);
            setDeletedProductions(resProductions.data);
        } catch (err) {
            console.error("Gagal ambil data arsip:", err);
        }
    };

    const handleRestore = async (type, id, name) => {
    const result = await Swal.fire({
        title: `Restore ${name}?`,
        text: "Data ini akan dikembalikan ke daftar aktif.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#198754', 
        cancelButtonColor: '#6c757d',  
        confirmButtonText: 'Ya, Kembalikan!',
        cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
        try {
            await axios.post(`https://zeni08.pythonanywhere.com/api/${type}/${id}/restore/`);
            
            Swal.fire({
                title: 'Berhasil!',
                text: `${name} telah aktif kembali.`,
                icon: 'success',
                confirmButtonColor: '#198754' 
            });
            
            fetchDeletedItems();
        } catch (err) {
            Swal.fire({
                title: 'Gagal!',
                text: 'Terjadi kesalahan saat restore data.',
                icon: 'error',
                confirmButtonColor: '#dc3545' 
            });
        }
    }
};

    const handleLogout = () => { localStorage.clear(); navigate('/'); };

    const SidebarContent = () => (
        <div className="p-3">
            <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/dashboard')}>📊 Dashboard</Button>
            {(role === 'manager' || role === 'admin') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/vendors'); setShowMobileMenu(false);}}>🏢 Vendor Data</Button>}
            {(role === 'manager' || role === 'admin') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/parts'); setShowMobileMenu(false);}}>⚙️ Part Data</Button>}
            {(role === 'manager' || role === 'admin' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/schedule'); setShowMobileMenu(false);}}>📅 Receiving Schedule</Button>}
            {(role === 'manager' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/qc-report'); setShowMobileMenu(false);}}>📑 QC Report</Button>}
            {(role === 'manager' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/ng-handling'); setShowMobileMenu(false);}}>🔧 Pengelolaan NG</Button>}
            {(role === 'manager' || role === 'foreman' || role === 'admin') &&  <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/production')}>🏭 Production Request</Button>}
            <Button variant="primary" className="w-100 text-start mb-2 fw-bold" onClick={() => navigate('/recycle-bin')}>♻️ Recycle Bin</Button>
            <Button variant="danger" className="w-100 mt-4" onClick={handleLogout}>🚪 Logout</Button>
        </div>
    );
    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f9' }}>
            <style>{`
                @media (max-width: 768px) { .desktop-sidebar { display: none !important; } .mobile-header { display: block !important; } .main-content { margin-left: 0 !important; margin-top: 60px; } }
                @media (min-width: 769px) { .desktop-sidebar { display: block !important; } .mobile-header { display: none !important; } .main-content { margin-left: 250px !important; margin-top: 0; } }
            `}</style>
            {/* SIDEBAR DESKTOP */}
            <div className="desktop-sidebar bg-white border-end" style={{ width: '250px', minHeight: '100vh', position: 'fixed', zIndex: 1000 }}>
                <div className="p-4 text-center border-bottom"><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '120px' }} /></div>
                <SidebarContent />
            </div>
            {/* NAVBAR MOBILE */}
            <Navbar bg="white" expand={false} fixed="top" className="mobile-header border-bottom px-3 shadow-sm">
                <Button variant="outline-dark" size="sm" onClick={() => setShowMobileMenu(true)}>☰ Menu</Button>
                <Navbar.Brand className="ms-2 fw-bold text-primary">Recycle Bin</Navbar.Brand>
            </Navbar>
            <Offcanvas show={showMobileMenu} onHide={() => setShowMobileMenu(false)} style={{width: '280px'}}>
                <Offcanvas.Header closeButton><Offcanvas.Title><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '100px' }} /></Offcanvas.Title></Offcanvas.Header>
                <Offcanvas.Body className="p-0"><SidebarContent /></Offcanvas.Body>
            </Offcanvas>
            {/* MAIN CONTENT */}
            <div className="main-content p-3 p-md-4">
                <div className="mb-3">
                    <h4 className="fw-bold text-dark">♻️ Recycle Bin (Arsip Data)</h4>
                    <p className="text-muted small">Kelola data yang telah dihapus sementara.</p>
                </div>
                <Card className="border-0 shadow-sm">
                    <Card.Body>
                        <Tabs defaultActiveKey="vendors" className="mb-3 custom-tabs">
                            {/* TAB VENDOR */}
                            <Tab eventKey="vendors" title={`Vendor (${deletedVendors.length})`}>
                                <Table hover responsive className="align-middle">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Nama Vendor</th>
                                            <th>Kontak</th>
                                            <th className="text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deletedVendors.length > 0 ? deletedVendors.map(v => (
                                            <tr key={v.id}>
                                                <td className="fw-bold text-primary">{v.name}</td>
                                                <td>{v.contact}</td>
                                                <td className="text-center">
                                                    <Button variant="success" size="sm" className="rounded-pill px-3" onClick={() => handleRestore('vendors', v.id, v.name)}>
                                                        🔄 Restore
                                                    </Button>
                                                </td>
                                            </tr>
                                        )) : <tr><td colSpan="3" className="text-center text-muted py-4">Tidak ada vendor di arsip.</td></tr>}
                                    </tbody>
                                </Table>
                            </Tab>
                            {/* TAB PART */}
                            <Tab eventKey="parts" title={`Part (${deletedParts.length})`}>
                                <Table hover responsive className="align-middle">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Part No</th>
                                            <th>Nama Part</th>
                                            <th className="text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deletedParts.length > 0 ? deletedParts.map(p => (
                                            <tr key={p.id}>
                                                <td>{p.part_number}</td>
                                                <td className="fw-bold text-primary">{p.part_name}</td>
                                                <td className="text-center">
                                                    <Button variant="success" size="sm" className="rounded-pill px-3" onClick={() => handleRestore('parts', p.id, p.part_name)}>
                                                        🔄 Restore
                                                    </Button>
                                                </td>
                                            </tr>
                                        )) : <tr><td colSpan="3" className="text-center text-muted py-4">Tidak ada part di arsip.</td></tr>}
                                    </tbody>
                                </Table>
                            </Tab>
                            {/* TAB JADWAL (SCHEDULE) */}
                            <Tab eventKey="schedules" title={`Jadwal (${deletedSchedules.length})`}>
                                <Table hover responsive className="align-middle">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Tanggal</th>
                                            <th>Vendor</th>
                                            <th>Part</th>
                                            <th className="text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deletedSchedules.length > 0 ? deletedSchedules.map(s => (
                                            <tr key={s.id}>
                                                <td>{s.schedule_date}</td>
                                                <td>{s.vendor_name}</td>
                                                <td className="fw-bold text-primary">{s.part_name}</td>
                                                <td className="text-center">
                                                    <Button variant="success" size="sm" className="rounded-pill px-3" onClick={() => handleRestore('schedule', s.id, `Jadwal ${s.part_name}`)}>
                                                        🔄 Restore
                                                    </Button>
                                                </td>
                                            </tr>
                                        )) : <tr><td colSpan="4" className="text-center text-muted py-4">Tidak ada jadwal di arsip.</td></tr>}
                                    </tbody>
                                </Table>
                            </Tab>
                            {/* TAB PRODUCTION REQUEST (BARU) */}
                            <Tab eventKey="productions" title={`Permintaan Produksi (${deletedProductions.length})`}>
                                <Table hover responsive className="align-middle">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Waktu Request</th>
                                            <th>Info Part</th>
                                            <th>Qty Keluar</th>
                                            <th className="text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deletedProductions.length > 0 ? deletedProductions.map(prod => (
                                            <tr key={prod.id}>
                                                <td>{new Date(prod.created_at).toLocaleString('id-ID')}</td>
                                                {/* Menggunakan prod.part (ID) untuk menghindari error undefined jika part_name tidak dikirim backend */}
                                                <td className="fw-bold text-primary">Part ID: {prod.part}</td>
                                                <td><Badge bg="warning" text="dark">{prod.qty_request} Pcs</Badge></td>
                                                <td className="text-center">
                                                    {/* Parameter name diubah agar tidak memanggil prod.part_name */}
                                                    <Button variant="success" size="sm" className="rounded-pill px-3" onClick={() => handleRestore('production', prod.id, `Permintaan ID-${prod.id}`)}>
                                                        🔄 Restore
                                                    </Button>
                                                </td>
                                            </tr>
                                        )) : <tr><td colSpan="4" className="text-center text-muted py-4">Tidak ada permintaan produksi di arsip.</td></tr>}
                                    </tbody>
                                </Table>
                            </Tab>
                        </Tabs>
                    </Card.Body>
                </Card>
            </div>
        </div>
    );
};

export default RecycleBin;