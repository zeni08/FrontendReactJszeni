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
            // Ambil data jadwal receiving berdasarkan ID
            const res = await axios.get(`https://zeni08.pythonanywhere.com/api/schedule/${id}/`);
            setSchedule(res.data);
            // Isi default Qty OK dengan Plan Qty & Batch Number
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
        // Ambil file binary asli untuk dikirim lewat FormData
        setFormData({ ...formData, repair_photo: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // SIAPKAN DATA UNTUK DIKIRIM (Wajib FormData untuk binary/file)
        const sendData = new FormData();
        // DISINKRONKAN: Gunakan 'receiving_schedule' sesuai Serializer Django
        sendData.append('receiving_schedule', id); 
        sendData.append('qty_check', schedule.plan_qty);
        sendData.append('qty_ok', formData.qty_ok);
        sendData.append('qty_ng', formData.qty_ng);
        sendData.append('final_judgement', formData.final_judgement);
        sendData.append('description', formData.description);
        sendData.append('inspector_name', formData.inspector_name);
        sendData.append('shift', formData.shift);
        sendData.append('work_station', formData.work_station);
        
        // Kirim foto hanya jika ada file yang diunggah
        if (formData.repair_photo) {
            sendData.append('repair_photo', formData.repair_photo);
        }

        try {
            // 1. SIMPAN HASIL QC KE DATABASE SUZUKI
            await axios.post('https://zeni08.pythonanywhere.com/api/inspections/', sendData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // 2. UPDATE BATCH NUMBER & STATUS JADWAL
            await axios.patch(`https://zeni08.pythonanywhere.com/api/schedule/${id}/`, {
                batch_number: formData.batch_number,
                status: 'COMPLETED'
            });

            // 3. UPDATE STOK PART (Hanya jika ada barang OK)
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
        <Container className="py-5" style={{ maxWidth: '800px' }}>
            <Card className="shadow border-0">
                <Card.Header className="bg-primary text-white text-center py-3">
                    <h4 className="mb-0 fw-bold">FORM INSPEKSI QC (INPUT)</h4>
                    <small>PT Suzuki Indomobil Motor - Incoming Inspection</small>
                </Card.Header>
                <Card.Body className="p-4">
                    
                    {/* INFO PART */}
                    <div className="text-center mb-4">
                        <h2 className="fw-bold text-dark">{schedule.part_name}</h2>
                        <p className="text-muted mb-1">{schedule.part_number}</p>
                        <Badge bg="info" className="fs-6">{schedule.vendor_name}</Badge>
                    </div>

                    <Form onSubmit={handleSubmit}>
                        <Row className="mb-3">
                            {/* KOLOM KIRI: DATA INSPEKTOR */}
                            <Col md={6}>
                                <Card className="bg-light border-0 p-3 mb-3">
                                    <h6 className="fw-bold text-primary">👷 Identitas Inspektor</h6>
                                    <Form.Group className="mb-2">
                                        <Form.Label>Nama Inspektor</Form.Label>
                                        <Form.Control type="text" value={formData.inspector_name} readOnly className="fw-bold bg-white" />
                                    </Form.Group>
                                    <Row>
                                        <Col>
                                            <Form.Group>
                                                <Form.Label>Shift</Form.Label>
                                                <Form.Select 
                                                    value={formData.shift} 
                                                    onChange={e => setFormData({...formData, shift: e.target.value})}
                                                    className="border-primary"
                                                >
                                                    <option value="1">Shift 1 (Pagi)</option>
                                                    <option value="2">Shift 2 (Sore)</option>
                                                    <option value="3">Shift 3 (Malam)</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col>
                                            <Form.Group>
                                                <Form.Label>Work Station</Form.Label>
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
                            <Col md={6}>
                                <Card className="bg-warning bg-opacity-10 border-warning p-3 mb-3">
                                    <h6 className="fw-bold text-dark">📦 Traceability (Batch/Lot)</h6>
                                    <Form.Group className="mb-2">
                                        <Form.Label>Batch / Lot Number</Form.Label>
                                        <Form.Control 
                                            type="text" 
                                            placeholder="Scan / Input No. Batch" 
                                            value={formData.batch_number}
                                            onChange={e => setFormData({...formData, batch_number: e.target.value})}
                                            className="fw-bold border-warning"
                                            required
                                        />
                                        <Form.Text className="text-muted small">* Wajib sesuai standar IATF.</Form.Text>
                                    </Form.Group>
                                </Card>
                            </Col>
                        </Row>

                        <hr />

                        <h5 className="fw-bold mb-3">📊 Hasil Pemeriksaan</h5>
                        <Row className="mb-3">
                            <Col>
                                <Form.Group>
                                    <Form.Label className="text-success fw-bold">QTY OK (Good)</Form.Label>
                                    <Form.Control 
                                        type="number" 
                                        className="text-success fw-bold fs-4 text-center border-success"
                                        value={formData.qty_ok}
                                        onChange={(e) => handleQtyChange('qty_ok', e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group>
                                    <Form.Label className="text-danger fw-bold">QTY NG (Defect)</Form.Label>
                                    <Form.Control 
                                        type="number" 
                                        className="text-danger fw-bold fs-4 text-center border-danger"
                                        value={formData.qty_ng}
                                        onChange={(e) => handleQtyChange('qty_ng', e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Alert variant={formData.final_judgement === 'OK' ? 'success' : 'danger'} className="text-center fw-bold fs-5 shadow-sm">
                            STATUS AKHIR: {formData.final_judgement}
                        </Alert>

                        <Form.Group className="mb-3">
                            <Form.Label>Keterangan / Deskripsi Defect</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={2} 
                                placeholder="Jelaskan detail masalah jika ada..." 
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="fw-bold text-primary">📸 Upload Foto Bukti (Visual Evidence)</Form.Label>
                            <Form.Control type="file" accept="image/*" onChange={handleFileChange} />
                        </Form.Group>

                        <div className="d-grid gap-2">
                            <Button variant="primary" size="lg" type="submit" className="fw-bold shadow">
                                💾 SIMPAN & UPDATE STOK
                            </Button>
                            <Button variant="outline-secondary" onClick={() => navigate('/schedule')}>
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