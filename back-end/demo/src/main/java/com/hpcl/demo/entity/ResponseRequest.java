package com.hpcl.demo.entity;

import java.util.List;

public class ResponseRequest {
    private Long formId;
    private String employeeId;
    private List<FieldResponse> responses;

    public static class FieldResponse {
        private String fieldId;
        private String value;

        public String getFieldId() {
            return fieldId;
        }

        public void setFieldId(String fieldId) {
            this.fieldId = fieldId;
        }

        public String getValue() {
            return value;
        }

        public void setValue(String value) {
            this.value = value;
        }
    }

    public Long getFormId() {
        return formId;
    }

    public void setFormId(Long formId) {
        this.formId = formId;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    public List<FieldResponse> getResponses() {
        return responses;
    }

    public void setResponses(List<FieldResponse> responses) {
        this.responses = responses;
    }
}