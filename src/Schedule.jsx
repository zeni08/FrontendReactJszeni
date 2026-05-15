import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Modal, Form, Row, Col, InputGroup, FormControl, Navbar, Offcanvas, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Schedule = () => {
    const navigate = useNavigate();
    
    // AMBIL ROLE DARI LOCAL STORAGE
    const userRole = localStorage.getItem('role'); 
    const role = userRole ? userRole.toLowerCase() : '';

    // STATE UI RESPONSIVE
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // STATE DATA UTAMA
    const [schedules, setSchedules] = useState([]);
    const [filteredSchedules, setFilteredSchedules] = useState([]);
    
    // STATE FILTER & SEARCH
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    // STATE MODAL
    const [showInput, setShowInput] = useState(false);
    const [qtyError, setQtyError] = useState(""); 
    const [showDetail, setShowDetail] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // DROPDOWN DATA
    const [vendors, setVendors] = useState([]);
    const [parts, setParts] = useState([]);
    const [scanInput, setScanInput] = useState('');

    const getTodayDate = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    };
    const getCurrentTime = () => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    const [formData, setFormData] = useState({
        vendor: '', vendor_name: '', part: '', part_name: '', plan_qty: '', delivery_order_number: '',
        schedule_date: getTodayDate(), schedule_time: getCurrentTime(), status: 'SCHEDULED'
    });

    useEffect(() => { refreshData(); getDropdownData(); }, []);

    // LOGIKA FILTER OTOMATIS
    useEffect(() => {
        let result = schedules;
        if (searchTerm) {
            result = result.filter(item => 
                (item.part_name?.toLowerCase().includes(searchTerm.toLowerCase())) || 
                (item.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        if (filterStatus !== 'ALL') {
            const statusKey = filterStatus === 'OPEN' ? 'SCHEDULED' : 'COMPLETED';
            result = result.filter(item => item.status === statusKey);
        }
        setFilteredSchedules(result);
    }, [searchTerm, filterStatus, schedules]);

    const refreshData = async () => {
        try { 
            const res = await axios.get('hhttps://zeni08.pythonanywhere.com/api/schedule/'); 
            const sorted = res.data.sort((a, b) => (a.status === 'SCHEDULED' ? -1 : 1));
            setSchedules(sorted); 
        } catch (error) { console.error(error); }
    };

    const getDropdownData = async () => {
        try {
            const resVendor = await axios.get('https://zeni08.pythonanywhere.com/api/vendors/');
            const resPart = await axios.get('https://zeni08.pythonanywhere.com/api/parts/');
            setVendors(resVendor.data); 
            setParts(resPart.data);
        } catch (error) { console.error(error); }
    };

    const handleProcess = (e, id) => {
        e.stopPropagation();
        navigate(`/inspection/${id}`);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "plan_qty") {
            const val = parseInt(value) || 0;
            setQtyError(val % 60 !== 0 ? `⚠️ Wajib kelipatan 60!` : "");
        }
        setFormData({ ...formData, [name]: value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (parseInt(formData.plan_qty) % 60 !== 0) return alert("Gagal: Qty harus kelipatan 60!");
        
        // Buat objek payload bersih untuk dikirim ke backend (hanya ID)
        const payload = {
            vendor: formData.vendor,
            part: formData.part,
            plan_qty: formData.plan_qty,
            delivery_order_number: formData.delivery_order_number,
            schedule_date: formData.schedule_date,
            schedule_time: formData.schedule_time,
            status: formData.status
        };

        try {
            await axios.post('https://zeni08.pythonanywhere.com/api/schedule/', payload);
            alert("✅ Jadwal Berhasil Disimpan!"); 
            setShowInput(false); 
            refreshData(); 
            setFormData({ 
                vendor: '', vendor_name: '', part: '', part_name: '', plan_qty: '', 
                delivery_order_number: '', schedule_date: getTodayDate(), schedule_time: getCurrentTime(), status: 'SCHEDULED' 
            });
            setScanInput(''); setQtyError('');
        } catch (error) { alert("Gagal Simpan! Pastikan semua data terisi."); }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Hapus Jadwal?")) {
            try { await axios.delete(`https://zeni08.pythonanywhere.com/api/schedule/${id}/`); refreshData(); } catch (e) { alert("Gagal Hapus"); }
        }
    };

    // UPDATE: Fungsi Scan dengan FeedBack Nama Part & Vendor (Poka-Yoke)
    const handleScan = (e) => {
        const code = e.target.value;
        setScanInput(code);
        
        // Cari part berdasarkan part_number hasil scan
        const foundPart = parts.find(p => p.part_number.toLowerCase() === code.toLowerCase());
        
        if (foundPart) {
            setFormData(prev => ({ 
                ...prev, 
                part: foundPart.id, 
                part_name: foundPart.part_name,
                vendor: foundPart.vendor.id || foundPart.vendor, // Menangani jika vendor berupa objek atau ID
                vendor_name: foundPart.vendor_name || (foundPart.vendor && foundPart.vendor.name) || 'Vendor Terdeteksi'
            }));
            // Berikan sedikit delay lalu kosongkan input scan agar siap scan DO atau part lain
            setTimeout(() => setScanInput(''), 1000);
        }
    };

    const openDetailModal = (item) => { 
        if (item) {
            setSelectedItem(item); 
            setShowDetail(true); 
        }
    };

    const handleLogout = () => { localStorage.clear(); navigate('/'); };
    
    const canAddSchedule = role === 'admin';
    const canProcessQC = role === 'hintan';
    const canDelete = role === 'manager';

    const SidebarContent = () => (
        <div className="p-3">
            <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/dashboard')}>📊 Dashboard</Button>
            {(role === 'manager' || role === 'admin') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/vendors')}>🏢 Vendor Data</Button>}
            {(role === 'manager' || role === 'admin') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/parts')}>⚙️ Part Data</Button>}
            {(role === 'manager' || role === 'admin' || role === 'hintan') && <Button variant="primary" className="w-100 text-start mb-2 fw-bold">📅 Receiving Schedule</Button>}
            {(role === 'manager' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/qc-report')}>📑 QC Report</Button>}
            {(role === 'manager' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/ng-handling')}>🔧 Pengelolaan NG</Button>}
            {(role === 'manager' || role === 'foreman' || role === 'admin') &&  <Button variant="light" className="w-100 text-start mb-2" onClick={() => navigate('/production')}>🏭 Production Request</Button>}
            {role === 'manager' && (<Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/recycle-bin'); setShowMobileMenu(false);}}>♻️ Recycle Bin</Button>)}
            <Button variant="danger" className="w-100 mt-4" onClick={handleLogout}>🚪 Logout</Button>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f9' }}>
            <style>{`@media (max-width: 768px) { .desktop-sidebar { display: none !important; } .mobile-header { display: block !important; } .main-content { margin-left: 0 !important; margin-top: 60px; } } @media (min-width: 769px) { .desktop-sidebar { display: block !important; } .mobile-header { display: none !important; } .main-content { margin-left: 250px !important; margin-top: 0; } }`}</style>
            
            <div className="desktop-sidebar bg-white border-end" style={{ width: '250px', minHeight: '100vh', position: 'fixed', zIndex: 1000 }}>
                <div className="p-4 text-center border-bottom"><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '120px' }} /></div>
                <SidebarContent />
            </div>

            <Navbar bg="white" expand={false} fixed="top" className="mobile-header border-bottom shadow-sm px-3">
                <Button variant="outline-dark" size="sm" onClick={() => setShowMobileMenu(true)}>☰ Menu</Button>
                <Navbar.Brand className="ms-2 fw-bold text-primary">Schedule</Navbar.Brand>
            </Navbar>

            <Offcanvas show={showMobileMenu} onHide={() => setShowMobileMenu(false)} style={{width: '280px'}}>
                <Offcanvas.Header closeButton><Offcanvas.Title><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '100px' }} /></Offcanvas.Title></Offcanvas.Header>
                <Offcanvas.Body className="p-0"><SidebarContent /></Offcanvas.Body>
            </Offcanvas>

            <div className="main-content p-3 p-md-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                    <div>
                        <h3 className="fw-bold text-dark mb-0">Receiving Schedule</h3>
                        <p className="text-muted small mb-0 d-none d-md-block">Monitor barang masuk (Receiving)</p>
                    </div>
                    {canAddSchedule && <Button variant="primary" style={{ backgroundColor: '#003399' }} onClick={() => setShowInput(true)}>+ Input Jadwal Baru</Button>}
                </div>

                <Card className="border-0 shadow-sm p-3 mb-3">
                    <Row className="g-2">
                        <Col md={8} xs={12}><InputGroup><InputGroup.Text className="bg-white">🔍</InputGroup.Text><FormControl placeholder="Cari Part/Vendor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></InputGroup></Col>
                        <Col md={4} xs={12}><Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="ALL">Semua Status</option><option value="OPEN">⏳ Menunggu</option><option value="CLOSED">✅ Selesai</option></Form.Select></Col>
                    </Row>
                </Card>

                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="table-responsive">
                        <Table hover className="m-0 align-middle">
                            <thead className="bg-light text-secondary small text-nowrap">
                                <tr><th>No</th><th>Waktu</th><th>Vendor</th><th>Part Info</th><th>Qty</th><th>Status</th><th>Aksi</th></tr>
                            </thead>
                            <tbody className="small">
                                {filteredSchedules.map((item, idx) => (
                                    <tr key={item.id} onClick={() => openDetailModal(item)} style={{ cursor: 'pointer' }}>
                                        <td>{idx + 1}</td>
                                        <td><strong>{item.schedule_date}</strong><br/><small className="text-muted">🕒 {item.schedule_time?.substring(0, 5)}</small></td>
                                        <td className="text-nowrap fw-bold">{item.vendor_name}</td>
                                        <td><span className="text-primary fw-bold">{item.part_name}</span><br/><Badge bg="secondary" className="fw-normal">{item.part_number}</Badge></td>
                                        <td className="fw-bold fs-6">{item.plan_qty}</td>
                                        <td>{item.status === 'COMPLETED' ? <Badge bg="success" pill>SELESAI</Badge> : <Badge bg="warning" text="dark" pill>MENUNGGU</Badge>}</td>
                                        <td>
                                            <div className="d-flex gap-1">
                                                {item.status !== 'COMPLETED' && canProcessQC && <Button size="sm" variant="primary" className="fw-bold" onClick={(e) => handleProcess(e, item.id)}>QC</Button>}
                                                {canDelete && <Button size="sm" variant="outline-danger" onClick={(e) => handleDelete(e, item.id)}>🗑️</Button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </Card>
            </div>

            {/* MODAL INPUT DENGAN POKA-YOKE FEEDBACK */}
            <Modal show={showInput} onHide={() => setShowInput(false)} centered>
                <Modal.Header closeButton><Modal.Title>Input Jadwal</Modal.Title></Modal.Header>
                <Form onSubmit={handleSave}>
                    <Modal.Body>
                        <div className="mb-3 p-3 bg-light border rounded small">
                            <Form.Label className="fw-bold text-primary">SCAN BARCODE 🔫</Form.Label>
                            <Form.Control 
                                type="text" 
                                placeholder="Scan part number..." 
                                value={scanInput} 
                                onChange={handleScan}
                                autoFocus 
                            />
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label>Part</Form.Label>
                            <Form.Control 
                                type="text" 
                                placeholder="Data otomatis terisi setelah scan..." 
                                value={formData.part_name || ''} 
                                readOnly 
                                className="bg-light cursor-not-allowed fw-bold text-primary"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Vendor</Form.Label>
                            <Form.Control 
                                type="text" 
                                placeholder="Data otomatis terisi setelah scan..." 
                                value={formData.vendor_name || ''} 
                                readOnly 
                                className="bg-light cursor-not-allowed fw-bold"
                            />
                        </Form.Group>

                        <Row>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Qty</Form.Label>
                                    <Form.Control 
                                        type="number" 
                                        name="plan_qty" 
                                        required 
                                        step="60" 
                                        value={formData.plan_qty} 
                                        onChange={handleInputChange} 
                                        className={qtyError ? 'border-danger' : ''}
                                    />
                                    {qtyError && <small className="text-danger">{qtyError}</small>}
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Jam</Form.Label>
                                    <Form.Control 
                                        type="time" 
                                        name="schedule_time" 
                                        required 
                                        value={formData.schedule_time} 
                                        onChange={handleInputChange} 
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Tanggal</Form.Label>
                            <Form.Control 
                                type="date" 
                                name="schedule_date" 
                                required 
                                min={getTodayDate()} 
                                value={formData.schedule_date} 
                                onChange={handleInputChange} 
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="primary" type="submit" className="w-100" disabled={!formData.part || !formData.vendor || qtyError}>
                            Simpan Jadwal
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            <Modal show={showDetail} onHide={() => setShowDetail(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white"><Modal.Title className="fs-6">📄 Detail Digital DO</Modal.Title></Modal.Header>
                <Modal.Body className="p-4 text-center">
                    {selectedItem ? (
                        <>
                            <h5 className="fw-bold text-primary mb-1">{selectedItem.part_name || 'Part Tidak Diketahui'}</h5>
                            <Badge bg="dark" className="mb-3">{selectedItem.part_number || '-'}</Badge>
                            <Alert variant="info" className="text-start small">
                                <strong>Vendor:</strong> {selectedItem.vendor_name || '-'}<br/>
                                <strong>Qty Plan:</strong> {selectedItem.plan_qty || 0} Pcs<br/>
                                <strong>No DO:</strong> {selectedItem.delivery_order_number || '-'}<br/>
                                <strong>Waktu:</strong> {selectedItem.schedule_date || '-'} ({selectedItem.schedule_time || '-'})
                            </Alert>
                            {selectedItem.status !== 'COMPLETED' && canProcessQC && (
                                <Button variant="primary" className="w-100 mt-2" onClick={(e) => handleProcess(e, selectedItem.id)}>
                                    Lanjut Proses QC Sekarang
                                </Button>
                            )}
                        </>
                    ) : (
                        <div className="text-muted">Memuat data...</div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetail(false)}>Tutup</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Schedule;