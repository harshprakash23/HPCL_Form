import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import FormCreate from './components/FormCreate';
import FormView from './components/FormView';
import EditForm from './components/EditForm';
import FillForm from './components/FillForm';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import ViewResponses from "./components/ViewResponses";
import OwnerResponses from "./components/OwnerResponses";
// PrivateRoute component to protect routes
function PrivateRoute({ children }) {
    const { user } = useContext(AuthContext);
    return user ? children : <Navigate to="/login" />;
}

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                    path="/dashboard"
                    element={
                        <PrivateRoute>
                            <Dashboard />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/form/create"
                    element={
                        <PrivateRoute>
                            <FormCreate />
                        </PrivateRoute>
                    }
                />
                <Route path="/owner/responses" element={<OwnerResponses />} />

                <Route
                    path="/form/:id"
                    element={
                        <PrivateRoute>
                            <FormView />
                        </PrivateRoute>
                    }
                />
                <Route path="/form/:id/responses"
                       element={
                    <PrivateRoute>
                          <ViewResponses />
                    </PrivateRoute>
                }
                />
                <Route
                    path="/form/:id/edit"
                    element={
                        <PrivateRoute>
                            <EditForm />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/form/:id/fill"
                    element={
                        <PrivateRoute>
                            <FillForm />
                        </PrivateRoute>
                    }
                />
                <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
        </Router>
    );
}

export default App;