import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Basic ${token}`;
            axios.get('http://localhost:8080/api/employee/profile')
                .then(response => {
                    setUser(response.data);
                    setLoading(false);
                })
                .catch(() => {
                    localStorage.removeItem('token');
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (employeeId, password) => {
        const token = btoa(`${employeeId}:${password}`);
        try {
            const response = await axios.get('http://localhost:8080/api/employee/profile', {
                headers: { Authorization: `Basic ${token}` }
            });
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Basic ${token}`;
            setUser(response.data);
            return true;
        } catch (error) {
            console.error('Login failed:', error);
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};