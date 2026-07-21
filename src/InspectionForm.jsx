import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Badge, Alert, Container } from 'react-bootstrap';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const InspectionForm = () => {
    const { id } = useParams(); // ID Schedule
    const navigate = useNavigate();
    
    // DATA DARI BACKEND
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);

    // FORM STATE
    const [formData, setFormData] = useState({
        qty_ok: 0,
        qty_ng: 0,
        final_judgement: 'OK',
        description: '',
        inspector_name: localStorage.getItem('username') || 'Inspector', // Auto nama user
        shift: '1',     // Default Shift 1
        work_station: 'Receiving Area',
        batch_number: '', // Fitur Traceability
        repair_photo: null // DISINKRONKAN: Sesuai nama kolom di db.sqlite3
    });

    // AUTO DETEKSI SHIFT BERDASARKAN JAM SEKARANG
    useEffect(() => {
        const hour = new Date().getHours();
        let currentShift = '1';
        if (hour >= 7 && hour < 15) currentShift = '1';       // 07:00 - 15:00
        else if (hour >= 15 && hour < 23) currentShift = '2'; // 15:00 - 23:00
        else currentShift = '3';                              // 23:00 - 07:00
        
        setFormData(prev => ({ ...prev, shift: currentShift }));
        fetchSchedule();
    }, []);

    const fetchSchedule = async () => {
        try {
            const res = await axios.get(`https://zeni08.pythonanywhere.com/api/schedule/${id}/`);
            setSchedule(res.data);
            setFormData(prev => ({ 
                ...prev, 
                qty_ok: res.data.plan_qty, 
                batch_number: res.data.batch_number || '' 
            }));
            setLoading(false);
        } catch (error) {
            alert("Data Jadwal tidak ditemukan!");
            navigate('/schedule');
        }
    };

    // LOGIKA PERHITUNGAN OTOMATIS
    const handleQtyChange = (field, value) => {
        const val = parseInt(value) || 0;
        const totalPlan = schedule?.plan_qty || 0;

        if (field === 'qty_ok') {
            const newNG = totalPlan - val;
            setFormData(prev => ({
                ...prev, 
                qty_ok: val, 
                qty_ng: newNG < 0 ? 0 : newNG,
                final_judgement: (newNG > 0) ? 'NG' : 'OK'
            }));
        } else if (field === 'qty_ng') {
            const newOK = totalPlan - val;
            setFormData(prev => ({
                ...prev, 
                qty_ng: val, 
                qty_ok: newOK < 0 ? 0 : newOK,
                final_judgement: (val > 0) ? 'NG' : 'OK'
            }));
        }
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, repair_photo: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const sendData = new FormData();
        sendData.append('receiving_schedule', id); 
        sendData.append('qty_check', schedule.plan_qty);
        sendData.append('qty_ok', formData.qty_ok);
        sendData.append('qty_ng', formData.qty_ng);
        sendData.append('final_judgement', formData.final_judgement);
        sendData.append('description', formData.description);
        sendData.append('inspector_name', formData.inspector_name);
        sendData.append('shift', formData.shift);
        sendData.append('work_station', formData.work_station);
        
        if (formData.repair_photo) {
            sendData.append('repair_photo', formData.repair_photo);
        }

        try {
            await axios.post('https://zeni08.pythonanywhere.com/api/inspections/', sendData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            await axios.patch(`https://zeni08.pythonanywhere.com/api/schedule/${id}/`, {
                batch_number: formData.batch_number,
                status: 'COMPLETED'
            });

            if (formData.qty_ok > 0) {
                const partRes = await axios.get(`https://zeni08.pythonanywhere.com/api/parts/${schedule.part}/`);
                const currentStock = partRes.data.current_stock;
                
                await axios.patch(`https://zeni08.pythonanywhere.com/api/parts/${schedule.part}/`, {
                    current_stock: currentStock + parseInt(formData.qty_ok)
                });
            }

            alert("✅ INSPEKSI SELESAI! Data & Foto berhasil disimpan ke Database.");
            navigate('/qc-report');

        } catch (error) {
            console.error("Gagal simpan:", error.response?.data);
            alert("⛔ Gagal menyimpan data. Pastikan format foto benar dan koneksi Backend aktif.");
        }
    };

    if (loading) return <div className="text-center p-5">Loading Data Sistem Suzuki...</div>;

    return (
        // Ditambahkan padding p-2 p-md-5 agar pas dibuka di HP pinggirannya tidak terlalu mepet screen
        <Container className="p-2 p-md-5" style={{ maxWidth: '800px' }}>
            <Card className="shadow border-0 animate__animated animate__fadeIn">
                <Card.Header className="bg-primary text-white text-center py-3 px-2">
                    <h4 className="mb-0 fw-bold fs-5 fs-md-4">FORM INSPEKSI QC (INPUT)</h4>
                    <small className="d-block mt-1 small">PT Suzuki Indomobil Motor - Incoming Inspection</small>
                </Card.Header>
                <Card.Body className="p-3 p-md-4">
                    
                    {/* INFO PART RESPONSIVE TEXT */}
                    <div className="text-center mb-4 px-2">
                        <h3 className="fw-bold text-dark fs-4 fs-md-2 text-wrap">{schedule.part_name}</h3>
                        <p className="text-muted mb-2 small fw-mono">{schedule.part_number}</p>
                        <Badge bg="info" className="fs-6 text-wrap max-w-100">{schedule.vendor_name}</Badge>
                    </div>

                    <Form onSubmit={handleSubmit}>
                        {/* Menggunakan g-3 agar saat kotak kiri & kanan menumpuk di HP, mereka ada jarak vertikal */}
                        <Row className="g-3 mb-3">
                            
                            {/* KOLOM KIRI: DATA INSPEKTOR (xs=12 artinya full-width di HP, md=6 sejajar di laptop) */}
                            <Col xs={12} md={6}>
                                <Card className="bg-light border-0 p-3 h-100">
                                    <h6 className="fw-bold text-primary mb-3">Identitas Inspektor</h6>
                                    <Form.Group className="mb-2">
                                        <Form.Label className="small fw-bold">Nama Inspektor</Form.Label>
                                        <Form.Control type="text" value={formData.inspector_name} readOnly className="fw-bold bg-white" />
                                    </Form.Group>
                                    
                                    {/* Memperbaiki baris dalam agar Shift dan Work Station terbelah vertikal saat di HP (xs={12}) */}
                                    <Row className="g-2">
                                        <Col xs={12} sm={5}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold">Shift</Form.Label>
                                                <Form.Select 
                                                    value={formData.shift} 
                                                    onChange={e => setFormData({...formData, shift: e.target.value})}
                                                    className="border-primary"
                                                >
                                                    <option value="1">1 (Pagi)</option>
                                                    <option value="2">2 (Sore)</option>
                                                    <option value="3">3 (Malam)</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col xs={12} sm={7}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold">Work Station</Form.Label>
                                                <Form.Control 
                                                    type="text" 
                                                    value={formData.work_station}
                                                    onChange={e => setFormData({...formData, work_station: e.target.value})} 
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Card>
                            </Col>

                            {/* KOLOM KANAN: TRACEABILITY */}
                            <Col xs={12} md={6}>
                                <Card className="bg-warning bg-opacity-10 border-warning p-3 h-100">
                                    <h6 className="fw-bold text-dark mb-3">🎯 📦 Traceability (Batch/Lot)</h6>
                                    <Form.Group className="mb-2">
                                        <Form.Label className="small fw-bold">Batch / Lot Number</Form.Label>
                                        <Form.Control 
                                            type="text" 
                                            placeholder="Scan / Input No. Batch" 
                                            value={formData.batch_number}
                                            onChange={e => setFormData({...formData, batch_number: e.target.value})}
                                            className="fw-bold border-warning"
                                            required
                                        />
                                        <Form.Text className="text-muted small d-block mt-1">* Wajib sesuai standar IATF PT SIM.</Form.Text>
                                    </Form.Group>
                                </Card>
                            </Col>
                        </Row>

                        <hr className="my-4" />

                        <h5 className="fw-bold mb-3 fs-6 fs-md-5">📊 Hasil Pemeriksaan (Plan Qty: {schedule.plan_qty} Pcs)</h5>
                        
                        {/* Mengubah input QTY OK dan NG agar turun ke bawah di HP (xs={12}) dan sejajar di laptop (sm={6}) */}
                        <Row className="g-3 mb-3">
                            <Col xs={12} sm={6}>
                                <Form.Group>
                                    <Form.Label className="text-success fw-bold small">QTY OK (Good)</Form.Label>
                                    <Form.Control 
                                        type="number" 
                                        className="text-success fw-bold fs-4 text-center border-success py-2"
                                        value={formData.qty_ok}
                                        onChange={(e) => handleQtyChange('qty_ok', e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col xs={12} sm={6}>
                                <Form.Group>
                                    <Form.Label className="text-danger fw-bold small">QTY NG (Defect)</Form.Label>
                                    <Form.Control 
                                        type="number" 
                                        className="text-danger fw-bold fs-4 text-center border-danger py-2"
                                        value={formData.qty_ng}
                                        onChange={(e) => handleQtyChange('qty_ng', e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Alert variant={formData.final_judgement === 'OK' ? 'success' : 'danger'} className="text-center fw-bold fs-5 shadow-sm py-2">
                            STATUS AKHIR: {formData.final_judgement}
                        </Alert>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Keterangan / Deskripsi Defect</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={2} 
                                placeholder="Jelaskan detail masalah jika ada..." 
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="fw-bold text-primary small">📸 Upload Foto Bukti (Visual Evidence)</Form.Label>
                            <Form.Control type="file" accept="image/*" className="small" onChange={handleFileChange} />
                        </Form.Group>

                        {/* Button menggunakan d-grid gap-2 agar full lebar di mobile, sangat nyaman disentuh jari */}
                        <div className="d-grid gap-2">
                            <Button variant="primary" size="lg" type="submit" className="fw-bold shadow py-2.5 fs-6">
                                💾 SIMPAN & UPDATE STOK
                            </Button>
                            <Button variant="outline-secondary" className="py-2 fs-6" onClick={() => navigate('/schedule')}>
                                Batal
                            </Button>
                        </div>

                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default InspectionForm;