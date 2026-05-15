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
            const res = await axios.post('http://127.0.0.1:8000/api/login/', {
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
            justifyContent: 'center' 
        }}>
            <Container>
                <Row className="justify-content-center">
                    <Col md={5} lg={4}>
                        <Card className="border-0 shadow-lg rounded-4 overflow-hidden">
                            <Card.Body className="p-5">
                                {/* LOGO SUZUKI */}
                                <div className="text-center mb-4">
                                    <img 
                                        src="/logo.png" 
                                        alt="Suzuki Logo" 
                                        style={{ maxWidth: '140px', marginBottom: '10px' }} 
                                    />
                                    <h5 className="text-muted fw-bold mt-2">Warehouse System</h5>
                                    <p className="text-muted small">Silakan login untuk masuk</p>
                                </div>

                                {error && (
                                    <Alert variant="danger" className="text-center py-2 text-small">
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
                                            className="py-2 bg-light border-0"
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
                                            className="py-2 bg-light border-0"
                                        />
                                    </Form.Group>

                                    <Button 
                                        variant="primary" 
                                        type="submit" 
                                        className="w-100 py-2 fw-bold shadow-sm"
                                        style={{ backgroundColor: '#e30613', borderColor: '#e30613' }} // Merah Suzuki
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
                                <small className="text-muted">
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