import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

function EditForm() {
    const { user } = useContext(AuthContext);
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        formContent: { fields: [] },
        ownerEmployeeId: user?.employeeId
    });
    const [employees, setEmployees] = useState([]);
    const [error, setError] = useState('');
    const [expandedFields, setExpandedFields] = useState({});

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const response = await axios.get(`http://localhost:8080/api/employee/form/${id}`, {
                    headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` }
                });
                setFormData({
                    title: response.data.title,
                    formContent: JSON.parse(response.data.formContent),
                    ownerEmployeeId: response.data.ownerEmployeeId
                });
                setExpandedFields(response.data.formContent.fields.reduce((acc, field, index) => ({
                    ...acc,
                    [field.id]: true
                }), {}));
            } catch (error) {
                setError('Failed to load form');
            }
        };

        const fetchEmployees = async () => {
            try {
                const response = await axios.get('http://localhost:8080/api/employee/all', {
                    headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` }
                });
                setEmployees(response.data);
            } catch (error) {
                setError('Failed to load employees');
            }
        };

        fetchForm();
        fetchEmployees();
    }, [id, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                formContent: JSON.stringify(formData.formContent)
            };
            await axios.put(`http://localhost:8080/api/employee/form/${id}`, payload, {
                headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` }
            });
            navigate(`/form/${id}`);
        } catch (error) {
            setError('Failed to update form');
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this form?')) {
            try {
                await axios.delete(`http://localhost:8080/api/employee/form/${id}`, {
                    headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` }
                });
                navigate('/dashboard');
            } catch (error) {
                setError('Failed to delete form');
            }
        }
    };

    const handleFieldChange = (index, field) => {
        const newFields = [...formData.formContent.fields];
        newFields[index] = field;
        setFormData({ ...formData, formContent: { fields: newFields } });
    };

    const addField = () => {
        const newFieldId = formData.formContent.fields.length + 1;
        setFormData({
            ...formData,
            formContent: {
                fields: [
                    ...formData.formContent.fields,
                    { id: `field${newFieldId}`, question: '', type: 'text', employeeIds: [], answers: [''] }
                ]
            }
        });
        setExpandedFields(prev => ({ ...prev, [newFieldId]: true }));
    };

    const toggleField = (fieldId) => {
        setExpandedFields(prev => ({ ...prev, [fieldId]: !prev[fieldId] }));
    };

    const handleFieldEmployeeAssignment = (index, employeeId, isChecked) => {
        const newFields = [...formData.formContent.fields];
        const currentEmployeeIds = newFields[index].employeeIds || [];
        let newEmployeeIds = isChecked
            ? [...currentEmployeeIds, employeeId]
            : currentEmployeeIds.filter(id => id !== employeeId);
        newFields[index] = { ...newFields[index], employeeIds: newEmployeeIds };
        setFormData({ ...formData, formContent: { fields: newFields } });
    };

    const handleAnswerChange = (fieldIndex, answerIndex, value) => {
        const newFields = [...formData.formContent.fields];
        const newAnswers = [...newFields[fieldIndex].answers];
        newAnswers[answerIndex] = value;
        newFields[fieldIndex] = { ...newFields[fieldIndex], answers: newAnswers };
        setFormData({ ...formData, formContent: { fields: newFields } });
    };

    const addAnswer = (fieldIndex) => {
        const newFields = [...formData.formContent.fields];
        newFields[fieldIndex] = {
            ...newFields[fieldIndex],
            answers: [...newFields[fieldIndex].answers, '']
        };
        setFormData({ ...formData, formContent: { fields: newFields } });
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Edit Form</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-1">Form Title</label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Form Fields</h3>
                    {formData.formContent.fields.map((field, index) => (
                        <div key={field.id} className="mb-4 border rounded p-4 bg-gray-50">
                            <button
                                type="button"
                                onClick={() => toggleField(field.id)}
                                className="w-full flex justify-between items-center text-left font-medium text-gray-700 hover:text-blue-600"
                            >
                                <span>Field {index + 1}: {field.question || 'Untitled'}</span>
                                <span>{expandedFields[field.id] ? 'Collapse' : 'Expand'}</span>
                            </button>
                            {expandedFields[field.id] && (
                                <div className="mt-2 space-y-2">
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-1">Question</label>
                                        <input
                                            type="text"
                                            value={field.question}
                                            onChange={(e) => handleFieldChange(index, { ...field, question: e.target.value })}
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                            placeholder="Enter question"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-1">Input Type</label>
                                        <select
                                            value={field.type}
                                            onChange={(e) => handleFieldChange(index, { ...field, type: e.target.value, answers: field.answers.length ? field.answers : [''] })}
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="text">Text</option>
                                            <option value="radio">Radio</option>
                                            <option value="number">Number</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-1">Answer Options</label>
                                        {field.answers.map((answer, answerIndex) => (
                                            <div key={answerIndex} className="flex items-center space-x-2 mb-2">
                                                <input
                                                    type={field.type === 'number' ? 'number' : 'text'}
                                                    value={answer}
                                                    onChange={(e) => handleAnswerChange(index, answerIndex, e.target.value)}
                                                    className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                                    placeholder={`Enter ${field.type === 'radio' ? 'radio option' : 'answer'} ${answerIndex + 1}`}
                                                />
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => addAnswer(index)}
                                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                                        >
                                            Add Answer
                                        </button>
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-1">Assign to Employees</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {employees.map(employee => (
                                                <label key={employee.employeeId} className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={field.employeeIds.includes(employee.employeeId)}
                                                        onChange={(e) => handleFieldEmployeeAssignment(index, employee.employeeId, e.target.checked)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <span className="text-gray-700">
                                                        {employee.employeeName} ({employee.employeeId})
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addField}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mt-2"
                    >
                        Add Field
                    </button>
                </div>
                <div className="flex space-x-2">
                    <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                        Update Form
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                        Delete Form
                    </button>
                </div>
            </form>
        </div>
    );
}

export default EditForm;