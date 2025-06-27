import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ChevronLeft, Users, FileText, AlertCircle, Calendar, User } from 'lucide-react';
import axios from 'axios';

function ViewResponses() {
    const { id } = useParams();
    const { user ,logout} = useContext(AuthContext);
    const navigate = useNavigate();
    const [responses, setResponses] = useState([]);
    const [formTitle, setFormTitle] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [isResponsesDropdownOpen, setIsResponsesDropdownOpen] = useState(false);
    const [forms, setForms] = useState([]);

    const handleCreateForm = () => {
        navigate('/form/create');
    };
    const handleResponsesClick = () => {
        if (user?.role === 'OWNER') {
            navigate('/owner/responses');
        } else {
            const ownedForms = forms.filter(form => form.ownerEmployeeId === user?.employeeId);
            if (ownedForms.length === 1) {
                navigate(`/form/${ownedForms[0].id}/responses`);
            } else if (ownedForms.length > 1) {
                setIsResponsesDropdownOpen(!isResponsesDropdownOpen);
            }
        }
    };

    const handleViewResponses = (formId) => {
        navigate(`/form/${formId}/responses`);
    };

    const handleDashboardClick = () => {
        navigate(`/dashboard`);
    };



    useEffect(() => {
        const fetchResponses = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`http://localhost:8080/api/employee/form/${id}/responses`, {
                    headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` }
                });
                setResponses(response.data);

                // Fetch form title
                const formResponse = await axios.get(`http://localhost:8080/api/employee/form/${id}`, {
                    headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` }
                });
                setFormTitle(formResponse.data.title);
            } catch (error) {
                console.error('Error fetching responses:', error.response || error);
                setError(`Failed to load responses: ${error.response?.status === 404 ? 'Form not found' : error.response?.status === 403 ? 'Unauthorized access' : 'Server error'}`);
            } finally {
                setLoading(false);
            }
        };
        fetchResponses();
    }, [id, user]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                                <FileText className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">HPCL Form Management</h1>
                                <p className="text-red-100">Hindustan Petroleum Corporation Limited</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                        <span className="ml-3 text-gray-600">Loading responses...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                                <FileText className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">HPCL Form Management</h1>
                                <p className="text-red-100">Hindustan Petroleum Corporation Limited</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                        <div className="flex items-center">
                            <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
                            <div>
                                <h3 className="text-lg font-semibold text-red-800">Error Loading Responses</h3>
                                <p className="text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate(-1)}
                            className="mt-4 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    const ownedForms = forms.filter(form => form.ownerEmployeeId === user?.employeeId);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-lg border-b border-slate-200">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            {/* HPCL Logo */}
                            <div className="w-14 h-14 bg-gradient-to-br from-red-600 via-orange-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
                                <div className="text-center">
                                    <div className="text-white font-bold text-xs leading-none">HPCL</div>
                                    <div className="text-white text-xs opacity-90 leading-none">⚡</div>
                                </div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                    HPCL Digital Workspace
                                </h1>
                                <p className="text-sm text-slate-500 font-medium">Forms Management & Compliance System</p>
                            </div>
                        </div>

                        {user && (
                            <div className="flex items-center space-x-6">
                                {/* Navigation Links */}
                                <div className="flex items-center space-x-4">
                                    <div className="relative">
                                        <button
                                            onClick={handleDashboardClick}
                                            className="text-slate-600 hover:text-blue-600 font-medium transition-colors duration-200 mr-5"
                                        >
                                            Dashboard
                                        </button>
                                        <button
                                            onClick={handleResponsesClick}
                                            className={`text-slate-600 hover:text-blue-600 font-medium transition-colors duration-200 ${ownedForms.length === 0 && user.role !== 'OWNER' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={ownedForms.length === 0 && user.role !== 'OWNER'}
                                        >
                                            Responses
                                        </button>
                                        {user?.role === 'EMPLOYEE' && ownedForms.length > 1 && isResponsesDropdownOpen && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                                                <div className="py-1">
                                                    {ownedForms.map(form => (
                                                        <button
                                                            key={form.id}
                                                            onClick={() => {
                                                                handleViewResponses(form.id);
                                                                setIsResponsesDropdownOpen(false);
                                                            }}
                                                            className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                                                        >
                                                            {form.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleCreateForm}
                                        className="text-slate-600 hover:text-blue-600 font-medium transition-colors duration-200"
                                    >
                                        Create Form
                                    </button>
                                </div>
                                {/* User Info Card */}
                                <div className="bg-slate-50 rounded-lg px-4 py-2 border border-slate-200">
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-slate-800">{user.employeeName}</p>
                                        <div className="flex items-center justify-end space-x-2">
                                            <span className="text-xs text-slate-500">ID: {user.employeeId}</span>
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize font-medium">
                                                {user.role.toLowerCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={logout}
                                    className="bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 px-4 py-2 rounded-lg transition-all duration-200 border border-slate-200 hover:border-red-300 font-medium flex items-center space-x-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Navigation and Title */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(`/form/${id}`)}
                        className="inline-flex items-center px-4 py-2 text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors mb-4"
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back to Form
                    </button>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Form Responses</h2>
                                <p className="text-lg text-gray-700 font-medium">{formTitle}</p>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center">
                                    <Users className="w-4 h-4 mr-1" />
                                    <span>{responses.length} {responses.length === 1 ? 'Response' : 'Responses'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Responses */}
                {responses.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Responses Yet</h3>
                        <p className="text-gray-600">This form hasn't received any responses yet. Check back later.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {responses.map((response, index) => (
                            <div key={response.responseId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                {/* Response Header */}
                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                                <User className="w-5 h-5 text-red-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {response.employeeName}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    Employee ID: {response.employeeId}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center text-sm text-gray-500">
                                            <Calendar className="w-4 h-4 mr-1" />
                                            <span>{formatDate(response.submittedAt)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Response Content */}
                                <div className="p-6">
                                    <div className="space-y-6">
                                        {response.responses.map((field, fieldIndex) => (
                                            <div key={field.fieldId} className="border-l-4 border-red-500 pl-4">
                                                <div className="mb-2">
                                                    <p className="text-sm font-medium text-gray-900 mb-1">
                                                        Question {fieldIndex + 1}
                                                    </p>
                                                    <p className="text-base font-semibold text-gray-800">
                                                        {field.question}
                                                    </p>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-4">
                                                    <p className="text-gray-800 leading-relaxed">
                                                        {field.value || (
                                                            <span className="text-gray-500 italic">No answer provided</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            © 2025 Hindustan Petroleum Corporation Limited. All rights reserved.
                        </p>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-500">
                                Logged in as: {user?.employeeName || user?.employeeId}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ViewResponses;