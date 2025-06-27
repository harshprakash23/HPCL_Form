import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

function FillForm() {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [form, setForm] = useState(null);
    const [responses, setResponses] = useState({});
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const response = await axios.get(`http://localhost:8080/api/employee/form/${id}`, {
                    headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` }
                });
                setForm(response.data);
                // Initialize responses for accessible fields
                let fields;
                try {
                    fields = JSON.parse(response.data.formContent).fields || [];
                } catch (e) {
                    console.error('Error parsing form content:', e);
                    setError('Invalid form content');
                    return;
                }
                const initialResponses = {};
                fields.forEach(field => {
                    if (user.role === 'OWNER' || user.employeeId === response.data.ownerEmployeeId ||
                        (field.employeeIds && field.employeeIds.includes(user?.employeeId))) {
                        initialResponses[field.id] = '';
                    }
                });
                setResponses(initialResponses);
            } catch (error) {
                setError(error.response?.status === 403 ? 'You are not authorized to access this form.' : 'Failed to load form');
            }
        };
        fetchForm();
    }, [id, user]);

    const handleResponseChange = (fieldId, value) => {
        setResponses(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const responsePayload = {
                formId: id,
                employeeId: user?.employeeId,
                responses: Object.entries(responses).map(([fieldId, value]) => ({ fieldId, value }))
            };
            await axios.post(`http://localhost:8080/api/employee/form/${id}/response`, responsePayload, {
                headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` }
            });
            navigate('/dashboard');
        } catch (error) {
            setError('Failed to submit responses');
        }
    };

    if (error) return <div className="container mx-auto p-4 text-red-500">{error}</div>;
    if (!form) return <div className="container mx-auto p-4">Loading...</div>;

    let fields;
    try {
        fields = JSON.parse(form.formContent).fields || [];
    } catch (e) {
        console.error('Error parsing form content:', e);
        return <div className="container mx-auto p-4 text-red-500">Invalid form content</div>;
    }

    const accessibleFields = user.role === 'OWNER' || user.employeeId === form.ownerEmployeeId
        ? fields
        : fields.filter(field => field.employeeIds && field.employeeIds.includes(user?.employeeId));

    if (accessibleFields.length === 0) {
        return <div className="container mx-auto p-4 text-red-500">No fields assigned to you.</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Fill Form: {form.title}</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit}>
                <div className="bg-white p-4 rounded-lg shadow">
                    {accessibleFields.map(field => (
                        <div key={field.id} className="mb-4">
                            <label className="block text-gray-700 font-medium mb-1">
                                {field.question || 'No question text'}
                            </label>
                            {field.type === 'text' && (
                                <input
                                    type="text"
                                    value={responses[field.id] || ''}
                                    onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter your answer"
                                />
                            )}
                            {field.type === 'number' && (
                                <input
                                    type="number"
                                    value={responses[field.id] || ''}
                                    onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter a number"
                                />
                            )}
                            {field.type === 'radio' && (
                                <div className="space-y-2">
                                    {(field.answers || []).map((answer, index) => (
                                        <div key={index} className="flex items-center">
                                            <input
                                                type="radio"
                                                name={field.id}
                                                value={answer}
                                                checked={responses[field.id] === answer}
                                                onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                className="mr-2"
                                            />
                                            <label className="text-gray-700">{answer}</label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4">
                    Submit Responses
                </button>
            </form>
        </div>
    );
}

export default FillForm;