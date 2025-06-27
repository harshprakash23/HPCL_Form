import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Dashboard() {
    const { user, logout, loading } = useContext(AuthContext);
    const navigate = useNavigate();
    const [forms, setForms] = useState([]);
    const [recentActivities, setRecentActivities] = useState([]);
    const [error, setError] = useState('');
    const [isResponsesDropdownOpen, setIsResponsesDropdownOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('newest');

    useEffect(() => {
        if (!user && !loading) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        const fetchForms = async () => {
            try {
                const response = await axios.get('http://localhost:8080/api/employee/forms', {
                    headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` }
                });
                setForms(response.data);
            } catch (error) {
                setError('Failed to load forms');
                console.error('Error fetching forms:', error.response || error);
            }
        };

        const fetchRecentActivities = async () => {
            try {
                const response = await axios.get('http://localhost:8080/api/employee/recent-activity', {
                    headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` }
                });
                setRecentActivities(response.data);
            } catch (error) {
                console.error('Error fetching recent activities:', error.response || error);
                setRecentActivities([]);
            }
        };

        if (user) {
            fetchForms();
            fetchRecentActivities();
        }
    }, [user]);

    const handleCreateForm = () => {
        navigate('/form/create');
    };

    const handleViewResponses = (formId) => {
        navigate(`/form/${formId}/responses`);
    };

    const handleResponsesClick = () => {
        if (user?.role === 'OWNER') {
            navigate('/responses');
        } else {
            const ownedForms = forms.filter(form => form.ownerEmployeeId === user?.employeeId);
            if (ownedForms.length === 1) {
                navigate(`/form/${ownedForms[0].id}/responses`);
            } else if (ownedForms.length > 1) {
                setIsResponsesDropdownOpen(!isResponsesDropdownOpen);
            }
        }
    };

    const getFormTypeIcon = (title) => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('safety') || lowerTitle.includes('incident')) {
            return (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
            );
        } else if (lowerTitle.includes('maintenance') || lowerTitle.includes('equipment')) {
            return (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            );
        } else if (lowerTitle.includes('training') || lowerTitle.includes('certificate')) {
            return (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            );
        } else if (lowerTitle.includes('environment') || lowerTitle.includes('compliance')) {
            return (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        }
        return (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        );
    };

    const getFormPriority = (title) => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('safety') || lowerTitle.includes('incident')) return 'High';
        if (lowerTitle.includes('maintenance') || lowerTitle.includes('compliance')) return 'Medium';
        return 'Normal';
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return 'bg-red-100 text-red-800 border-red-200';
            case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-green-100 text-green-800 border-green-200';
        }
    };

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSeconds < 60) return 'just now';
        if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
        if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
        if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        return time.toLocaleDateString('en-IN');
    };

    // MODIFICATION: Added 'DELETE' case and changed 'UPDATE' to 'UPDATE_RESPONSE'
    const getActivityIconAndColor = (actionType) => {
        switch (actionType) {
            case 'CREATE':
                return { icon: (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    ), bgColor: 'bg-green-100' };
            case 'SUBMIT':
                return { icon: (
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ), bgColor: 'bg-blue-100' };
            case 'UPDATE_RESPONSE':
                return { icon: (
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    ), bgColor: 'bg-yellow-100' };
            case 'DELETE':
            case 'DELETE_RESPONSE':
                return { icon: (
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    ), bgColor: 'bg-red-100' };
            case 'STATUS_CHANGE':
                return { icon: (
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    ), bgColor: 'bg-purple-100' };
            case 'VIEW':
            default:
                return { icon: (
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    ), bgColor: 'bg-blue-100' };
        }
    };

    // MODIFICATION: Added 'DELETE' case and changed 'UPDATE' to 'UPDATE_RESPONSE' with a clearer description.
    const getActivityDescription = (activity) => {
        switch (activity.actionType) {
            case 'CREATE':
                return `created the form`;
            case 'SUBMIT':
                return `submitted a response for`;
            case 'UPDATE_RESPONSE':
                return `updated a response for`;
            case 'DELETE':
                return `deleted the form`;
            case 'DELETE_RESPONSE':
                return `deleted a response for`;
            case 'STATUS_CHANGE':
                return `changed the status for`;
            case 'VIEW':
            default:
                return `viewed the form`;
        }
    };

    const ownedForms = forms.filter(form => form.ownerEmployeeId === user?.employeeId);

    const filteredForms = forms
        .filter(form => form.title.toLowerCase().includes(searchTerm.toLowerCase()))
        .filter(form => {
            if (filter === 'active') return form.active;
            if (filter === 'inactive') return !form.active;
            return true;
        })
        .sort((a, b) => {
            switch (filter) {
                case 'newest':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'oldest':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'alphabetical':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });


    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Header Section */}
            <div className="bg-white shadow-lg border-b border-slate-200">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
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
                                <div className="flex items-center space-x-4">
                                    <div className="relative">
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
            <div className="container mx-auto px-6 py-8">
                {user && (
                    <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-8 mb-8 text-white overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-8 translate-x-8"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full translate-y-8 -translate-x-8"></div>
                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold mb-2">Welcome back, {user.employeeName}!</h2>
                            <p className="text-blue-100 text-lg mb-4">
                                Streamline your operations with HPCL's integrated digital platform for enhanced productivity and compliance.
                            </p>
                            <div className="flex items-center space-x-6 text-sm">
                                <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-blue-100">Today: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-blue-100">Total Forms: {forms.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 mb-1">Form Management</h3>
                            <p className="text-slate-600">Create, manage, and track your operational forms</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <input
                                    type="text"
                                    placeholder="Search by form name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 w-64 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div className="relative">
                                <select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="appearance-none w-48 bg-white border border-slate-300 text-slate-700 py-2 pl-3 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="newest">Sort by Newest</option>
                                    <option value="oldest">Sort by Oldest</option>
                                    <option value="alphabetical">Sort Alphabetical (A-Z)</option>
                                    <option value="active">Show Active Only</option>
                                    <option value="inactive">Show Inactive Only</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 shadow-sm">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <h4 className="font-medium">Error Loading Forms</h4>
                                <p className="text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    {filteredForms.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-200">
                            <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Matching Forms</h3>
                            <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                No forms match your current search or filter criteria. Try adjusting your search.
                            </p>
                            <button
                                onClick={() => { setSearchTerm(''); setFilter('newest'); }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                            >
                                Clear Search & Filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredForms.map(form => {
                                const priority = getFormPriority(form.title);
                                const isOwner = form.ownerEmployeeId === user?.employeeId;
                                return (
                                    <div key={form.id} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-blue-300 group overflow-hidden">
                                        <div className="p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                                    {getFormTypeIcon(form.title)}
                                                </div>
                                                <span className={`text-xs px-3 py-1 rounded-full border font-medium ${getPriorityColor(priority)}`}>
                                                        {priority}
                                                    </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors duration-200 line-clamp-2">
                                                {form.title}
                                            </h3>
                                            <div className="space-y-2 mb-6">
                                                <div className="flex items-center text-sm text-slate-500">
                                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    <span className="font-medium">Owner:</span>
                                                    <span className="ml-1">{form.ownerEmployeeId}</span>
                                                </div>
                                                <div className="flex items-center text-sm text-slate-500">
                                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="font-medium">Status:</span>
                                                    {form.active ? (
                                                        <span className="ml-1 text-green-600 font-semibold">Active</span>
                                                    ) : (
                                                        <span className="ml-1 text-red-600 font-semibold">Inactive</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => navigate(`/form/${form.id}`)}
                                                    className="flex-1 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 py-3 px-4 rounded-lg transition-all duration-200 border border-slate-200 hover:border-blue-300 font-semibold flex items-center justify-center space-x-2 group-hover:shadow-md"
                                                >
                                                    <span>View Form</span>
                                                    <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                                {isOwner && (
                                                    <button
                                                        onClick={() => handleViewResponses(form.id)}
                                                        className="flex-1 bg-slate-50 hover:bg-green-50 text-slate-700 hover:text-green-600 py-3 px-4 rounded-lg transition-all duration-200 border border-slate-200 hover:border-green-300 font-semibold flex items-center justify-center space-x-2 group-hover:shadow-md"
                                                    >
                                                        <span>View Responses</span>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mb-8 mt-12">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Recent Activity</h3>
                    {recentActivities.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
                            <p className="text-slate-500">No recent activity to display.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-h-96 overflow-y-auto">
                            <ul className="space-y-4">
                                {recentActivities.map((activity, index) => {
                                    const { icon, bgColor } = getActivityIconAndColor(activity.actionType);
                                    return (
                                        <li key={index} className="flex items-start space-x-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgColor}`}>
                                                {icon}
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-800">
                                                    <span className="font-medium">{activity.employeeName} ({activity.employeeId})</span>{' '}
                                                    {getActivityDescription(activity)}{' '}
                                                    <span className="font-medium">'{activity.formTitle}'</span>
                                                </p>
                                                <p className="text-xs text-slate-500">{formatTimeAgo(activity.timestamp)}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;