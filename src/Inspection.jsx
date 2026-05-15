import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import axios from 'axios';

const Inspection = () => {
    const { scheduleId } = useParams();
    const navigate = useNavigate();
    const [schedule, setSchedule] = useState(null);
    
    const [qtyOK, setQtyOK] = useState(0);
    const [qtyNG, setQtyNG] = useState(0);
    const [description, setDescription] = useState('');
    const [photo, setPhoto] = useState(null);

    const username = localStorage.getItem('username') || 'Unknown User';

    useEffect(() => {
        if (scheduleId) {
            axios.get(`https://zeni08.pythonanywhere.com/api/schedules/${scheduleId}/`)
                .then(res => {
                    setSchedule(res.data);
                    setQtyNG(res.data.plan_qty); 
                })
                .catch(err => console.error(err));
        }
    }, [scheduleId]);

    const handleQtyOKChange = (val) => {
        const ok = parseInt(val) || 0;
        
        if (schedule && ok > schedule.plan_qty) {
            alert("Qty OK tidak boleh melebihi Plan Qty!");
            return;
        }

        setQtyOK(ok);

        if (schedule) setQtyNG(schedule.plan_qty - ok);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (schedule && (qtyOK + qtyNG) !== schedule.plan_qty) {
            alert("Total (OK + NG) harus sama dengan Plan Qty!");
            return;
        }

        const formData = new FormData();
        formData.append('receiving_schedule', scheduleId); 
        formData.append('qty_check', schedule.plan_qty);
        formData.append('qty_ok', qtyOK);
        formData.append('qty_ng', qtyNG);
        formData.append('final_judgement', qtyNG === 0 ? 'OK' : 'NG');
        formData.append('description', description); 
        
        // NAMA INSPECTOR OTOMATIS
        formData.append('inspector_name', username);

        if (photo) {
            formData.append('defect_photo', photo); 
        }

        try {
            await axios.post('https://zeni08.pythonanywhere.com/api/inspections/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' } 
            });
            
            await axios.patch(`https://zeni08.pythonanywhere.com/api/schedules/${scheduleId}/`, { status: 'COMPLETED' });

            alert(`Inspeksi Selesai!\nInspector: ${username}\nStatus: ${qtyNG === 0 ? 'OK' : 'NG'}`);
            navigate('/qc-report');
        } catch (error) {
            console.error(error);
            alert("Gagal menyimpan inspection.");
        }
    };

    if (!schedule) return <div className="p-5 text-center">Loading Data...</div>;

    return (
        // Ditambahkan padding responsive p-3 p-md-4 agar jarak pinggiran pas di HP & Desktop
        <div className="d-flex justify-content-center align-items-center p-3 p-md-4" style={{ minHeight: '100vh', backgroundColor: '#f4f6f9' }}>
            
            {/* Mengubah width statis menjadi fluid responsive (width: 100%, max-width: 600px) */}
            <Card style={{ width: '100%', maxWidth: '600px' }} className="shadow border-0">
                <Card.Header className="bg-primary text-white fw-bold text-center py-3">
                    <h4 className="mb-0 fs-5 fs-md-4">FORM INSPEKSI QC</h4>
                </Card.Header>
                <Card.Body className="p-3 p-md-4">
                    
                    <div className="mb-4 text-center">
                        <h5 className="fw-bold text-wrap">{schedule.part_name}</h5>
                        <p className="text-muted mb-1 text-wrap">{schedule.vendor_name}</p>
                        <h2 className="fw-bold text-primary fs-3 fs-md-2">{schedule.plan_qty} <span className="fs-6 text-muted fw-normal">Pcs (Plan)</span></h2>
                    </div>

                    <Form onSubmit={handleSubmit}>
                        
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Inspector (PIC)</Form.Label>
                            <Form.Control 
                                type="text" 
                                value={username} 
                                readOnly 
                                disabled
                                className="bg-light fw-bold text-dark"
                            />
                            <Form.Text className="text-muted small">*Otomatis terisi nama Anda.</Form.Text>
                        </Form.Group>

                        {/* Diubah menjadi g-3 agar punya jarak renggang vertikal saat terbelah di HP */}
                        <Row className="g-3 mb-3">
                            {/* xs={12} = bertumpuk ke bawah di HP, sm={6} = berjejer horizontal di Laptop */}
                            <Col xs={12} sm={6}>
                                <Form.Label className="fw-bold text-success">QTY OK</Form.Label>
                                <Form.Control 
                                    type="number" 
                                    value={qtyOK} 
                                    onChange={(e) => handleQtyOKChange(e.target.value)}
                                    max={schedule.plan_qty}
                                    min={0}
                                    required
                                    className="text-center fw-bold fs-4 border-success"
                                />
                            </Col>
                            <Col xs={12} sm={6}>
                                <Form.Label className="fw-bold text-danger">QTY NG</Form.Label>
                                <Form.Control 
                                    type="number" 
                                    value={qtyNG} 
                                    readOnly 
                                    className="text-center fw-bold fs-4 bg-light text-danger border-danger"
                                />
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Keterangan / Deskripsi Defect</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={3} 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Contoh: Lecet bagian kiri, Retak halus..."
                            />
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="fw-bold">Upload Foto Defect (Jika ada NG)</Form.Label>
                            <Form.Control 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => setPhoto(e.target.files[0])}
                                className="small"
                            />
                        </Form.Group>

                        <div className="d-grid gap-2">
                            <Button type="submit" variant="primary" size="lg" className="fw-bold py-2.5 fs-6">
                                SIMPAN HASIL QC
                            </Button>
                            <Button variant="secondary" className="py-2 fs-6" onClick={() => navigate('/schedule')}>
                                Batal
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
};

export default Inspection;