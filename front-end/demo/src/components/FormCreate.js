import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    Plus,
    Trash2,
    FileText,
    AlertCircle,
    CheckCircle,
    Mail,
    Calendar,
    Hash,
    Search,
    Text as TextIcon,
    CheckSquare,
    Settings,
    Save,
    Building2,
    File,
    Users,
    ArrowLeft
} from 'lucide-react';
import { CgRadioChecked } from "react-icons/cg";
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

function FormCreate() {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        formContent: { fields: [], levelAssignments: {} },
        numLevels: 1,
        levelAssignments: [{ levelNumber: 1, employeeIds: [] }],
        levelPriorityOrder: [1],
        ownerEmployeeId: user?.employeeId
    });
    const [employees, setEmployees] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [employeesLoading, setEmployeesLoading] = useState(true);
    const [expandedFields, setExpandedFields] = useState({});
    const [searchTerms, setSearchTerms] = useState({});

    useEffect(() => {
        const fetchEmployees = async () => {
            setEmployeesLoading(true);
            try {
                const response = await axios.get('http://localhost:8080/api/employee/all', {
                    headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` }
                });
                setEmployees(response.data);
            } catch (error) {
                console.error('Error fetching employees:', error);
                setError('Failed to load employees');
            } finally {
                setEmployeesLoading(false);
            }
        };
        fetchEmployees();
    }, [user]);

    const handleSearchChange = (levelIndex, searchTerm) => {
        setSearchTerms(prev => ({
            ...prev,
            [levelIndex]: searchTerm
        }));
    };

    const handleNumLevelsChange = (e) => {
        const value = parseInt(e.target.value) || 1;
        setFormData(prev => ({
            ...prev,
            numLevels: value,
            levelAssignments: Array.from({ length: value }, (_, i) => ({
                levelNumber: i + 1,
                employeeIds: prev.levelAssignments[i]?.employeeIds || []
            })),
            levelPriorityOrder: Array.from({ length: value }, (_, i) => i + 1)
        }));
    };

    const handleLevelPriorityOrderChange = (e) => {
        const input = e.target.value;
        const levels = input
            .split(',')
            .map(num => parseInt(num.trim()))
            .filter(num => !isNaN(num) && num >= 1 && num <= formData.numLevels);
        if (new Set(levels).size === levels.length && levels.length <= formData.numLevels) {
            setFormData(prev => ({
                ...prev,
                levelPriorityOrder: levels
            }));
        }
    };

    const validateLevelPriorityOrder = () => {
        const expectedLevels = Array.from({ length: formData.numLevels }, (_, i) => i + 1);
        const levelSet = new Set(formData.levelPriorityOrder);
        return expectedLevels.every(level => levelSet.has(level)) && levelSet.size === formData.numLevels;
    };

    const handleLevelAssignmentChange = (levelIndex, employeeId) => {
        setFormData(prev => {
            const newAssignments = [...prev.levelAssignments];
            const employeeIds = new Set(newAssignments[levelIndex].employeeIds);
            if (employeeIds.has(employeeId)) {
                employeeIds.delete(employeeId);
            } else {
                employeeIds.add(employeeId);
            }
            newAssignments[levelIndex].employeeIds = Array.from(employeeIds);
            return { ...prev, levelAssignments: newAssignments };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!validateLevelPriorityOrder()) {
            setError('Invalid level priority order. Must include all levels exactly once (e.g., "2,1" for 2 levels).');
            setLoading(false);
            return;
        }

        try {
            const modifiedFields = formData.formContent.fields.map(field => ({
                ...field,
                type: field.type === 'multiple-choice' ? 'radio' : field.type,
                levelNumbers: field.levelNumbers || [],
                options: (field.type === 'multiple-choice' || field.type === 'radio') ? field.options : undefined
            }));

            const levelAssignmentsMap = formData.levelAssignments.reduce((map, assignment) => {
                map[assignment.levelNumber] = assignment.employeeIds;
                return map;
            }, {});

            const payload = {
                title: formData.title,
                formContent: JSON.stringify({
                    fields: modifiedFields,
                    levelAssignments: levelAssignmentsMap,
                    levelPriorityOrder: formData.levelPriorityOrder
                }),
                numLevels: formData.numLevels,
                levelAssignments: formData.levelAssignments,
                levelPriorityOrder: formData.levelPriorityOrder
            };

            console.log('Submitting payload:', payload);
            await axios.post('http://localhost:8080/api/employee/form', payload, {
                headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` }
            });
            navigate('/dashboard');
        } catch (error) {
            console.error('Error creating form:', error);
            setError(error.response?.status === 400
                ? 'Invalid form data. Please check levels, assignments, priority order, and fields.'
                : `Failed to create form: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (index, field) => {
        const newFields = [...formData.formContent.fields];
        newFields[index] = {
            ...field,
            options: (field.type === 'multiple-choice' || field.type === 'radio') ? field.options : undefined
        };
        setFormData(prev => ({
            ...prev,
            formContent: { ...prev.formContent, fields: newFields }
        }));
    };

    const addField = () => {
        const newFieldId = `field${formData.formContent.fields.length + 1}`;
        const newField = {
            id: newFieldId,
            question: '',
            type: 'text',
            levelNumbers: [],
            options: undefined
        };

        setFormData(prev => ({
            ...prev,
            formContent: {
                ...prev.formContent,
                fields: [...prev.formContent.fields, newField]
            }
        }));
        setExpandedFields(prev => ({ ...prev, [newField.id]: true }));
    };

    const removeField = (index) => {
        if (window.confirm('Are you sure you want to remove this field?')) {
            const newFields = formData.formContent.fields.filter((_, i) => i !== index);
            setFormData(prev => ({
                ...prev,
                formContent: { ...prev.formContent, fields: newFields }
            }));
        }
    };

    const toggleField = (fieldId) => {
        setExpandedFields(prev => ({ ...prev, [fieldId]: !prev[fieldId] }));
    };

    const handleLevelToggle = (index, level) => {
        const newFields = [...formData.formContent.fields];
        const levelNumbers = new Set(newFields[index].levelNumbers || []);
        if (levelNumbers.has(level)) {
            levelNumbers.delete(level);
        } else {
            levelNumbers.add(level);
        }
        newFields[index] = { ...newFields[index], levelNumbers: Array.from(levelNumbers) };
        setFormData(prev => ({
            ...prev,
            formContent: { ...prev.formContent, fields: newFields }
        }));
    };

    const handleOptionChange = (fieldIndex, optionIndex, value) => {
        const newFields = [...formData.formContent.fields];
        const newOptions = [...(newFields[fieldIndex].options || [])];
        newOptions[optionIndex] = value;
        newFields[fieldIndex] = { ...newFields[fieldIndex], options: newOptions };
        setFormData(prev => ({
            ...prev,
            formContent: { ...prev.formContent, fields: newFields }
        }));
    };

    const addOption = (fieldIndex) => {
        const newFields = [...formData.formContent.fields];
        newFields[fieldIndex] = {
            ...newFields[fieldIndex],
            options: [...(newFields[fieldIndex].options || []), '']
        };
        setFormData(prev => ({
            ...prev,
            formContent: { ...prev.formContent, fields: newFields }
        }));
    };

    const removeOption = (fieldIndex, optionIndex) => {
        const newFields = [...formData.formContent.fields];
        const newOptions = newFields[fieldIndex].options.filter((_, i) => i !== optionIndex);
        newFields[fieldIndex] = { ...newFields[fieldIndex], options: newOptions };
        setFormData(prev => ({
            ...prev,
            formContent: { ...prev.formContent, fields: newFields }
        }));
    };

    const getFieldIcon = (type) => {
        switch (type) {
            case 'text': return <FileText className="w-4 h-4" />;
            case 'number': return <Hash className="w-4 h-4" />;
            case 'email': return <Mail className="w-4 h-4" />;
            case 'date': return <Calendar className="w-4 h-4" />;
            case 'multiple-choice': return <CgRadioChecked className="w-4 h-4" />;
            case 'radio': return <CgRadioChecked className="w-4 h-4" />;
            case 'textarea': return <TextIcon className="w-4 h-4" />;
            case 'checkbox': return <CheckSquare className="w-4 h-4" />;
            case 'file': return <File className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    const getFieldTypeColor = (type) => {
        switch (type) {
            case 'text': return 'bg-blue-100 text-blue-800';
            case 'number': return 'bg-green-100 text-green-800';
            case 'email': return 'bg-yellow-100 text-yellow-800';
            case 'date': return 'bg-indigo-100 text-indigo-800';
            case 'multiple-choice': return 'bg-purple-100 text-purple-800';
            case 'radio': return 'bg-purple-100 text-purple-800';
            case 'textarea': return 'bg-teal-100 text-teal-800';
            case 'checkbox': return 'bg-pink-100 text-pink-800';
            case 'file': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* HPCL Header */}
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
                                <div className="bg-slate-50 rounded-lg px-4 py-2 border border-slate-200">
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-slate-800">{user.employeeName}</p>
                                        <div className="flex items-center justify-end space-x-2">
                                            <span className="text-xs text-slate-500">ID: {user.employeeId}</span>
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize font-medium">
                                                {user.role}
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

            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Back to Dashboard Button */}
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-medium">Back to Dashboard</span>
                    </button>

                    {/* Form Header */}
                    <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
                            <div className="flex items-center space-x-3">
                                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                                    <Plus className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">Create New Form</h2>
                                    <p className="text-blue-100">Design and configure your custom form</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center space-x-3">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <p className="text-red-700 font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Form Details Section */}
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="bg-gray-50 p-4 border-b">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-blue-100 p-2 rounded-lg">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">Form Details</h3>
                                        <p className="text-sm text-gray-600">Basic information about your form</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Form Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        placeholder="Enter a descriptive title for your form"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Number of Levels <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.numLevels}
                                        onChange={handleNumLevelsChange}
                                        min="1"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        Level Priority Order <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.levelPriorityOrder.join(',')}
                                        onChange={handleLevelPriorityOrderChange}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        placeholder={`Enter level numbers in priority order (e.g., "2,1" for ${formData.numLevels} levels)`}
                                        required
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Enter level numbers separated by commas, highest priority first. Must include all levels 1 to {formData.numLevels}.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Level Assignments Section */}
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="bg-gray-50 p-4 border-b">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-indigo-100 p-2 rounded-lg">
                                        <Users className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">Level Assignments</h3>
                                        <p className="text-sm text-gray-600">Assign employees to each level</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                {employeesLoading ? (
                                    <div className="flex items-center space-x-2 text-gray-500">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        <span>Loading employees...</span>
                                    </div>
                                ) : (
                                    formData.levelAssignments.map((assignment, index) => {
                                        // --- NEW: Filtering logic for each level ---
                                        const searchTerm = searchTerms[index] || '';
                                        const filteredEmployees = employees.filter(employee =>
                                            employee.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
                                        );

                                        return (
                                            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                                                <h4 className="text-md font-semibold text-gray-800">Level {index + 1}</h4>

                                                {/* --- NEW: Search bar for this level --- */}
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        placeholder={`Search employees for Level ${index + 1}...`}
                                                        value={searchTerm}
                                                        onChange={(e) => handleSearchChange(index, e.target.value)}
                                                        className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border-t pt-3">
                                                    {filteredEmployees.length > 0 ? (
                                                        filteredEmployees.map(employee => (
                                                            <label key={employee.employeeId} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={assignment.employeeIds.includes(employee.employeeId)}
                                                                    onChange={() => handleLevelAssignmentChange(index, employee.employeeId)}
                                                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                                />
                                                                <div className="flex items-center space-x-2">
                                                                    <Building2 className="w-4 h-4 text-gray-400" />
                                                                    <span className="text-gray-700 font-medium">{employee.employeeName}</span>
                                                                    <span className="text-gray-500 text-sm">({employee.employeeId})</span>
                                                                </div>
                                                            </label>
                                                        ))
                                                    ) : (
                                                        // --- NEW: Message when no results are found ---
                                                        <p className="text-gray-500 text-center col-span-1 md:col-span-2 py-4">
                                                            No employees match your search.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Form Fields Section */}
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="bg-gray-50 p-4 border-b">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-green-100 p-2 rounded-lg">
                                            <Settings className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-800">Form Fields</h3>
                                            <p className="text-sm text-gray-600">
                                                {formData.formContent.fields.length} field{formData.formContent.fields.length !== 1 ? 's' : ''} configured
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addField}
                                        className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transform hover:scale-105 transition-all duration-200 shadow-md"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span className="font-medium">Add Field</span>
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                {formData.formContent.fields.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h4 className="text-lg font-medium text-gray-700 mb-2">No Fields Yet</h4>
                                        <p className="text-gray-500 mb-4">Start by adding your first form field</p>
                                        <button
                                            type="button"
                                            onClick={addField}
                                            className="inline-flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span className="font-medium">Add Your First Field</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {formData.formContent.fields.map((field, index) => (
                                            <div key={field.id} className="border border-gray-200 rounded-lg overflow-hidden bg-gradient-to-r from-white to-gray-50">
                                                {/* Field Header */}
                                                <div className="bg-gray-50 p-4 border-b">
                                                    <div className="flex items-center justify-between">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleField(field.id)}
                                                            className="flex items-center space-x-3 text-left hover:text-blue-600 transition-colors duration-200"
                                                        >
                                                            <div className="bg-blue-100 p-2 rounded-lg">
                                                                {getFieldIcon(field.type)}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-800">
                                                                    Field {index + 1}: {field.question || 'Untitled Field'}
                                                                </h4>
                                                                <div className="flex items-center space-x-2 mt-1">
                                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getFieldTypeColor(field.type)}`}>
                                                                        {field.type.toUpperCase()}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500">
                                                                        {field.levelNumbers?.length || 0} level{field.levelNumbers?.length !== 1 ? 's' : ''} assigned
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </button>
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeField(index)}
                                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Field Configuration */}
                                                {expandedFields[field.id] && (
                                                    <div className="p-6 space-y-6">
                                                        {/* Question Input */}
                                                        <div>
                                                            <label className="block text-gray-700 font-semibold mb-2">
                                                                Question <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={field.question}
                                                                onChange={(e) => handleFieldChange(index, { ...field, question: e.target.value })}
                                                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                                                placeholder="Enter your question here"
                                                                required
                                                            />
                                                        </div>

                                                        {/* Field Type Selection */}
                                                        <div>
                                                            <label className="block text-gray-700 font-semibold mb-2">Input Type</label>
                                                            <select
                                                                value={field.type}
                                                                onChange={(e) => handleFieldChange(index, {
                                                                    ...field,
                                                                    type: e.target.value,
                                                                    options: e.target.value === 'multiple-choice' || e.target.value === 'radio' ? field.options || [''] : undefined
                                                                })}
                                                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                                            >
                                                                <option value="text">Text Input</option>
                                                                <option value="number">Number Input</option>
                                                                <option value="email">Email Input</option>
                                                                <option value="date">Date Input</option>
                                                                <option value="radio">Radio Buttons</option>
                                                                <option value="textarea">Textarea</option>
                                                                <option value="checkbox">Checkbox</option>
                                                                <option value="file">File Upload</option>
                                                            </select>
                                                        </div>

                                                        {/* Options for Radio Fields */}
                                                        {field.type === 'radio' && (
                                                            <div>
                                                                <label className="block text-gray-700 font-semibold mb-2">
                                                                    Options
                                                                </label>
                                                                <div className="space-y-2">
                                                                    {(field.options || []).map((option, optionIndex) => (
                                                                        <div key={optionIndex} className="flex items-center space-x-2">
                                                                            <input
                                                                                type="text"
                                                                                value={option}
                                                                                onChange={(e) => handleOptionChange(index, optionIndex, e.target.value)}
                                                                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                                                                placeholder={`Option ${optionIndex + 1}`}
                                                                            />
                                                                            {(field.options || []).length > 1 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => removeOption(index, optionIndex)}
                                                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => addOption(index)}
                                                                        className="inline-flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200"
                                                                    >
                                                                        <Plus className="w-4 h-4" />
                                                                        <span>Add Option</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Level Assignment */}
                                                        <div>
                                                            <label className="block text-gray-700 font-semibold mb-2">
                                                                Assign to Levels <span className="text-red-500">*</span>
                                                            </label>
                                                            <div className="grid grid-cols-2 gap-3 border border-gray-200 rounded-lg p-4">
                                                                {Array.from({ length: formData.numLevels }, (_, i) => i + 1).map(level => (
                                                                    <label key={level} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={field.levelNumbers.includes(level)}
                                                                            onChange={() => handleLevelToggle(index, level)}
                                                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                                        />
                                                                        <span className="text-gray-700 font-medium">Level {level}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex items-center justify-between bg-white rounded-xl shadow-lg p-6">
                            <div className="flex items-center space-x-3">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <div>
                                    <p className="font-medium text-gray-800">Ready to create your form?</p>
                                    <p className="text-sm text-gray-600">Review your configuration and submit</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button
                                    type="button"
                                    onClick={() => navigate('/dashboard')}
                                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !formData.title.trim() || formData.formContent.fields.some(field => !field.levelNumbers.length) || !validateLevelPriorityOrder()}
                                    className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span className="font-medium">Create Form</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-400">
                            © 2025 Hindustan Petroleum Corporation Limited. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FormCreate;