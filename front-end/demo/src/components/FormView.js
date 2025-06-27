import React, { useState, useEffect, useContext, useCallback ,useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    Edit3,
    Trash2,
    FileText,
    Users,
    AlertCircle,
    CheckCircle,
    ArrowLeft,
    Fuel,
    BarChart3,
    User,
    Hash,
    Calendar,
    Shield,
    Save,
    Mail,
    Text as TextIcon,
    CheckSquare,
    File,
    Pencil,
    Download,
    Zap,
    ZapOff, // Import ZapOff icon
    ChevronDown,
    ChevronUp,
    Layers,
    MessageSquare,
    Settings,
    Plus,
    Search,
    Filter
} from 'lucide-react';
import { CgRadioChecked } from "react-icons/cg";
import axios from 'axios';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

function FormView() {
    const { id } = useParams();
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [form, setForm] = useState(null);
    const [responses, setResponses] = useState({});
    const [formResponses, setFormResponses] = useState([]);
    const [editingResponse, setEditingResponse] = useState(null);
    const [responseHistory, setResponseHistory] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedLowerLevelResponseId, setSelectedLowerLevelResponseId] = useState(null);
    const [expandedRecord, setExpandedRecord] = useState(null);

    const [recordSearchTerm, setRecordSearchTerm] = useState('');
    const [recordFilter, setRecordFilter] = useState('all');

    const [formActivities, setFormActivities] = useState([]);

    const [records, setRecords] = useState({
        data: new Map(),  // Main data storage
        responses: new Map()  // Temporary form responses
    });

    useEffect(() => {
        console.group('Records State Update');
        console.log('Records Data (Main Storage):', [...records.data.entries()].map(([id, record]) => ({
            id,
            employee: record.employeeId,
            levels: record.levels,
            responses: Object.entries(record.responses).map(([fieldId, response]) => ({
                fieldId,
                value: response.value,
                employee: response.employeeId,
                level: response.fieldLevel
            }))
        })));

        console.log('Form Responses (Temporary State):', [...records.responses.entries()].map(([id, responses]) => ({
            recordId: id,
            responses
        })));

        console.log('Selected Record:', expandedRecord);
        console.log('Selected Lower Level Response:', selectedLowerLevelResponseId);
        console.groupEnd();
    }, [records, expandedRecord, selectedLowerLevelResponseId]);

    useEffect(() => {
        if (!form) { return; }

        const formContent = JSON.parse(form.formContent);
        const fields = formContent.fields || [];
        const higherPriorityResponses = formContent.higherPriorityResponses || {};
        const employeeLevels = Object.keys(formContent.levelAssignments || {})
            .filter(level => formContent.levelAssignments[level].includes(user?.employeeId))
            .map(level => parseInt(level));

        const processRecords = () => {
            const newRecords = new Map();
            const fieldIdToQuestion = fields.reduce((acc, field) => ({ ...acc, [field.id]: field.question || `Field ${field.id}` }), {});

            formResponses.forEach(response => {
                response.responses.forEach(fr => {
                    const recordId = fr.recordId || response.responseId;
                    if (!newRecords.has(recordId)) {
                        newRecords.set(recordId, {
                            responseId: recordId,
                            employeeId: response.employeeId,
                            employeeName: response.employeeName || response.employeeId,
                            levels: [],
                            responses: {},
                            isServerRecord: true
                        });
                    }
                    const record = newRecords.get(recordId);
                    const fieldLevel = fields.find(f => f.id === fr.fieldId)?.levelNumbers[0] || 1;
                    if (!record.levels.includes(fieldLevel)) record.levels.push(fieldLevel);
                    if (!record.responses[fr.fieldId] || fr.value !== '-') {
                        record.responses[fr.fieldId] = {
                            value: fr.value,
                            responseId: recordId,
                            linkedResponseId: fr.linkedResponseId,
                            employeeId: fr.employeeId,
                            employeeName: fr.employeeName || fr.employeeId,
                            fieldLevel,
                            question: fieldIdToQuestion[fr.fieldId],
                            isServerResponse: true
                        };
                    }
                });
            });

            if (newRecords.size === 0 && employeeLevels.includes(1)) {
                const defaultRecordId = `record-${uuidv4()}`;
                const defaultRecord = {
                    responseId: defaultRecordId,
                    employeeId: user?.employeeId || 'N/A',
                    employeeName: user?.employeeName || 'Current User',
                    levels: [],
                    responses: {},
                    isServerRecord: false
                };
                fields.forEach(field => {
                    const fieldLevel = field.levelNumbers[0] || 1;
                    if (!defaultRecord.levels.includes(fieldLevel)) defaultRecord.levels.push(fieldLevel);
                    defaultRecord.responses[field.id] = {
                        value: '-',
                        responseId: defaultRecordId,
                        linkedResponseId: null,
                        employeeId: user?.employeeId,
                        employeeName: user?.employeeName || 'Current User',
                        fieldLevel,
                        question: field.question || `Field ${field.id}`,
                        isServerResponse: false
                    };
                });
                newRecords.set(defaultRecordId, defaultRecord);
            }

            Object.entries(higherPriorityResponses).forEach(([fieldId, responses]) => {
                responses.forEach(fr => {
                    const existingRecord = [...newRecords.values()].find(r => r.employeeId === fr.employeeId && r.isServerRecord);
                    const recordId = existingRecord?.responseId || fr.recordId || `record-${uuidv4()}`;
                    if (!newRecords.has(recordId)) {
                        newRecords.set(recordId, {
                            responseId: recordId,
                            employeeId: fr.employeeId,
                            employeeName: fr.employeeName || fr.employeeId,
                            levels: [],
                            responses: {},
                            isServerRecord: !!fr.recordId
                        });
                    }
                    const record = newRecords.get(recordId);
                    const field = fields.find(f => f.id === fieldId);
                    const fieldLevel = field?.levelNumbers[0] || 1;
                    if (!record.levels.includes(fieldLevel)) record.levels.push(fieldLevel);
                    const existingResponse = record.responses[fieldId];
                    if (!existingResponse || (fr.recordId && !existingResponse.isServerResponse) || (fr.recordId && existingResponse.isServerResponse && fr.value !== '-')) {
                        record.responses[fieldId] = {
                            value: fr.value,
                            responseId: recordId,
                            linkedResponseId: fr.linkedResponseId,
                            employeeId: fr.employeeId,
                            employeeName: fr.employeeName || fr.employeeId,
                            fieldLevel,
                            question: fieldIdToQuestion[fieldId],
                            isServerResponse: !!fr.recordId
                        };
                    }
                });
            });
            return newRecords;
        };

        const processedRecords = processRecords();
        const sortedRecords = [...processedRecords.values()].sort((a, b) => a.employeeId.localeCompare(b.employeeId));
        const initialFormResponses = new Map();
        sortedRecords.forEach(record => {
            initialFormResponses.set(record.responseId, fields.reduce((acc, field) => ({ ...acc, [field.id]: field.type === 'checkbox' ? 'false' : '' }), {}));
        });
        setRecords({ data: processedRecords, responses: initialFormResponses });
    }, [form, formResponses, user?.employeeId, user?.employeeName]);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                // Fetch all data in parallel
                const [formResponse, responsesResponse, activityResponse] = await Promise.all([
                    axios.get(`http://localhost:8080/api/employee/form/${id}`, { headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` } }),
                    axios.get(`http://localhost:8080/api/employee/form/${id}/responses`, { headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` } }),
                    // NEW: Fetch activities for this specific form
                    axios.get(`http://localhost:8080/api/employee/form/${id}/activity`, { headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` } })
                ]);

                setForm(formResponse.data);
                setFormResponses(responsesResponse.data);
                setFormActivities(activityResponse.data);
                fetchActivities(); // Initial fetch

                // This logic can remain as it is for other uses if needed
                setResponseHistory(responsesResponse.data.flatMap(response => response.responses.map(fr => ({
                    employeeId: response.employeeId,
                    fieldId: fr.fieldId,
                    type: 'New',
                    editorId: response.employeeId,
                    editorName: response.employeeName,
                    recordId: fr.recordId || response.responseId
                }))));

            } catch (err) {
                console.error('Error fetching data:', err);
                // Check for activity fetch error specifically if needed, otherwise use a general error
                if (err.config.url.includes('/activity') && err.response?.status === 404) {
                    console.log('No activity log found for this form, or endpoint does not exist.');
                    setFormActivities([]); // Gracefully handle no activities
                } else {
                    setError(err.response?.status === 404 ? 'Form not found.' : err.response?.status === 403 ? 'Not authorized.' : 'Failed to load form data.');
                }
            } finally {
                setLoading(false);
            }
        };

        if(user?.employeeId) {
            fetchAllData();
        }
    }, [id, user?.employeeId]);

    useEffect(() => {
        console.log('Form Responses:', formResponses);
        let higherPriorityResponses = {};
        if (form) {
            try {
                const parsedContent = JSON.parse(form.formContent);
                higherPriorityResponses = parsedContent.higherPriorityResponses || {};
            } catch (e) {
                console.error('Error parsing form content for logging:', e);
            }
        }
        console.log('Higher Priority Responses:', higherPriorityResponses);
    }, [formResponses, form]);

    const fetchActivities = useCallback(async () => {
        if (!user?.employeeId) return;
        try {
            const response = await axios.get(`http://localhost:8080/api/employee/form/${id}/activity`, {
                headers: { Authorization: `Basic ${btoa(`${user.employeeId}:password123`)}` }
            });
            setFormActivities(response.data);
        } catch (err) {
            console.error("Failed to fetch activities:", err);
            // Silently fail or show a non-blocking notification
        }
    }, [id, user?.employeeId]);

    const handleDelete = async () => {
        // The user, id, setError, and navigate variables should be available in your component's scope.
        if (window.confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
            try {
                await axios.delete(`http://localhost:8080/api/employee/form/${id}`, {
                    headers: {
                        Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}`
                    }
                });

                // Optional: Show a success message before redirecting
                alert('Form deleted successfully.');
                navigate('/dashboard');

            } catch (err) {
                // Log the full error for debugging purposes
                console.error('Error deleting form:', err.response || err);

                // --- Updated Error Handling Logic ---

                // Start with a generic fallback message.
                let userFriendlyMessage = 'An unexpected error occurred. Please try again.';

                // Check if the server provided a specific JSON error message.
                // This is the best source of information.
                if (err.response && err.response.data && err.response.data.message) {
                    userFriendlyMessage = err.response.data.message;
                }
                // If not, create a message based on the HTTP status code.
                else if (err.response) {
                    switch (err.response.status) {
                        case 401:
                        case 403:
                            userFriendlyMessage = 'You do not have permission to delete this form.';
                            break;
                        case 404:
                            userFriendlyMessage = 'The form could not be found on the server.';
                            break;
                        case 409:
                            userFriendlyMessage = 'Cannot delete form due to a data conflict. This is likely prevented by a database rule.';
                            break;
                        case 500:
                            userFriendlyMessage = 'A critical error occurred on the server. Please contact support.';
                            break;
                    }
                }

                // Set the error state to display the user-friendly message in your UI.
                // This assumes you are using a state variable like `const [error, setError] = useState('');`
                setError(userFriendlyMessage);

                // You could also use an alert to show the error immediately.
                // alert(userFriendlyMessage);
            }
        }
    };

    // New handler to toggle form active status
    const handleToggleStatus = async () => {
        if (!form || !window.confirm(`Are you sure you want to ${form.active ? 'deactivate' : 'activate'} this form?`)) {
            return;
        }

        try {
            const newStatus = !form.active;
            await axios.put(
                `http://localhost:8080/api/employee/form/${id}/status`,
                { isActive: newStatus },
                { headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` } }
            );
            // Update local state to reflect the change
            setForm(prevForm => ({ ...prevForm, active: newStatus }));
        } catch (err) {
            console.error('Error toggling form status:', err);
            setError('Failed to update form status.');
        }
    };

    const handleDownloadExcel = () => {
        try {
            const formContent = JSON.parse(form.formContent);
            const fields = formContent.fields || [];
            const higherPriorityResponses = formContent.higherPriorityResponses || {};
            const levelPriorityOrder = formContent.levelPriorityOrder || [];
            const levelAssignments = formContent.levelAssignments || {};

            const formDetails = [
                { Field: 'Form ID', Value: form.id },
                { Field: 'Title', Value: form.title },
                { Field: 'Owner Employee ID', Value: form.ownerEmployeeId },
                { Field: 'Created Date', Value: new Date().toLocaleDateString() },
                { Field: 'Priority Order', Value: levelPriorityOrder.join(', ') },
            ];
            const formDetailsSheet = XLSX.utils.json_to_sheet(formDetails);

            const questionsData = fields.length > 0 ? fields.map(field => ({
                'Field ID': field.id,
                'Question': field.question || 'No question text',
                'Type': field.type || 'Unknown',
                'Assigned Levels': (field.levelNumbers || []).join(', '),
                'Possible Answers': field.type === 'radio' ? (field.options || []).join(', ') : '-',
            })) : [{ 'Field ID': '-', 'Question': 'No fields available', 'Type': '-', 'Assigned Levels': '-', 'Possible Answers': '-' }];
            console.log('Questions Data:', questionsData);
            const questionsSheet = XLSX.utils.json_to_sheet(questionsData);

            const responsesData = [];
            const responseMap = new Map();
            console.log('Form Responses for Excel:', formResponses);

            formResponses.forEach(response => {
                response.responses.forEach(fr => {
                    responseMap.set(`${response.employeeId}-${fr.fieldId}`, {
                        'Employee ID': response.employeeId,
                        'Employee Name': response.employeeName || 'Unknown',
                        'Field ID': fr.fieldId,
                        'Question': fields.find(f => f.id === fr.fieldId)?.question || `Field ${fr.fieldId}`,
                        'Response Value': fr.value || 'No value',
                        'Linked Response ID': fr.linkedResponseId || '-'
                    });
                });
            });

            Object.keys(higherPriorityResponses).forEach(fieldId => {
                (higherPriorityResponses[fieldId] || []).forEach(response => {
                    responseMap.set(`${response.employeeId}-${fieldId}`, {
                        'Employee ID': response.employeeId,
                        'Employee Name': response.employeeName || 'Unknown',
                        'Field ID': fieldId,
                        'Question': fields.find(f => f.id === fieldId)?.question || `Field ${fieldId}`,
                        'Response Value': response.value || 'No value',
                        'Linked Response ID': response.linkedResponseId || '-'
                    });
                });
            });

            responsesData.push(...responseMap.values());
            console.log('Responses Data:', responsesData);
            const responsesSheet = XLSX.utils.json_to_sheet(responsesData);

            const historyData = responseHistory.map(history => ({
                'Employee ID': history.employeeId,
                'Field ID': history.fieldId,
                'Question': fields.find(f => f.id === history.fieldId)?.question || `Field ${history.fieldId}`,
                'Type': history.type,
                'Editor ID': history.editorId,
                'Editor Name': history.editorName || 'Unknown',
            }));
            console.log('History Data:', historyData);
            const historySheet = XLSX.utils.json_to_sheet(historyData);

            const levelAssignmentsData = Object.keys(levelAssignments).length > 0 ? Object.keys(levelAssignments).flatMap(level =>
                fields.map(field => ({
                    'Level': level,
                    'Field ID': field.id,
                    'Question': field.question || 'No question text',
                    'Assigned Employees': levelAssignments[level].join(', '),
                }))
            ) : [{ 'Level': '-', 'Field ID': '-', 'Question': 'No assignments available', 'Assigned Employees': '-' }];
            console.log('Level Assignments Data:', levelAssignmentsData);
            const levelAssignmentsSheet = XLSX.utils.json_to_sheet(levelAssignmentsData);

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, formDetailsSheet, 'Form Details');
            XLSX.utils.book_append_sheet(workbook, questionsSheet, 'Questions');
            XLSX.utils.book_append_sheet(workbook, responsesSheet, 'Responses');
            XLSX.utils.book_append_sheet(workbook, historySheet, 'Response History');
            XLSX.utils.book_append_sheet(workbook, levelAssignmentsSheet, 'Level Assignments');

            XLSX.writeFile(workbook, `${form.title}_Form_${form.id}.xlsx`);
        } catch (err) {
            console.error('Error generating Excel file:', err.message, err.stack);
            setError('Failed to generate Excel file. Please check the console for details.');
        }
    };

    const handleResponseChange = (fieldId, value) => {
        setResponses(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleRecordResponseChange = (recordId, fieldId, value) => {
        setRecords(prev => {
            const newResponses = new Map(prev.responses);
            const recordResponses = newResponses.get(recordId) || {};

            newResponses.set(recordId, {
                ...recordResponses,
                [fieldId]: value
            });

            return {
                data: prev.data,
                responses: newResponses
            };
        });
    };

    const handleEditResponse = (recordId, fieldId, value) => {
        // Set the state to activate the inline editing UI
        setEditingResponse({ recordId, fieldId, value });
    };

    const handleCancelEdit = () => {
        // Clear the state to exit editing mode
        setEditingResponse(null);
    };

    const handleEditResponseChange = (value) => {
        // Update the value in the editing state as the user types
        setEditingResponse(prev => ({ ...prev, value }));
    };

    const handleSaveEdit = async () => {
        if (!editingResponse) return;

        setSubmitting(true);
        setError('');

        const { recordId, fieldId, value } = editingResponse;

        const responsePayload = {
            recordId,
            responses: [{
                fieldId,
                value,
                // The backend will use the authenticated user's ID
            }]
        };

        try {
            await axios.post(
                `http://localhost:8080/api/employee/form/${id}/response`,
                responsePayload,
                { headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` } }
            );

            // Optimistic UI Update: Update the local state directly
            setRecords(prev => {
                const newData = new Map(prev.data);
                const recordToUpdate = newData.get(recordId);

                if (recordToUpdate) {
                    const updatedRecord = { ...recordToUpdate };
                    const originalFieldResponse = updatedRecord.responses[fieldId] || {};

                    updatedRecord.responses[fieldId] = {
                        ...originalFieldResponse,
                        value,
                        employeeId: user?.employeeId, // Attribute the edit to the current user
                        employeeName: user?.employeeName,
                    };
                    newData.set(recordId, updatedRecord);
                }
                return { ...prev, data: newData };
            });

            setEditingResponse(null); // Exit editing mode

        } catch (err) {
            console.error("Error saving edit:", err);
            setError("Failed to save your changes. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteResponse = async (recordId, fieldId, employeeId) => {
        if (window.confirm('Are you sure you want to delete this response? This action cannot be undone.')) {
            try {
                // This call is correct. It sends recordId, fieldId, and the original submitter's employeeId.
                await axios.delete(`http://localhost:8080/api/employee/form/${id}/response`, {
                    headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` },
                    data: { employeeId, fieldId, recordId } // Pass recordId
                });

                // Optimistic UI Update remains the same
                setRecords(prev => {
                    const newData = new Map(prev.data);
                    const recordToUpdate = newData.get(recordId);

                    if (recordToUpdate && recordToUpdate.responses[fieldId]) {
                        const updatedRecord = { ...recordToUpdate };
                        updatedRecord.responses[fieldId].value = '-';
                        updatedRecord.responses[fieldId].employeeName = 'N/A';
                        newData.set(recordId, updatedRecord);
                    }
                    return { ...prev, data: newData };
                });

            } catch (err) {
                console.error('Error deleting response:', err);
                setError(err.response?.status === 403
                    ? 'You are not authorized to delete this response.'
                    : 'Failed to delete response.');
            }
        }
    };

    const handleDeleteRecord = async (recordId) => {
        if (window.confirm('Are you sure you want to delete this entire record? This action is permanent and cannot be undone.')) {

            const recordToDelete = records.data.get(recordId);

            // If the record was created on the frontend and never saved, just remove it from the local state.
            // This prevents the API call for records that don't exist on the server.
            if (recordToDelete && !recordToDelete.isServerRecord) {
                setRecords(prev => {
                    const newData = new Map(prev.data);
                    const newResponses = new Map(prev.responses);
                    newData.delete(recordId);
                    newResponses.delete(recordId);
                    if (expandedRecord === recordId) {
                        setExpandedRecord(null);
                    }
                    return { data: newData, responses: newResponses };
                });
                return; // Exit the function since no API call is needed
            }

            // If it's a server record, proceed with the API call.
            setSubmitting(true);
            setError('');

            try {
                await axios.delete(`http://localhost:8080/api/employee/form/${id}/record/${recordId}`, {
                    headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` }
                });

                // Update local state upon successful deletion from server
                setRecords(prev => {
                    const newData = new Map(prev.data);
                    const newResponses = new Map(prev.responses);
                    newData.delete(recordId);
                    newResponses.delete(recordId);
                    if (expandedRecord === recordId) {
                        setExpandedRecord(null);
                    }
                    return { data: newData, responses: newResponses };
                });

            } catch (err) {
                console.error('Error deleting record:', err);
                // Provide more specific feedback for the 500 error
                const errorMessage = err.response?.status === 500
                    ? 'A server error occurred. This may be because the record has related responses that must be deleted first. Please check the backend logs.'
                    : err.response?.status === 403
                        ? 'You are not authorized to delete this record.'
                        : 'Failed to delete the record. Please try again.';
                setError(errorMessage);
            } finally {
                setSubmitting(false);
            }
        }
    };

    const handleSelectRecord = useCallback((responseId) => {
        setSelectedLowerLevelResponseId(responseId);

        setRecords(prev => {
            const record = prev.data.get(responseId);
            if (!record || !form) return prev;

            const formContent = JSON.parse(form.formContent);
            const fields = formContent.fields || [];
            const newResponses = new Map(prev.responses);

            // Initialize responses for this specific record
            const initialResponses = fields.reduce((acc, field) => {
                const response = record.responses[field.id];
                if (response && response.value !== '-') {
                    // Handle multi-employee responses
                    const employeeIds = response.employeeId?.split(', ') || [];
                    const values = response.value?.split(', ') || [];
                    const userIndex = employeeIds.indexOf(user?.employeeId);

                    acc[field.id] = userIndex >= 0 && values[userIndex]
                        ? values[userIndex]
                        : values[0] || '';
                } else {
                    acc[field.id] = field.type === 'checkbox' ? 'false' : '';
                }
                return acc;
            }, {});

            newResponses.set(responseId, initialResponses);

            return {
                data: prev.data,
                responses: newResponses
            };
        });
    }, [form, user?.employeeId]);

    const handleSubmit = async (e, isEdit = false, editFieldId = null, editEmployeeId = null, recordId = null) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const formContent = JSON.parse(form.formContent);
            const employeeLevels = Object.keys(formContent.levelAssignments || {})
                .filter(level => formContent.levelAssignments[level].includes(user?.employeeId))
                .map(level => parseInt(level));
            const userLevel = Math.max(...employeeLevels, 0);

            if (!recordId) {
                setError('No valid record selected for submission.');
                setSubmitting(false);
                return;
            }

            const currentResponses = records.responses.get(recordId) || {};
            const record = records.data.get(recordId);

            // Prepare payload - only include fields that have values and are accessible
            const responsePayload = {
                recordId,
                responses: Object.entries(currentResponses)
                    .filter(([fieldId, value]) => {
                        const field = formContent.fields.find(f => f.id === fieldId);
                        if (!field) return false;

                        const isAccessible = formContent.accessibleFieldIds.includes(fieldId);
                        const isUserLevelField = field.levelNumbers.includes(userLevel);

                        return isAccessible && isUserLevelField && value && value !== '' && value !== '-';
                    })
                    .map(([fieldId, value]) => {
                        const field = formContent.fields.find(f => f.id === fieldId);
                        let linkedResponseId = null;

                        if (userLevel >= 2) {
                            const lowerLevelFields = formContent.fields.filter(f =>
                                f.levelNumbers.includes(userLevel - 1)
                            ).map(f => f.id);

                            const lowerLevelResponse = Object.entries(record?.responses || {})
                                .find(([fId, resp]) => lowerLevelFields.includes(fId));

                            if (lowerLevelResponse) {
                                linkedResponseId = `${lowerLevelResponse[1].employeeId}-${lowerLevelResponse[0]}`;
                            }
                        }

                        return {
                            fieldId,
                            value,
                            linkedResponseId,
                            recordId,
                            employeeId: user?.employeeId,
                            // Include existing response ID if available
                            ...(record?.responses[fieldId] && { responseId: record.responses[fieldId].id })
                        };
                    })
            };

            if (responsePayload.responses.length === 0) {
                setError('No valid responses to submit for your level.');
                setSubmitting(false);
                return;
            }

            if (userLevel >= 2) {
                const missingLinks = responsePayload.responses
                    .filter(res => res.linkedResponseId === null)
                    .map(res => formContent.fields.find(f => f.id === res.fieldId)?.question || res.fieldId);

                if (missingLinks.length > 0) {
                    setError(`Please select valid lower level responses for: ${missingLinks.join(', ')}`);
                    setSubmitting(false);
                    return;
                }
            }

            // Submit to backend
            const response = await axios.post(
                `http://localhost:8080/api/employee/form/${id}/response`,
                responsePayload,
                {
                    headers: {
                        Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Update local state directly instead of refetching to prevent duplicate records
            setRecords(prev => {
                const newData = new Map(prev.data);
                const existingRecord = newData.get(recordId) || record;

                const updatedRecord = {
                    ...existingRecord,
                    responses: {
                        ...existingRecord.responses,
                        ...responsePayload.responses.reduce((acc, { fieldId, value, linkedResponseId }) => {
                            acc[fieldId] = {
                                ...(existingRecord.responses[fieldId] || {}),
                                value,
                                responseId: recordId,
                                linkedResponseId,
                                employeeId: user?.employeeId,
                                employeeName: user?.employeeName,
                                fieldLevel: formContent.fields.find(f => f.id === fieldId)?.levelNumbers[0] || 1,
                                question: formContent.fields.find(f => f.id === fieldId)?.question || `Field ${fieldId}`
                            };
                            return acc;
                        }, {})
                    }
                };

                newData.set(recordId, updatedRecord);

                // Reset form responses for this record
                const newResponses = new Map(prev.responses);
                newResponses.set(recordId,
                    formContent.fields.reduce((acc, field) => ({
                        ...acc,
                        [field.id]: field.type === 'checkbox' ? 'false' : ''
                    }), {})
                );

                return {
                    data: newData,
                    responses: newResponses
                };
            });

            setSelectedLowerLevelResponseId(null);
            if (isEdit) {
                setEditingResponse(null);
            }

        } catch (err) {
            console.error('Error submitting response:', err);
            if (err.response) {
                const serverMessage = err.response.data?.message || err.response.data;
                setError(serverMessage || 'Failed to submit response. Please check your inputs.');
            } else {
                setError('Network error. Please check your connection and try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const getFieldIcon = (type) => {
        switch (type) {
            case 'text': return <FileText className="w-5 h-5" />;
            case 'number': return <Hash className="w-5 h-5" />;
            case 'email': return <Mail className="w-5 h-5" />;
            case 'date': return <Calendar className="w-5 h-5" />;
            case 'radio': return <CgRadioChecked className="w-5 h-5" />;
            case 'textarea': return <TextIcon className="w-5 h-5" />;
            case 'checkbox': return <CheckSquare className="w-5 h-5" />;
            case 'file': return <File className="w-5 h-5" />;
            default: return <FileText className="w-5 h-5" />;
        }
    };

    const getFieldColor = (type) => {
        switch (type) {
            case 'text': return 'bg-blue-100 text-blue-600';
            case 'number': return 'bg-green-100 text-green-600';
            case 'email': return 'bg-yellow-100 text-yellow-600';
            case 'date': return 'bg-indigo-100 text-indigo-600';
            case 'radio': return 'bg-purple-100 text-purple-600';
            case 'textarea': return 'bg-teal-100 text-teal-600';
            case 'checkbox': return 'bg-pink-100 text-pink-600';
            case 'file': return 'bg-orange-100 text-orange-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const handleAddRecord = async () => {
        if (!form) return;

        // --- Log the activity first ---
        try {
            await axios.post(
                `http://localhost:8080/api/employee/form/${id}/activity/add-record`,
                {}, // Empty body, as user info is from auth headers
                { headers: { Authorization: `Basic ${btoa(`${user?.employeeId}:password123`)}` } }
            );
            // Refresh activities after logging
            fetchActivities();
        } catch (err) {
            console.error("Failed to log 'Add Record' activity:", err);
            // Decide if you want to proceed even if logging fails
        }

        const formContent = JSON.parse(form.formContent);
        const fields = formContent.fields || [];
        const newRecordId = `record-${uuidv4()}`;

        const newRecord = {
            responseId: newRecordId,
            employeeId: user?.employeeId || 'N/A',
            employeeName: user?.employeeName || 'Current User',
            levels: fields.reduce((acc, field) => {
                const level = field.levelNumbers[0] || 1;
                return acc.includes(level) ? acc : [...acc, level];
            }, []),
            responses: fields.reduce((acc, field) => {
                acc[field.id] = {
                    value: '-',
                    responseId: newRecordId,
                    linkedResponseId: null,
                    employeeId: user?.employeeId || 'N/A',
                    employeeName: user?.employeeName || 'Current User',
                    fieldLevel: field.levelNumbers[0] || 1,
                    question: field.question || `Field ${field.id}`
                };
                return acc;
            }, {}),
            isServerRecord: false
        };

        setRecords(prev => {
            const newData = new Map(prev.data);
            newData.set(newRecordId, newRecord);
            const newResponses = new Map(prev.responses);
            newResponses.set(newRecordId, fields.reduce((acc, field) => ({ ...acc, [field.id]: field.type === 'checkbox' ? 'false' : '' }), {}));
            return { data: newData, responses: newResponses };
        });

        setExpandedRecord(newRecordId);
        setSelectedLowerLevelResponseId(null);
    };


    const renderFieldInput = (field, isEditable, canFillCurrentLevel, recordId = null) => {
        const responsesSource = recordId
            ? (records.responses.get(recordId) || {}) : responses;
        const placeholder = isEditable
            ? `Enter ${field.type}`
            : canFillCurrentLevel
                ? 'Not assigned to your level'
                : 'Waiting for higher-priority levels';

        // MODIFICATION: Form-level disable check
        const isDisabled = !isEditable || !form.active;

        switch (field.type) {
            case 'text':
            case 'email':
            case 'number':
            case 'date':
                return (
                    <input
                        type={field.type}
                        value={responsesSource[field.id] || ''}
                        onChange={(e) =>
                            recordId
                                ? handleRecordResponseChange(recordId, field.id, e.target.value)
                                : handleResponseChange(field.id, e.target.value)
                        }
                        disabled={isDisabled}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                            isDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                        }`}
                        placeholder={placeholder}
                    />
                );
            case 'textarea':
                return (
                    <textarea
                        value={responsesSource[field.id] || ''}
                        onChange={(e) =>
                            recordId
                                ? handleRecordResponseChange(recordId, field.id, e.target.value)
                                : handleResponseChange(field.id, e.target.value)
                        }
                        disabled={isDisabled}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                            isDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                        }`}
                        placeholder={placeholder}
                        rows={4}
                    />
                );
            case 'radio':
                return (
                    <div className="space-y-3">
                        {field.options?.length > 0 ? (
                            field.options.map((option, index) => (
                                <label key={index} className={`flex items-center space-x-3 p-3 bg-gray-50 rounded-lg transition-colors duration-200 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'}`}>
                                    <input
                                        type="radio"
                                        name={field.id}
                                        value={option}
                                        checked={responsesSource[field.id] === option}
                                        onChange={(e) =>
                                            recordId
                                                ? handleRecordResponseChange(recordId, field.id, e.target.value)
                                                : handleResponseChange(field.id, e.target.value)
                                        }
                                        disabled={isDisabled}
                                        className={`w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 ${
                                            isDisabled ? 'cursor-not-allowed' : ''
                                        }`}
                                    />
                                    <span className="text-gray-700 font-medium">{option}</span>
                                </label>
                            ))
                        ) : (
                            <div className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg">
                                No options available for this radio field (Field ID: {field.id})
                            </div>
                        )}
                    </div>
                );
            case 'checkbox':
                return (
                    <label className={`flex items-center space-x-3 p-3 bg-gray-50 rounded-lg transition-colors duration-200 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'}`}>
                        <input
                            type="checkbox"
                            checked={responsesSource[field.id] === 'true'}
                            onChange={(e) =>
                                recordId
                                    ? handleRecordResponseChange(recordId, field.id, e.target.checked ? 'true' : 'false')
                                    : handleResponseChange(field.id, e.target.checked ? 'true' : 'false')
                            }
                            disabled={isDisabled}
                            className={`w-4 h-4 text-pink-600 focus:ring-pink-500 border-gray-300 ${
                                isDisabled ? 'cursor-not-allowed' : ''
                            }`}
                        />
                        <span className="text-gray-700 font-medium">{field.question}</span>
                    </label>
                );
            case 'file':
                return (
                    <input
                        type="file"
                        onChange={(e) =>
                            recordId
                                ? handleRecordResponseChange(recordId, field.id, e.target.files[0]?.name || '')
                                : handleResponseChange(field.id, e.target.files[0]?.name || '')
                        }
                        disabled={isDisabled}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg ${
                            isDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                        }`}
                    />
                );
            default:
                return null;
        }
    };

    function renderResponsesTable() {
        if (!form) return null;
        const formContent = JSON.parse(form.formContent);
        const fields = formContent.fields || [];
        const accessibleFieldIds = formContent.accessibleFieldIds || [];
        const canFillCurrentLevel = formContent.canFillCurrentLevel;
        const employeeLevels = Object.keys(formContent.levelAssignments || {})
            .filter(level => formContent.levelAssignments[level].includes(user?.employeeId))
            .map(level => parseInt(level));
        const isOwner = user?.role === 'OWNER' || user?.employeeId === form.ownerEmployeeId;
        const isLevelNEmployee = Math.max(...employeeLevels, 0) >= 2;
        const isLevel1Employee = employeeLevels.includes(1);

        const lowerLevelResponses = [];
        const lowerLevelFields = isLevelNEmployee ? fields.filter(f => f.levelNumbers.includes(Math.max(...employeeLevels) - 1)).map(f => f.id) : [];

        formResponses.forEach(response => {
            response.responses?.forEach(fr => {
                if (lowerLevelFields.includes(fr.fieldId)) {
                    const responseKey = `${response.employeeId}-${fr.fieldId}`;
                    lowerLevelResponses.push({
                        responseId: responseKey,
                        employeeId: response.employeeId,
                        employeeName: response.employeeName || response.employeeId, // Fallback to ID if name missing
                        value: fr.value || 'No value',
                        fieldId: fr.fieldId,
                        question: fields.find(f => f.id === fr.fieldId)?.question || `Field ${fr.fieldId}`,
                        linkedResponseId: fr.linkedResponseId || null
                    });
                }
            });
        });

        return (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-lg border border-gray-100 mb-8 backdrop-blur-sm">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-1">Form Responses</h3>
                                <p className="text-blue-100 text-sm">Manage and review all form submissions</p>
                            </div>
                        </div>
                        {/* Add Record Button for Level 1 Employees */}
                        {isLevel1Employee && (
                            <button
                                type="button"
                                onClick={handleAddRecord}
                                disabled={!form.active} // MODIFICATION: Disable if form is inactive
                                className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                Add Record
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-8">
                    {/* --- NEW: Search and Filter Controls --- */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="md:col-span-2 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by Record Name, Employee ID, or Name..."
                                value={recordSearchTerm}
                                onChange={(e) => setRecordSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select
                                value={recordFilter}
                                onChange={(e) => setRecordFilter(e.target.value)}
                                className="w-full appearance-none pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                            >
                                <option value="all">Show All Records</option>
                                <option value="complete">Completely Filled</option>
                                <option value="partial">Partially Filled</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                    {/* Table Section */}
                    <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
                        <div className="relative overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr>
                                    {[
                                        { label: 'Record', icon: FileText, sticky: true, style: 'left-0 z-20' },
                                        { label: 'Employee ID', icon: Hash, sticky: true, style: 'left-[120px] z-20' },
                                        { label: 'Employee Name', icon: User, sticky: true, style: 'left-[220px] z-20' },
                                        { label: 'Levels', icon: Layers, sticky: true, style: 'left-[360px] z-20' },
                                        ...fields.map((field, index) => ({
                                            label: `Q${index + 1}: ${field.question || `Field ${field.id}`}`,
                                            icon: MessageSquare,
                                            sticky: false
                                        })),
                                        { label: 'Actions', icon: Settings, sticky: true, style: 'right-0 z-20' }
                                    ].map((header, index) => (
                                        <th
                                            key={index}
                                            className={`group px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                                                header.sticky ? `sticky ${header.style} bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200` : ''
                                            }`}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <header.icon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                                <span>{header.label}</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                {filteredRecords.map((record, recordIndex) => (
                                    <React.Fragment key={record.responseId}>
                                        <tr className="group hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 w-screen">
                                            <td className="px-6 py-4 whitespace-nowrap sticky left-0 z-10 bg-white border-r border-gray-200 group-hover:bg-gradient-to-r group-hover:from-blue-50 group-hover:to-purple-50">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                                                        <span className="text-sm font-semibold text-blue-700">{recordIndex + 1}</span>
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900">Record {recordIndex + 1}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap sticky left-[120px] z-10 bg-white border-r border-gray-200 group-hover:bg-gradient-to-r group-hover:from-blue-50 group-hover:to-purple-50">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {record.employeeId}
                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap sticky left-[220px] z-10 bg-white border-r border-gray-200 group-hover:bg-gradient-to-r group-hover:from-blue-50 group-hover:to-purple-50">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                                                        <User className="w-4 h-4 text-green-600" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900">{record.employeeName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap sticky left-[360px] z-10 bg-white border-r border-gray-200 group-hover:bg-gradient-to-r group-hover:from-blue-50 group-hover:to-purple-50">
                                                <div className="flex flex-wrap gap-1">
                                                    {record.levels.sort((a, b) => a - b).map(level => (
                                                        <span key={level} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        L{level}
                    </span>
                                                    ))}
                                                </div>
                                            </td>
                                            {fields.map(field => {
                                                const response = record.responses[field.id];
                                                const isEditingThisCell = editingResponse?.fieldId === field.id &&
                                                    editingResponse?.employeeId === (response ? response.employeeId.split(', ')[0] : record.employeeId);
                                                const canEdit = (isOwner || employeeLevels.includes(response?.fieldLevel)) &&
                                                    accessibleFieldIds.includes(field.id);

                                                return (
                                                    <td key={field.id} className="px-6 py-4 whitespace-nowrap">
                                                        {isEditingThisCell ? (
                                                            <div className="flex flex-col items-center gap-3">
                                                                <input
                                                                    type="text"
                                                                    value={editingResponse.value}
                                                                    onChange={(e) => handleEditResponseChange(e.target.value)}
                                                                    disabled={!form.active} // MODIFICATION
                                                                    className="w-full max-w-xs px-3 py-2 text-center border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100"
                                                                    placeholder="Enter response..."
                                                                />
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            handleSubmit(e, true, field.id, response.employeeId.split(', ')[0]);
                                                                        }}
                                                                        disabled={submitting || !form.active} // MODIFICATION
                                                                        className="inline-flex items-center px-3 py-1 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                                                                    >
                                                                        <Save className="w-3 h-3 mr-1" />
                                                                        Save
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            handleCancelEdit();
                                                                        }}
                                                                        className="inline-flex items-center px-3 py-1 rounded-lg bg-gray-500 text-white text-xs font-medium hover:bg-gray-600 transition-all duration-200 transform hover:scale-105"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-2">
                                                                {response ? (
                                                                    <div className="flex flex-col items-center">
                                    <span
                                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium max-w-xs truncate ${
                                            response.value === '-'
                                                ? 'bg-gray-100 text-gray-600'
                                                : 'bg-blue-100 text-blue-700'
                                        }`}
                                        title={`${response.value} (by ${response.employeeName})`}
                                    >
                                        {response.value}
                                    </span>
                                                                        <span className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                                        {response.employeeName}
                                    </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                    -
                                </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            {/* START: MODIFIED ACTIONS CELL */}
                                            <td className="px-6 py-4 whitespace-nowrap text-center sticky right-0 z-10 bg-white border-l border-gray-200 group-hover:bg-gradient-to-r group-hover:from-blue-50 group-hover:to-purple-50">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setExpandedRecord(expandedRecord === record.responseId ? null : record.responseId);
                                                            if (expandedRecord !== record.responseId) {
                                                                handleSelectRecord(record.responseId);
                                                            }
                                                        }}
                                                        disabled={!form.active}
                                                        className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {expandedRecord === record.responseId ? (
                                                            <ChevronUp className="w-4 h-4" />
                                                        ) : (
                                                            <ChevronDown className="w-4 h-4" />
                                                        )}
                                                    </button>

                                                    {record.employeeId === user?.employeeId && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteRecord(record.responseId)}
                                                            disabled={!form.active || submitting}
                                                            className="inline-flex items-center p-2 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Delete Record"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            {/* END: MODIFIED ACTIONS CELL */}
                                        </tr>
                                        {expandedRecord === record.responseId && (
                                            <tr>
                                                <td colSpan={fields.length + 5} className="p-0">
                                                    <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-8 border-t border-gray-200 overflow-x-hidden">
                                                        <form onSubmit={(e) => {
                                                            console.log('Submitting form for recordId:', record.responseId);
                                                            handleSubmit(e, false, null, null, record.responseId);
                                                        }} className="space-y-8">
                                                            {/* Permission Warning */}
                                                            {!(canFillCurrentLevel && employeeLevels.length > 0) && (
                                                                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-6">
                                                                    <div className="flex items-start space-x-4">
                                                                        <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                                                                            <AlertCircle className="w-6 h-6 text-yellow-600" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-lg font-semibold text-yellow-800 mb-2">Access Restricted</h4>
                                                                            <p className="text-yellow-700">
                                                                                You are not assigned to any level in this form and cannot fill it.
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* No Fields Message */}
                                                            {fields.length === 0 ? (
                                                                <div className="text-center py-16">
                                                                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center">
                                                                        <Users className="w-10 h-10 text-gray-400" />
                                                                    </div>
                                                                    <h4 className="text-2xl font-bold text-gray-900 mb-3">No Fields Available</h4>
                                                                    <p className="text-gray-600 text-lg">This form has no fields configured.</p>
                                                                </div>
                                                            ) : (
                                                                /* Field Cards */
                                                                <div className="grid gap-6">
                                                                    {fields.map((field, index) => {
                                                                        const response = record.responses[field.id];
                                                                        const canEdit = (isOwner || employeeLevels.includes(response?.fieldLevel)) && accessibleFieldIds.includes(field.id);
                                                                        const isEditingThisField = editingResponse?.recordId === record.responseId && editingResponse?.fieldId === field.id;

                                                                        return (
                                                                            <div
                                                                                key={field.id}
                                                                                className="bg-white border border-gray-200 rounded-2xl p-8 hover:border-gray-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 w-full max-w-full"
                                                                            >
                                                                                {/* Field Header */}
                                                                                <div className="flex items-start space-x-6 mb-6">
                                                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${getFieldColor(field.type)}`}>
                                                                                        {getFieldIcon(field.type)}
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                        <div className="flex items-center flex-wrap gap-3 mb-3">
                                                                                            <h4 className="text-xl font-bold text-gray-900">
                                                                                                Question {index + 1}
                                                                                            </h4>
                                                                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getFieldColor(field.type)}`}>
                                                            {field.type}
                                                        </span>
                                                                                            {!(accessibleFieldIds.includes(field.id) && (isOwner ? employeeLevels.some(level => field.levelNumbers.includes(level)) : true)) && (
                                                                                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                                View Only
                                                            </span>
                                                                                            )}
                                                                                        </div>
                                                                                        <p className="text-gray-700 text-lg leading-relaxed break-words">
                                                                                            {field.question || 'No question text'}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Field Content */}
                                                                                <div className="ml-20">
                                                                                    {isEditingThisField ? (
                                                                                        // --- EDITING UI ---
                                                                                        <div className="space-y-4">
                                                                                            <input
                                                                                                type="text"
                                                                                                value={editingResponse.value}
                                                                                                onChange={(e) => handleEditResponseChange(e.target.value)}
                                                                                                className="w-full max-w-2xl px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg"
                                                                                                placeholder="Enter your response..."
                                                                                                autoFocus
                                                                                            />
                                                                                            <div className="flex gap-3">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={handleSaveEdit}
                                                                                                    disabled={submitting}
                                                                                                    className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
                                                                                                >
                                                                                                    <Save className="w-5 h-5 mr-2" />
                                                                                                    {submitting ? 'Saving...' : 'Save Changes'}
                                                                                                </button>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={handleCancelEdit}
                                                                                                    className="inline-flex items-center px-6 py-3 rounded-xl bg-gray-500 text-white font-medium hover:bg-gray-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
                                                                                                >
                                                                                                    Cancel
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        // --- DISPLAY UI ---
                                                                                        <div className="flex items-start gap-6">
                                                                                            <div className="flex-1">
                                                                                                {renderFieldInput(field, accessibleFieldIds.includes(field.id) && canFillCurrentLevel && employeeLevels.length > 0 && (isOwner ? employeeLevels.some(level => field.levelNumbers.includes(level)) : true), canFillCurrentLevel, record.responseId)}
                                                                                            </div>
                                                                                            {canEdit && response && response.value !== '-' && (
                                                                                                <div className="flex flex-col gap-3">
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => handleEditResponse(record.responseId, field.id, response.value)}
                                                                                                        disabled={!form.active} // MODIFICATION
                                                                                                        className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50"
                                                                                                    >
                                                                                                        <Pencil className="w-4 h-4 mr-2" />
                                                                                                        Edit
                                                                                                    </button>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => handleDeleteResponse(record.responseId, field.id, response.employeeId)}
                                                                                                        disabled={!form.active} // MODIFICATION
                                                                                                        className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-white font-medium text-sm hover:from-red-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50"
                                                                                                    >
                                                                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                                                                        Delete
                                                                                                    </button>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {/* Level Assignment Info */}
                                                                                <div className="ml-20 mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                                                                                    <div className="flex items-center space-x-3 mb-4">
                                                                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                                                            <Users className="w-4 h-4 text-blue-600" />
                                                                                        </div>
                                                                                        <span className="text-sm font-semibold text-blue-900">Assigned Levels</span>
                                                                                    </div>
                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        {(field.levelNumbers || []).length > 0 ? (
                                                                                            field.levelNumbers.map((level, levelIndex) => (
                                                                                                <span
                                                                                                    key={levelIndex}
                                                                                                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-full shadow-sm"
                                                                                                >
                                                                Level {level}
                                                            </span>
                                                                                            ))
                                                                                        ) : (
                                                                                            <span className="text-sm text-blue-600 italic">
                                                            No levels assigned
                                                        </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}

                                                            {/* Submit Button */}
                                                            {fields.length > 0 && (
                                                                <div className="flex justify-end pt-6">
                                                                    <button
                                                                        type="submit"
                                                                        disabled={
                                                                            submitting ||
                                                                            !form.active || // MODIFICATION
                                                                            !(canFillCurrentLevel && employeeLevels.length > 0) ||
                                                                            (Math.max(...employeeLevels) >= 2 &&
                                                                                fields.some(f => f.levelNumbers.includes(Math.max(...employeeLevels))) &&
                                                                                !selectedLowerLevelResponseId) ||
                                                                            !fields.some(field => {
                                                                                const response = record.responses[field.id];
                                                                                return (
                                                                                    accessibleFieldIds.includes(field.id) &&
                                                                                    (isOwner ? employeeLevels.some(level => field.levelNumbers.includes(level)) : true) &&
                                                                                    (!response || response.value === '-' || response.employeeId === user?.employeeId)
                                                                                );
                                                                            })
                                                                        }
                                                                        className="inline-flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg hover:shadow-xl"
                                                                    >
                                                                        {submitting ? (
                                                                            <>
                                                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                                                <span>Submitting...</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Save className="w-5 h-5" />
                                                                                <span>Submit Responses</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </form>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    // --- HELPER FUNCTIONS FOR ACTIVITY LOG ---
    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffSeconds = Math.floor(diffMs / 1000);
        if (diffSeconds < 60) return 'just now';
        const diffMinutes = Math.floor(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours} hr ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 30) return `${diffDays} day(s) ago`;
        return time.toLocaleDateString('en-IN');
    };

    const getActivityIconAndColor = (actionType) => {
        switch (actionType) {
            // --- NEW ---
            case 'ADD_RECORD': return { icon: <Plus />, bgColor: 'bg-cyan-100', textColor: 'text-cyan-600' };
            case 'CREATE': return { icon: <Plus />, bgColor: 'bg-green-100', textColor: 'text-green-600' };
            case 'SUBMIT': return { icon: <CheckCircle />, bgColor: 'bg-blue-100', textColor: 'text-blue-600' };
            case 'UPDATE_RESPONSE':
            case 'UPDATE':
                return { icon: <Pencil />, bgColor: 'bg-yellow-100', textColor: 'text-yellow-600' };
            case 'DELETE_RESPONSE':
            case 'DELETE_RECORD':
            case 'DELETE':
                return { icon: <Trash2 />, bgColor: 'bg-red-100', textColor: 'text-red-600' };
            case 'STATUS_CHANGE': return { icon: <Zap />, bgColor: 'bg-purple-100', textColor: 'text-purple-600' };
            default: return { icon: <FileText />, bgColor: 'bg-gray-100', textColor: 'text-gray-600' };
        }
    };

    const getActivityDescription = (activity) => {
        switch (activity.actionType) {
            // --- NEW ---
            case 'ADD_RECORD': return `added a new record`;
            case 'CREATE': return `created the form`;
            case 'UPDATE_RESPONSE': return `edited a response`;
            case 'SUBMIT': return `submitted a response`;
            case 'UPDATE': return `updated the form`;
            case 'DELETE_RESPONSE': return `deleted a response`;
            case 'DELETE_RECORD': return `deleted a record`;
            case 'DELETE': return `deleted the form`;
            case 'STATUS_CHANGE': return `changed the status`;
            default: return `performed an action`;
        }
    };

    const filteredRecords = useMemo(() => {
        if (!form) return [];
        try {
            const formContent = JSON.parse(form.formContent);
            const fields = formContent.fields || [];
            const allRecordsAsArray = Array.from(records.data.values());

            return allRecordsAsArray
                .filter(record => {
                    // Search Logic
                    const lowerCaseSearchTerm = recordSearchTerm.toLowerCase();
                    const recordIndex = allRecordsAsArray.findIndex(r => r.responseId === record.responseId) + 1;
                    const recordName = `record ${recordIndex}`;

                    const searchMatch = !recordSearchTerm || (
                        record.employeeId.toLowerCase().includes(lowerCaseSearchTerm) ||
                        record.employeeName.toLowerCase().includes(lowerCaseSearchTerm) ||
                        recordName.includes(lowerCaseSearchTerm)
                    );

                    if (!searchMatch) return false;

                    // Filter Logic
                    const totalFields = fields.length;
                    if (totalFields === 0) return true; // No fields to check, so it's "complete"

                    const filledFieldsCount = Object.values(record.responses).filter(r => r && r.value && r.value !== '-').length;

                    switch (recordFilter) {
                        case 'complete':
                            return filledFieldsCount === totalFields;
                        case 'partial':
                            return filledFieldsCount > 0 && filledFieldsCount < totalFields;
                        case 'all':
                        default:
                            return true;
                    }
                });
        } catch (e) {
            console.error("Error parsing form content for filtering:", e);
            return Array.from(records.data.values()); // Fallback
        }
    }, [records.data, recordSearchTerm, recordFilter, form]);

    function renderActivityLog() {
        if (!formActivities || formActivities.length === 0) {
            return null; // Don't render if there's no activity
        }

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                <div className="p-8">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Recent Form Activity</h3>
                    <div className="border-t border-gray-200 pt-4">
                        <ul className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {formActivities.map((activity, index) => {
                                const { icon, bgColor, textColor } = getActivityIconAndColor(activity.actionType);
                                return (
                                    <li key={index} className="flex items-start space-x-4">
                                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${bgColor}`}>
                                            {React.cloneElement(icon, { className: `w-5 h-5 ${textColor}` })}
                                        </div>
                                        <div className="flex-grow">
                                            <p className="text-sm text-slate-800">
                                                <span className="font-semibold">{activity.employeeName}</span> ({activity.employeeId}){' '}
                                                {getActivityDescription(activity)}.
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-700">Loading form...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                    <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">Error</h3>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!form) return null;

    const isOwner = user?.role === 'OWNER' || user?.employeeId === form.ownerEmployeeId;
    let formContent;
    try {
        formContent = JSON.parse(form.formContent);
    } catch (e) {
        console.error('Error parsing form content:', e);
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                    <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">Invalid Form Content</h3>
                    <p className="text-gray-600">The form content appears to be corrupted or invalid.</p>
                </div>
            </div>
        );
    }

    const fields = formContent.fields || [];
    const accessibleFieldIds = formContent.accessibleFieldIds || [];
    const canFillCurrentLevel = formContent.canFillCurrentLevel;
    const levelPriorityOrder = formContent.levelPriorityOrder || [];
    const employeeLevels = Object.keys(formContent.levelAssignments || {})
        .filter(level => formContent.levelAssignments[level].includes(user?.employeeId))
        .map(level => parseInt(level));

// Create a map for efficient employee name lookups
    const employeeNameMap = new Map();
    formResponses.forEach(response => {
        if (!employeeNameMap.has(response.employeeId)) {
            employeeNameMap.set(response.employeeId, response.employeeName || response.employeeId);
        }
    });
// Ensure all assigned employees are in the map, even if they haven't responded
    Object.values(formContent.levelAssignments || {}).flat().forEach(employeeId => {
        if (!employeeNameMap.has(employeeId)) {
            employeeNameMap.set(employeeId, employeeId); // Fallback to ID if name not found
        }
    });


    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                                    <Fuel className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-semibold text-gray-900">HPCL</h1>
                                    <p className="text-xs text-gray-600">Digital Forms</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Dashboard
                            </button>
                            {user && (
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                            <User className="w-3 h-3 text-white" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-gray-900">{user.employeeName}</p>
                                            <p className="text-xs text-gray-600">{user.employeeId}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-200"
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="max-w-screen mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                    <div className="p-8">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center space-x-4">
                                <h2 className="text-3xl font-semibold text-gray-900">{form.title}</h2>
                                {/* MODIFICATION: Inactive Badge */}
                                {!form.active && (
                                    <span className="bg-red-100 text-red-800 px-4 py-1.5 rounded-full text-sm font-semibold">
                                        Inactive
                                    </span>
                                )}
                            </div>
                            {isOwner && (
                                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                    Owner
                                </div>
                            )}
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-gray-600 mb-6">
                            <div className="flex items-center space-x-1">
                                <Hash className="w-4 h-4" />
                                <span>Form ID: {form.id}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>Created: {new Date(form.createdAt || Date.now()).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                            {/* START: MODIFIED SECTION */}
                            {isOwner && (
                                <>
                                    <button
                                        onClick={() => navigate(`/form/${id}/edit`)}
                                        className="flex flex-col items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors duration-200 group"
                                    >
                                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-700 transition-colors duration-200">
                                            <Edit3 className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="font-medium text-gray-900">Edit Form</span>
                                        <span className="text-sm text-gray-600 mt-1">Modify questions</span>
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="flex flex-col items-center p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors duration-200 group"
                                    >
                                        <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-red-700 transition-colors duration-200">
                                            <Trash2 className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="font-medium text-gray-900">Delete Form</span>
                                        <span className="text-sm text-gray-600 mt-1">Remove permanently</span>
                                    </button>
                                    {/* MODIFICATION: Toggle Active/Inactive Button */}
                                    <button
                                        onClick={handleToggleStatus}
                                        className={`flex flex-col items-center p-4 rounded-xl transition-colors duration-200 group ${form.active ? 'bg-yellow-50 hover:bg-yellow-100' : 'bg-green-50 hover:bg-green-100'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors duration-200 ${form.active ? 'bg-yellow-500 group-hover:bg-yellow-600' : 'bg-green-600 group-hover:bg-green-700'}`}>
                                            {form.active ? <ZapOff className="w-5 h-5 text-white" /> : <Zap className="w-5 h-5 text-white" />}
                                        </div>
                                        <span className="font-medium text-gray-900">{form.active ? 'Deactivate' : 'Activate'} Form</span>
                                        <span className="text-sm text-gray-600 mt-1">{form.active ? 'Disable submissions' : 'Enable submissions'}</span>
                                    </button>
                                </>
                            )}
                            {(isOwner || employeeLevels.length > 0) && (
                                <button
                                    onClick={() => navigate(`/form/${id}/responses`)}
                                    className="flex flex-col items-center p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors duration-200 group"
                                >
                                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-700 transition-colors duration-200">
                                        <BarChart3 className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="font-medium text-gray-900">View Responses</span>
                                    <span className="text-sm text-gray-600 mt-1">See submissions</span>
                                </button>
                            )}
                            {(isOwner || employeeLevels.length > 0) && (
                                <button
                                    onClick={handleDownloadExcel}
                                    className="flex flex-col items-center p-4 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors duration-200 group"
                                >
                                    <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-teal-700 transition-colors duration-200">
                                        <Download className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="font-medium text-gray-900">Download Excel</span>
                                    <span className="text-sm text-gray-600 mt-1">Export form data</span>
                                </button>
                            )}
                            {/* END: MODIFIED SECTION */}
                            <button
                                disabled={!(canFillCurrentLevel && employeeLevels.length > 0) || !form.active} // MODIFICATION
                                className={`flex flex-col items-center p-4 rounded-xl transition-colors duration-200 group ${canFillCurrentLevel && employeeLevels.length > 0 && form.active ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-100 cursor-not-allowed'}`}
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors duration-200 ${canFillCurrentLevel && employeeLevels.length > 0 && form.active ? 'bg-green-600 group-hover:bg-green-700' : 'bg-gray-400'}`}>
                                    <CheckCircle className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-medium text-gray-900">Fill Form</span>
                                <span className="text-sm text-gray-600 mt-1">{!form.active ? 'Form is inactive' : (canFillCurrentLevel && employeeLevels.length > 0 ? 'Submit response' : 'Not assigned or waiting')}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* START: NEW MERGED COMPONENT */}
                {levelPriorityOrder.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                        <div className="p-8">
                            <div className="flex items-center space-x-4 mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                                    <Layers className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-semibold text-gray-900">Form Levels & Assignments</h3>
                                    <p className="text-gray-600">The priority order in which levels must be filled, and the employees assigned to each.</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Level</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned Employees</th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {levelPriorityOrder.map((level, index) => {
                                        const employees = formContent.levelAssignments[level] || [];
                                        return (
                                            <tr key={level} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-200 text-gray-700 text-sm font-bold rounded-full">
                                                        {index + 1}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-4 py-1.5 text-sm font-semibold text-blue-800 bg-blue-100 rounded-full">
                                                        Level {level}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {employees.length > 0 ? employees.map(empId => (
                                                            <span
                                                                key={empId}
                                                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                                                            >
                                                            {empId}
                                                            </span>
                                                        )) : (
                                                            <span className="text-sm text-gray-500 italic">No employees assigned</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                {/* END: NEW MERGED COMPONENT */}

                {renderResponsesTable()}
                {renderActivityLog()}
                <div className="mt-8 text-center">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <p className="text-sm text-gray-600 mb-0">© 2025 Hindustan Petroleum Corporation Limited</p>
                        <div className="flex items-center justify-center space-x-4 text-xs font-medium text-gray-500">
                            <div className="flex items-center space-x-2">
                                <Shield className="w-3 h-3" />
                                <span>Secure Platform</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Zap className="w-3 h-3" />
                                <span>Real-time Processing</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FormView;