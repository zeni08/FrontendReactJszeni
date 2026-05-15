import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, ProgressBar, Modal, Alert, Navbar, Offcanvas, Form } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line
} from 'recharts';

const Dashboard = () => {
    const navigate = useNavigate();
    const userRole = localStorage.getItem('role');
    const username = localStorage.getItem('username');
    const role = userRole ? userRole.toLowerCase() : '';
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [stats, setStats] = useState({ total_ok: 0, total_ng: 0, pending_schedule: 0, low_stock_count: 0, total_parts: 0, total_vendors: 0 });
    const [allInspections, setAllInspections] = useState([]);
    const [allSchedules, setAllSchedules] = useState([]);
    const [rawProduction, setRawProduction] = useState([]);
    const [allParts, setAllParts] = useState([]);
    const [allVendors, setAllVendors] = useState([]);
    const [filteredInspections, setFilteredInspections] = useState([]);
    const [filteredSchedules, setFilteredSchedules] = useState([]);
    const [filteredProduction, setFilteredProduction] = useState([]);
    const [lowStockParts, setLowStockParts] = useState([]);
    const [partsData, setPartsData] = useState([]); 
    const [vendorPerformance, setVendorPerformance] = useState([]);
    
    // STATE FILTER
    const [filterRange, setFilterRange] = useState('TODAY');
    const [selectedVendorFilter, setSelectedVendorFilter] = useState('ALL'); 
    const [sortVendor, setSortVendor] = useState('highest');

    const [greeting, setGreeting] = useState('Selamat Datang');
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: '', type: '', data: [] });
    const [showContactModal, setShowContactModal] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);

    useEffect(() => {
        fetchAllData();
        setDynamicGreeting();
        const interval = setInterval(setDynamicGreeting, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        applyFilterAndCalculate();
    }, [filterRange, allInspections, allSchedules, rawProduction, sortVendor, selectedVendorFilter]);

    const setDynamicGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 3 && hour < 11) setGreeting('Selamat Pagi ☀️');
        else if (hour >= 11 && hour < 15) setGreeting('Selamat Siang 🌞');
        else if (hour >= 15 && hour < 18) setGreeting('Selamat Sore 🌇');
        else setGreeting('Selamat Malam 🌙');
    };

    const fetchAllData = async () => {
        try {
            const resInspections = await axios.get('http://127.0.0.1:8000/api/inspections/');
            const resSchedule = await axios.get('http://127.0.0.1:8000/api/schedule/');
            const resVendors = await axios.get('http://127.0.0.1:8000/api/vendors/');
            const resParts = await axios.get('http://127.0.0.1:8000/api/parts/');
            const resProd = await axios.get('http://127.0.0.1:8000/api/production/');

            setAllInspections(resInspections.data);
            setAllSchedules(resSchedule.data);
            setRawProduction(resProd.data);
            setAllParts(resParts.data);
            setAllVendors(resVendors.data);

            const lowStock = resParts.data.filter(p => p.current_stock <= p.min_stock);
            const sortedParts = [...resParts.data].sort((a, b) => b.current_stock - a.current_stock).slice(0, 5);
            setPartsData(sortedParts);
            setLowStockParts(lowStock);

            setStats(prev => ({
                ...prev,
                low_stock_count: lowStock.length,
                total_parts: resParts.data.length,
                total_vendors: resVendors.data.length
            }));
        } catch (error) { console.error("Gagal load dashboard:", error); }
    };

    const isDateInRange = (dateString) => {
        if (filterRange === 'ALL') return true;
        if (!dateString) return false;
        const targetDate = new Date(dateString);
        const today = new Date();
        targetDate.setHours(0,0,0,0);
        today.setHours(0,0,0,0);
        const diffTime = today - targetDate; 
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return false;

        switch (filterRange) {
            case 'TODAY': return diffDays === 0;
            case '2DAYS': return diffDays <= 1;
            case '3DAYS': return diffDays <= 2;
            case 'WEEK': return diffDays <= 7;
            case 'MONTH': return diffDays <= 30;
            case 'YEAR': return diffDays <= 365;
            default: return true;
        }
    };

    // --- FUNGSI SAKTI: Melacak NG Asli dari Logs ---
    const getTrueNGQty = (item) => {
        let ng = parseInt(item.qty_ng) || 0;
        if (item.description && item.description.toUpperCase().includes("REPAIR")) {
            try { const parts = item.description.split("Qty:"); if (parts.length > 1) ng += parseInt(parts[1]) || 0; } catch(e){}
        }
        if (item.logs && item.logs.length > 0) {
            const logNG = item.logs.reduce((sum, log) => sum + (parseInt(log.qty) || 0), 0);
            if (parseInt(item.qty_ng) === 0 && logNG > 0) { ng += logNG; }
        }
        return ng;
    };

    const applyFilterAndCalculate = () => {
        let filteredInsp = allInspections.filter(item => isDateInRange(item.schedule_date));
        let filteredSched = allSchedules.filter(item => isDateInRange(item.schedule_date));
        const filteredProd = rawProduction.filter(item => isDateInRange(item.request_date));

        if (selectedVendorFilter !== 'ALL') {
            const selectedVendorObj = allVendors.find(v => v.name === selectedVendorFilter);
            const vendorId = selectedVendorObj ? selectedVendorObj.id : null;
            
            filteredInsp = filteredInsp.filter(item => item.vendor_name === selectedVendorFilter || item.vendor === vendorId);
            filteredSched = filteredSched.filter(item => item.vendor_name === selectedVendorFilter || item.vendor === vendorId);
        }

        const ok = filteredInsp.reduce((acc, curr) => acc + curr.qty_ok, 0);
        
        // Gunakan fungsi sakti agar jumlah card atas sinkron
        const ngTotal = filteredInsp.reduce((acc, curr) => acc + getTrueNGQty(curr), 0);

        const pendingCount = filteredSched.filter(item => item.status !== 'COMPLETED').length;

        const vendorStats = {};
        filteredInsp.forEach(item => {
            const vendorName = item.vendor_name || 'Unknown';
            if (!vendorStats[vendorName]) vendorStats[vendorName] = { name: vendorName, total_supply: 0, total_ng: 0 };
            
            const trueNG = getTrueNGQty(item);
            vendorStats[vendorName].total_supply += (item.qty_ok + item.qty_ng);
            vendorStats[vendorName].total_ng += trueNG;
        });

        const vendorChartData = Object.values(vendorStats).map(v => ({
            name: v.name,
            Suplai: v.total_supply,
            Cacat: v.total_ng,
            NGRate: v.total_supply === 0 ? 0 : ((v.total_ng / v.total_supply) * 100).toFixed(1)
        })).sort((a, b) => {
            if (sortVendor === 'highest') return b.NGRate - a.NGRate;
            return a.NGRate - b.NGRate;
        });

        setFilteredInspections(filteredInsp.sort((a,b)=>b.id - a.id));
        setFilteredSchedules(filteredSched);
        setFilteredProduction(filteredProd.sort((a,b)=>b.id - a.id));
        setVendorPerformance(vendorChartData);
        setStats(prev => ({ ...prev, total_ok: ok, total_ng: ngTotal, pending_schedule: pendingCount }));
    };

    const dataPie = [{ name: 'OK', value: stats.total_ok }, { name: 'NG', value: stats.total_ng }];
    const COLORS = ['#198754', '#dc3545'];

    const handleOpenContact = (part) => {
        const vendor = allVendors.find(v => v.id === part.vendor);
        setSelectedContact({ ...vendor, part_name: part.part_name, part_number: part.part_number, current_stock: part.current_stock });
        setShowContactModal(true);
    };

    const handleWhatsApp = () => {
        if (!selectedContact || !selectedContact.contact) return alert("Nomor kontak tidak ada!");
        let phone = selectedContact.contact.replace(/\D/g, ''); 
        if (phone.startsWith('0')) phone = '62' + phone.substring(1);
        const message = `Halo ${selectedContact.name},\n\nKami dari Suzuki menginformasikan stok part menipis:\n\n*Part:* ${selectedContact.part_name}\n*No:* ${selectedContact.part_number}\n*Stok:* ${selectedContact.current_stock} Pcs\n\nMohon segera restock. Terima kasih.`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    // --- PERBAIKAN: handleCardClick NG sudah menggunakan getTrueNGQty ---
    const handleCardClick = (type) => {
        let title = ''; let data = [];
        if (type === 'OK') { 
            title = '✅ Detail Barang OK'; 
            data = filteredInspections.filter(i => i.qty_ok > 0); 
        }
        else if (type === 'NG') { 
            title = '❌ Detail Barang NG'; 
            data = filteredInspections
                .filter(i => getTrueNGQty(i) > 0)
                .map(i => ({ ...i, display_ng: getTrueNGQty(i) })); 
        }
        else if (type === 'PENDING') { title = '⏳ Jadwal Pending'; data = filteredSchedules.filter(item => item.status !== 'COMPLETED'); }
        else if (type === 'PRODUCTION') { title = '🏭 Permintaan Produksi'; data = filteredProduction; }
        else if (type === 'LOW_STOCK') { title = '⚠️ Low Stock Items'; data = lowStockParts; }
        else if (type === 'PARTS') { title = '📦 Daftar Semua Part'; data = allParts; }
        else if (type === 'VENDORS') { title = '🏢 Daftar Vendor'; data = allVendors; }
        else if (type === 'ALL_STOCK') { title = '📦 Data Semua Stok'; data = allParts.sort((a,b)=>b.current_stock - a.current_stock); }
        setModalConfig({ title, type, data }); setShowModal(true);
    };

    const handleLogout = () => { localStorage.clear(); navigate('/'); };
    const totalItems = stats.total_ok + stats.total_ng;
    const qualityRate = totalItems === 0 ? 0 : Math.round((stats.total_ok / totalItems) * 100);

    const FilterBar = () => (
        <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="py-2">
                <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                    <div className="d-flex align-items-center">
                        <div className="me-3 d-none d-md-block"><h6 className="mb-0 fw-bold text-muted text-nowrap">🕒 Filter Waktu:</h6></div>
                        <div className="d-flex gap-2 flex-nowrap overflow-auto pb-1 custom-scroll" style={{ scrollbarWidth: 'none' }}>
                            <style>{`.custom-scroll::-webkit-scrollbar { display: none; }`}</style>
                            
                            {/* PERBAIKAN: Tombol Tahun Ini Dihapus */}
                            {['TODAY', '2DAYS', '3DAYS', 'WEEK', 'MONTH', 'ALL'].map((type) => (
                                <Button key={type} variant={filterRange === type ? 'primary' : 'outline-secondary'} size="sm" onClick={() => setFilterRange(type)} className="rounded-pill px-3 text-nowrap">
                                    {type === 'TODAY' ? 'Hari Ini' : type === '2DAYS' ? '2 Hari' : type === '3DAYS' ? '3 Hari' : type === 'WEEK' ? 'Minggu Ini' : type === 'MONTH' ? 'Bulan Ini' : 'Semua'}
                                </Button>
                            ))}
                            
                        </div>
                    </div>
                    
                    {(role === 'manager' || role === 'admin' || role === 'hintan') && (
                        <div className="d-flex align-items-center">
                            <span className="fw-bold text-muted me-2 small text-nowrap">🏢 Vendor:</span>
                            <Form.Select 
                                size="sm" 
                                style={{ width: '200px' }} 
                                value={selectedVendorFilter} 
                                onChange={(e) => setSelectedVendorFilter(e.target.value)}
                                className="rounded-pill border-secondary fw-bold text-primary"
                            >
                                <option value="ALL">✅ Semua Vendor</option>
                                {allVendors.map(v => (
                                    <option key={v.id} value={v.name}>{v.name}</option>
                                ))}
                            </Form.Select>
                        </div>
                    )}
                </div>
            </Card.Body>
        </Card>
    );

    const VendorQualityChart = () => (
        <Card className="border-0 shadow-sm h-100 mt-4">
            <Card.Header className="bg-white border-0 pt-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center">
                       <h5 className="fw-bold mb-0 me-2"><small>📉</small> Evaluasi Vendor (NG Rate)</h5>
                       <Badge bg="info">Termasuk History Repair</Badge>
                    </div>
                    <Form.Select 
                        style={{ width: '200px' }} 
                        value={sortVendor}
                        onChange={(e) => setSortVendor(e.target.value)}
                    >
                        <option value="highest">NG Terbanyak</option>
                        <option value="lowest">NG Terkecil</option>
                    </Form.Select>
                </div>
            </Card.Header>
            <Card.Body style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%"><ComposedChart data={vendorPerformance} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}><CartesianGrid stroke="#f5f5f5" /><XAxis dataKey="name" scale="band" /><YAxis yAxisId="left" label={{ value: 'Total Barang', angle: -90, position: 'insideLeft' }} /><YAxis yAxisId="right" orientation="right" label={{ value: '% NG Rate', angle: 90, position: 'insideRight' }} /><Tooltip /><Legend /><Bar yAxisId="left" dataKey="Suplai" name="Total Supply" barSize={20} fill="#413ea0" /><Bar yAxisId="left" dataKey="Cacat" name="Total Cacat (Awal)" barSize={20} fill="#ff7300" /><Line yAxisId="right" type="monotone" dataKey="NGRate" name="% NG Rate" stroke="#ff0000" strokeWidth={3} /></ComposedChart></ResponsiveContainer>
            </Card.Body>
        </Card>
    );

    const SidebarContent = () => (
        <div className="p-3">
            <Button variant="primary" className="w-100 text-start mb-2 fw-bold" onClick={() => {navigate('/dashboard'); setShowMobileMenu(false);}}>📊 Dashboard</Button>
            {(role === 'manager' || role === 'admin') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/vendors'); setShowMobileMenu(false);}}>🏢 Vendor Data</Button>}
            {(role === 'manager' || role === 'admin') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/parts'); setShowMobileMenu(false);}}>⚙️ Part Data</Button>}
            {(role === 'manager' || role === 'admin' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/schedule'); setShowMobileMenu(false);}}>📅 Receiving Schedule</Button>}
            {(role === 'manager' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/qc-report'); setShowMobileMenu(false);}}>📑 QC Report</Button>}
            {(role === 'manager' || role === 'hintan') && <Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/ng-handling'); setShowMobileMenu(false);}}>🔧 Pengelolaan NG</Button>}
            {(role === 'manager' || role === 'foreman' || role === 'admin') &&  <Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/production'); setShowMobileMenu(false);}}>🏭 Production Request</Button>}
            {role === 'manager' && (<Button variant="light" className="w-100 text-start mb-2" onClick={() => {navigate('/recycle-bin'); setShowMobileMenu(false);}}>♻️ Recycle Bin</Button>)}
            <Button variant="danger" className="w-100 mt-4" onClick={handleLogout}>🚪 Logout</Button>
        </div>
    );

    const renderAdminContent = () => (
        <>
            <Alert variant="primary">👋 Halo Admin! Fokus hari ini: <strong>Cek Stok & Jadwal.</strong></Alert>
            <Row className="mb-4 g-3">
                <Col md={3} xs={6}><Card className="border-0 shadow-sm bg-warning text-dark h-100" onClick={() => handleCardClick('PENDING')} style={{cursor:'pointer'}}><Card.Body><h6>⏳ Pending</h6><h2 className="fw-bold">{stats.pending_schedule} Lot</h2></Card.Body></Card></Col>
                <Col md={3} xs={6}><Card className="border-0 shadow-sm bg-danger text-white h-100" onClick={() => handleCardClick('LOW_STOCK')} style={{cursor:'pointer'}}><Card.Body><h6>⚠️ Low Stock</h6><h2 className="fw-bold">{stats.low_stock_count} Item</h2></Card.Body></Card></Col>
                <Col md={3} xs={6}><Card className="border-0 shadow-sm bg-info text-white h-100" onClick={() => handleCardClick('PARTS')} style={{cursor:'pointer'}}><Card.Body><h6>📦 Total Parts</h6><h2 className="fw-bold">{stats.total_parts}</h2></Card.Body></Card></Col>
                <Col md={3} xs={6}><Card className="border-0 shadow-sm bg-secondary text-white h-100" onClick={() => handleCardClick('VENDORS')} style={{cursor:'pointer'}}><Card.Body><h6>🏢 Vendor</h6><h2 className="fw-bold">{stats.total_vendors}</h2></Card.Body></Card></Col>
            </Row>
            <Card className="border-0 shadow-sm"><Card.Header className="bg-white fw-bold text-danger">⚠️ Stok Menipis (Klik untuk Hubungi Vendor)</Card.Header><Card.Body className="p-0"><Table hover responsive className="mb-0 align-middle"><thead className="bg-light"><tr><th>Part</th><th className="text-center">Sisa</th><th>Status</th></tr></thead><tbody>{lowStockParts.map(p => (<tr key={p.id} onClick={() => handleOpenContact(p)} style={{cursor: 'pointer'}}><td className="fw-bold text-primary">{p.part_name}</td><td className="text-center text-danger fw-bold">{p.current_stock}</td><td><Badge bg="danger">LOW</Badge></td></tr>))}</tbody></Table></Card.Body></Card>
        </>
    );

    const renderHintanContent = () => (
        <>
            <Alert variant="success">👋 Halo Hintan! Fokus hari ini: <strong>Kualitas QC.</strong></Alert>
            <Row className="mb-4 g-3">
                <Col md={3} xs={6}><Card className="border-0 shadow-sm" style={{backgroundColor:'#003399', color:'white'}}><Card.Body><h6>Quality Rate</h6><h2 className="fw-bold">{qualityRate}%</h2><ProgressBar variant="info" now={qualityRate} style={{height:'5px'}}/></Card.Body></Card></Col>
                <Col md={3} xs={6}><Card className="border-0 shadow-sm bg-success text-white h-100" onClick={() => handleCardClick('OK')} style={{cursor:'pointer'}}><Card.Body><h6>✅ OK</h6><h2 className="fw-bold">{stats.total_ok}</h2></Card.Body></Card></Col>
                <Col md={3} xs={6}><Card className="border-0 shadow-sm bg-danger text-white h-100" onClick={() => handleCardClick('NG')} style={{cursor:'pointer'}}><Card.Body><h6>⛔ NG</h6><h2 className="fw-bold">{stats.total_ng}</h2></Card.Body></Card></Col>
                <Col md={3} xs={6}><Card className="border-0 shadow-sm bg-warning text-dark h-100" onClick={() => handleCardClick('PENDING')} style={{cursor:'pointer'}}><Card.Body><h6>⏳ Inspeksi</h6><h2 className="fw-bold">{stats.pending_schedule}</h2></Card.Body></Card></Col>
            </Row>
            <Row><Col md={4}><Card className="border-0 shadow-sm h-100"><Card.Header className="bg-white fw-bold">📊 Grafik Kualitas</Card.Header><Card.Body style={{height:'300px'}}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dataPie} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label>{dataPie.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend/></PieChart></ResponsiveContainer></Card.Body></Card></Col><Col md={8}><Card className="border-0 shadow-sm h-100"><Card.Header className="bg-white fw-bold text-primary">🕒 5 Inspeksi Terakhir</Card.Header><Card.Body className="p-0"><Table hover responsive className="mb-0 align-middle"><thead className="bg-light"><tr><th>Waktu</th><th>Part</th><th>Hasil</th></tr></thead><tbody>{filteredInspections.slice(0,5).map(i=>(<tr key={i.id}><td>{i.schedule_date}</td><td>{i.part_name}</td><td>{i.final_judgement==='OK'?<Badge bg="success">OK</Badge>:<Badge bg="danger">NG</Badge>}</td></tr>))}</tbody></Table></Card.Body></Card></Col></Row>
        </>
    );

    const renderForemanContent = () => (
        <>
            <Alert variant="info">👋 Halo Foreman! Cek stok untuk produksi.</Alert>
            <Row className="mb-4 g-3">
                <Col md={6} xs={12}><Card className="border-0 shadow-sm bg-primary text-white h-100" onClick={() => handleCardClick('ALL_STOCK')} style={{cursor:'pointer'}}><Card.Body><h6>📦 Stok Tersedia</h6><h2 className="fw-bold">{partsData.reduce((acc,curr)=>acc+curr.current_stock,0)} Pcs</h2></Card.Body></Card></Col>
                <Col md={6} xs={12}><Card className="border-0 shadow-sm bg-danger text-white h-100" onClick={() => handleCardClick('LOW_STOCK')} style={{cursor:'pointer'}}><Card.Body><h6>⚠️ Barang Kritis</h6><h2 className="fw-bold">{stats.low_stock_count} Item</h2></Card.Body></Card></Col>
            </Row>
            <Row><Col md={6}><Card className="border-0 shadow-sm h-100"><Card.Header className="bg-white fw-bold">📊 Top 5 Stok</Card.Header><Card.Body style={{height:'300px'}}><ResponsiveContainer width="100%" height="100%"><BarChart data={partsData} layout="vertical"><XAxis type="number"/><YAxis type="category" dataKey="part_name" width={100}/><Tooltip/><Bar dataKey="current_stock" fill="#0d6efd" barSize={20}/></BarChart></ResponsiveContainer></Card.Body></Card></Col><Col md={6}><Card className="border-0 shadow-sm h-100"><Card.Header className="bg-white fw-bold text-dark">🏭 5 Request Terakhir</Card.Header><Card.Body className="p-0"><Table hover responsive className="mb-0"><thead className="bg-light"><tr><th>Part</th><th>Qty</th></tr></thead><tbody>{filteredProduction.slice(0,5).map(p=>(<tr key={p.id}><td>{p.part_name}</td><td className="text-danger fw-bold">-{p.qty_request}</td></tr>))}</tbody></Table></Card.Body></Card></Col></Row>
        </>
    );

    const renderManagerContent = () => (
        <>
            <p className="text-muted mb-4">{greeting}, <span className="fw-bold text-primary">{username}</span>.</p>
            <Row className="mb-4 g-3">
                <Col md={3} xs={6}><Card className="border-0 shadow-sm text-white h-100" style={{backgroundColor:'#003399'}}><Card.Body><h6>Yield Rate</h6><h2 className="fw-bold">{qualityRate}%</h2><ProgressBar variant="info" now={qualityRate} style={{height:'5px'}}/></Card.Body></Card></Col>
                <Col md={3} xs={6}><Card className="border-0 shadow-sm bg-success text-white h-100" onClick={()=>handleCardClick('OK')} style={{cursor:'pointer'}}><Card.Body><h6>Total OK</h6><h2 className="fw-bold">{stats.total_ok}</h2></Card.Body></Card></Col>
                <Col md={3} xs={6}><Card className="border-0 shadow-sm bg-danger text-white h-100" onClick={()=>handleCardClick('NG')} style={{cursor:'pointer'}}><Card.Body><h6>Total NG</h6><h2 className="fw-bold">{stats.total_ng}</h2></Card.Body></Card></Col>
                <Col md={3} xs={6}><Card className="border-0 shadow-sm bg-warning text-dark h-100" onClick={()=>handleCardClick('PENDING')} style={{cursor:'pointer'}}><Card.Body><h6>Pending</h6><h2 className="fw-bold">{stats.pending_schedule}</h2></Card.Body></Card></Col>
            </Row>
            <VendorQualityChart />
            <div className="mb-4"></div>
            <Row className="g-3"><Col md={6}><Card className="border-0 shadow-sm h-100"><Card.Header className="bg-white fw-bold text-danger">⚠️ Low Stock (Klik Hubungi)</Card.Header><Card.Body className="p-0 table-responsive"><Table hover className="mb-0 align-middle"><thead className="bg-light"><tr><th>Part</th><th className="text-center">Sisa</th></tr></thead><tbody>{lowStockParts.map(p=>(<tr key={p.id} onClick={() => handleOpenContact(p)} style={{cursor: 'pointer'}}><td className="text-primary fw-bold">{p.part_name}</td><td className="text-center text-danger fw-bold">{p.current_stock}</td></tr>))}</tbody></Table></Card.Body></Card></Col><Col md={6}><Card className="border-0 shadow-sm h-100"><Card.Header className="bg-white fw-bold text-primary">🕒 Inspeksi Terakhir</Card.Header><Card.Body className="p-0 table-responsive"><Table hover className="mb-0 align-middle"><thead className="bg-light"><tr><th>Part</th><th>Hasil</th></tr></thead><tbody>{filteredInspections.slice(0,5).map(i=>(<tr key={i.id}><td>{i.part_name}</td><td>{i.final_judgement==='OK'?<Badge bg="success">OK</Badge>:<Badge bg="danger">NG</Badge>}</td></tr>))}</tbody></Table></Card.Body></Card></Col></Row>
        </>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f9' }}>
            <style>{`@media (max-width: 768px) { .desktop-sidebar { display: none !important; } .mobile-header { display: block !important; } .main-content { margin-left: 0 !important; margin-top: 60px; } } @media (min-width: 769px) { .desktop-sidebar { display: block !important; } .mobile-header { display: none !important; } .main-content { margin-left: 250px !important; margin-top: 0; } }`}</style>
            <div className="desktop-sidebar bg-white border-end" style={{ width: '250px', minHeight: '100vh', position: 'fixed', zIndex: 1000 }}>
                <div className="p-4 text-center border-bottom"><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '120px' }} /></div>
                <SidebarContent />
            </div>
            <Navbar bg="white" expand={false} fixed="top" className="mobile-header border-bottom px-3 shadow-sm"><Button variant="outline-dark" size="sm" onClick={() => setShowMobileMenu(true)}>☰ Menu</Button><Navbar.Brand className="ms-2 fw-bold text-primary">Dashboard</Navbar.Brand></Navbar>
            <Offcanvas show={showMobileMenu} onHide={() => setShowMobileMenu(false)} style={{width: '280px'}}><Offcanvas.Header closeButton><Offcanvas.Title><img src="/logo.png" alt="Suzuki" style={{ maxWidth: '100px' }} /></Offcanvas.Title></Offcanvas.Header><Offcanvas.Body className="p-0"><SidebarContent /></Offcanvas.Body></Offcanvas>
            <div className="main-content p-3 p-md-4">
                <div className="mb-3"><h4 className="fw-bold text-dark">Dashboard {role.toUpperCase()}</h4></div>
                <FilterBar />
                {role === 'manager' ? renderManagerContent() : role === 'admin' ? renderAdminContent() : role === 'hintan' ? renderHintanContent() : role === 'foreman' ? renderForemanContent() : renderManagerContent()}
            </div>

            {/* MODAL GLOBAL */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered scrollable>
                <Modal.Header closeButton><Modal.Title className="fw-bold">{modalConfig.title}</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Table striped bordered hover responsive size="sm">
                        <thead className="bg-dark text-white">
                            {['PARTS', 'LOW_STOCK', 'ALL_STOCK'].includes(modalConfig.type) ? (<tr><th>Part No</th><th>Nama</th><th>Vendor</th><th>Stok</th></tr>) : modalConfig.type === 'VENDORS' ? (<tr><th>Vendor</th><th>Kontak</th><th>Alamat</th></tr>) : (<tr><th>Tgl</th><th>Part</th><th>Qty</th><th>Status</th></tr>)}
                        </thead>
                        <tbody>
                            {modalConfig.data.length > 0 ? modalConfig.data.map((item, idx) => (
                                <tr key={idx}>
                                    {['PARTS', 'LOW_STOCK', 'ALL_STOCK'].includes(modalConfig.type) ? (
                                        <>
                                            <td>{item.part_number}</td>
                                            <td className="fw-bold">{item.part_name}</td>
                                            <td>{item.vendor_name || '-'}</td>
                                            <td className={item.current_stock <= item.min_stock ? "text-danger fw-bold" : "text-success"}>{item.current_stock}</td>
                                        </>
                                    ) : modalConfig.type === 'VENDORS' ? (
                                        <>
                                            <td>{item.name}</td>
                                            <td>{item.contact}</td>
                                            <td>{item.address}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{item.schedule_date || item.request_date}</td>
                                            <td>{item.part_name}</td>
                                            <td className="fw-bold">
                                                {/* PERBAIKAN: Menampilkan angka asli NG */}
                                                {modalConfig.type === 'NG' ? item.display_ng : (item.qty_ok || item.qty_ng || item.plan_qty || item.qty_request)}
                                            </td>
                                            <td>
                                                {/* PERBAIKAN: Badge Kuning jika NG = 0 (sudah di-return) */}
                                                {modalConfig.type === 'PENDING' ? <Badge bg="warning" text="dark">Pending</Badge> : 
                                                 modalConfig.type === 'OK' ? <Badge bg="success">Accepted</Badge> : 
                                                 modalConfig.type === 'NG' ? (
                                                     item.qty_ng === 0 ? <Badge bg="warning" text="dark">Telah Di-Return</Badge> : <Badge bg="danger">Rejected</Badge>
                                                 ) : <Badge bg="info">Request</Badge>}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            )) : <tr><td colSpan="4" className="text-center">Data kosong.</td></tr>}
                        </tbody>
                    </Table>
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowModal(false)}>Tutup</Button></Modal.Footer>
            </Modal>

            {/* MODAL KONTAK VENDOR */}
            <Modal show={showContactModal} onHide={() => setShowContactModal(false)} centered><Modal.Header closeButton className="bg-primary text-white"><Modal.Title>📞 Hubungi Vendor</Modal.Title></Modal.Header><Modal.Body className="text-center">{selectedContact && (<><h5 className="fw-bold mb-1">{selectedContact.name}</h5><Alert variant="warning" className="text-start mt-3"><strong>Part:</strong> {selectedContact.part_name} ({selectedContact.part_number})<br/><strong>Sisa Stok:</strong> <span className="text-danger fw-bold">{selectedContact.current_stock} Pcs</span></Alert><div className="d-grid gap-2 mt-4"><Button variant="success" size="lg" onClick={handleWhatsApp}>💬 WhatsApp</Button><Button variant="outline-dark" as="a" href={`tel:${selectedContact.contact}`}>📞 Telepon</Button></div></>)}</Modal.Body></Modal>
        </div>
    );
};

export default Dashboard;