import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

function OwnerResponses() {
    const { user } = useContext(AuthContext);
    const [forms, setForms] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResponses = async () => {
            setLoading(true);
            try {
                if (user?.role === 'OWNER') {
                    // Fetch all responses for OWNER
                    const response = await axios.get('http://localhost:8080/api/owner/responses', {
                        headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` }
                    });
                    setForms(response.data);
                } else if (user?.role === 'EMPLOYEE') {
                    // Fetch owned forms for EMPLOYEE
                    const formsResponse = await axios.get('http://localhost:8080/api/employee/forms', {
                        headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` }
                    });
                    const ownedForms = formsResponse.data.filter(form => form.ownerEmployeeId === user.employeeId);

                    // Fetch responses for each owned form
                    const formResponses = [];
                    for (const form of ownedForms) {
                        try {
                            const responses = await axios.get(`http://localhost:8080/api/employee/form/${form.id}/responses`, {
                                headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` }
                            });
                            formResponses.push({
                                formId: form.id,
                                formTitle: form.title,
                                formOwnerId: form.ownerEmployeeId,
                                formOwnerName: user.employeeName,
                                responses: responses.data
                            });
                        } catch (err) {
                            console.error(`Error fetching responses for form ${form.id}:`, err.response || err);
                        }
                    }
                    setForms(formResponses);
                }
            } catch (error) {
                console.error('Error fetching responses:', error.response || error);
                setError(`Failed to load responses: ${error.response?.status === 403 ? 'Unauthorized access' : 'Server error'}`);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchResponses();
        } else {
            setError('Please log in to view responses');
            setLoading(false);
        }
    }, [user]);

    if (loading) return <div className="container mx-auto p-4">Loading...</div>;
    if (error) return <div className="container mx-auto p-4 text-red-500">{error}</div>;
    if (forms.length === 0 && !error) return <div className="container mx-auto p-4">No responses yet.</div>;

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">
                {user?.role === 'OWNER' ? 'All Form Responses' : 'Responses for Your Forms'}
            </h2>
            <div className="space-y-6">
                {forms.map(form => (
                    <div key={form.formId} className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-xl font-semibold mb-2">
                            Form: {form.formTitle} (Owner: {form.formOwnerName} - {form.formOwnerId})
                        </h3>
                        {form.responses.length === 0 ? (
                            <p className="text-gray-500">No responses for this form.</p>
                        ) : (
                            <div className="space-y-4">
                                {form.responses.map(response => (
                                    <div key={response.responseId} className="border-t pt-2">
                                        <h4 className="text-lg font-medium">
                                            Response by {response.employeeName} ({response.employeeId})
                                        </h4>
                                        <div className="space-y-2">
                                            {response.responses.map(field => (
                                                <div key={field.fieldId}>
                                                    <p className="font-medium">{field.question}</p>
                                                    <p className="text-gray-700">{field.value || 'No answer'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default OwnerResponses;