package com.hpcl.demo.service;

import com.hpcl.demo.entity.*;
import com.hpcl.demo.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FormService {

    @Autowired
    private FormRepository formRepository;

    @Autowired
    private FormLevelRepository formLevelRepository;

    @Autowired
    private FormFieldAccessRepository formFieldAccessRepository;

    @Autowired
    private FormEmployeeLevelRepository formEmployeeLevelRepository;

    @Autowired
    private FormReferenceRepository formReferenceRepository;

    @Autowired
    private ResponseRepository responseRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Transactional
    public Form createForm(Form form) {
        return formRepository.save(form);
    }

    @Transactional
    public Form createFormWithAssignments(FormRequest formRequest, String ownerEmployeeId) {
        Form form = new Form();
        form.setTitle(formRequest.getTitle());
        form.setFormContent(formRequest.getFormContent());
        form.setOwnerEmployeeId(ownerEmployeeId);
        return formRepository.save(form);
    }

    @Transactional
    public FormLevel addFormLevel(FormLevel formLevel) {
        return formLevelRepository.save(formLevel);
    }

    @Transactional
    public FormFieldAccess addFieldAccess(FormFieldAccess access) {
        return formFieldAccessRepository.save(access);
    }

    @Transactional
    public FormEmployeeLevel assignEmployeeLevel(FormEmployeeLevel level) {
        return formEmployeeLevelRepository.save(level);
    }

    @Transactional
    public FormReference addReference(FormReference reference) {
        return formReferenceRepository.save(reference);
    }

    @Transactional
    public Response saveResponse(Response response) {
        return responseRepository.save(response);
    }
}