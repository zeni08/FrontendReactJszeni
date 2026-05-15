import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Button, Container, Row, Col, Alert, Spinner } from 'react-bootstrap';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await axios.post('https://zeni08.pythonanywhere.com/api/login/', {
                username,
                password
            });
            
            // Simpan data user ke LocalStorage
            localStorage.setItem('role', res.data.role);
            localStorage.setItem('username', res.data.username);
            
            // Redirect ke Dashboard
            navigate('/dashboard');
        } catch (err) {
            setError('Username atau Password salah!');
            setLoading(false);
        }
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'linear-gradient(135deg, #003399 0%, #0055cc 100%)', // Warna Biru Suzuki
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '20px 10px' // Ditambahkan padding pelindung agar card tidak menempel ke batas layar atas-bawah HP pendek
        }}>
            <Container>
                {/* Menambahkan w-100 m-0 agar eliminasi bug horizontal scroll bawaan row Bootstrap */}
                <Row className="justify-content-center w-100 m-0">
                    
                    {/* Mengunci skala lebar box secara fleksibel dari HP terkecil hingga Laptop besar */}
                    <Col xs={12} sm={9} md={6} lg={4} xl={4} className="p-0">
                        <Card className="border-0 shadow-lg rounded-4 overflow-hidden">
                            
                            {/* Mengubah p-5 statis menjadi fluid responsive padding (p-4 di HP, p-md-5 di laptop) */}
                            <Card.Body className="p-4 p-md-5">
                                
                                {/* LOGO SUZUKI */}
                                <div className="text-center mb-4">
                                    <img 
                                        src="/logo.png" 
                                        alt="Suzuki Logo" 
                                        style={{ maxWidth: '130px', width: '100%', marginBottom: '10px' }} 
                                    />
                                    {/* Responsive text size dengan fs-6 di HP dan fs-md-5 di PC */}
                                    <h5 className="text-muted fw-bold mt-2 fs-6 fs-md-5">Warehouse System</h5>
                                    <p className="text-muted small mb-0">Silakan login untuk masuk</p>
                                </div>

                                {error && (
                                    <Alert variant="danger" className="text-center py-2 small">
                                        ⚠️ {error}
                                    </Alert>
                                )}

                                <Form onSubmit={handleLogin}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-bold text-secondary small">USERNAME</Form.Label>
                                        <Form.Control 
                                            type="text" 
                                            placeholder="Masukkan username..." 
                                            value={username} 
                                            onChange={(e) => setUsername(e.target.value)} 
                                            required 
                                            className="py-2 bg-light border-0 text-dark shadow-none"
                                            autoFocus
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-4">
                                        <Form.Label className="fw-bold text-secondary small">PASSWORD</Form.Label>
                                        <Form.Control 
                                            type="password" 
                                            placeholder="Masukkan password..." 
                                            value={password} 
                                            onChange={(e) => setPassword(e.target.value)} 
                                            required 
                                            className="py-2 bg-light border-0 text-dark shadow-none"
                                        />
                                    </Form.Group>

                                    {/* Ukuran padding vertikal tombol disesuaikan menjadi py-2.5 agar tebal dan kokoh di mobile screen */}
                                    <Button 
                                        variant="primary" 
                                        type="submit" 
                                        className="w-100 py-2.5 fw-bold shadow-sm border-0 fs-6 animate__animated animate__pulse"
                                        style={{ backgroundColor: '#e30613' }} // Merah Suzuki
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Loading...
                                            </>
                                        ) : (
                                            'LOGIN MASUK 🚀'
                                        )}
                                    </Button>
                                </Form>
                            </Card.Body>
                            <Card.Footer className="text-center bg-light py-3 border-0">
                                <small className="text-muted" style={{ fontSize: '11px', dBlock: 'true' }}>
                                    &copy; 2026 PT Suzuki Indomobil Motor<br/>
                                    IT Dept - Warehouse Division
                                </small>
                            </Card.Footer>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Login;