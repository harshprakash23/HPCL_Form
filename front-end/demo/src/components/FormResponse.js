import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function FormResponse() {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [form, setForm] = useState(null);
    const [response, setResponse] = useState({});

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const response = await axios.get(`http://localhost:8080/api/employee/form/${id}`);
                setForm(response.data);
            } catch (error) {
                console.error('Error fetching form:', error);
            }
        };
        fetchForm();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:8080/api/employee/response', {
                formId: id,
                responseContent: response
            });
            navigate('/dashboard');
        } catch (error) {
            console.error('Error submitting response:', error);
        }
    };

    const handleInputChange = (fieldId, value) => {
        setResponse({ ...response, [fieldId]: value });
    };

    if (!form) return <div>Loading...</div>;

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">{form.title}</h2>
            <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow">
                {form.formContent.fields.map(field => (
                    <div key={field.id} className="mb-4">
                        <label className="block text-gray-700">{field.label}</label>
                        {field.type === 'text' && (
                            <input
                                type="text"
                                onChange={(e) => handleInputChange(field.id, e.target.value)}
                                className="w-full p-2 border rounded"
                            />
                        )}
                        {field.type === 'number' && (
                            <input
                                type="number"
                                onChange={(e) => handleInputChange(field.id, e.target.value)}
                                className="w-full p-2 border rounded"
                            />
                        )}
                        {field.type === 'radio' && (
                            <div>
                                <input
                                    type="radio"
                                    name={field.id}
                                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                                    className="mr-2"
                                />
                                <label>Option</label>
                            </div>
                        )}
                    </div>
                ))}
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                    Submit Response
                </button>
            </form>
        </div>
    );
}

export default FormResponse;