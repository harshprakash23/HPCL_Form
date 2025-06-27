package com.hpcl.demo.entity;

import jakarta.persistence.*;
import java.time.ZonedDateTime;
import java.util.Objects; // IMPORT THIS

@Entity
@Table(name = "activity_log")
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "action_type", nullable = false)
    private String actionType; // VIEW or SUBMIT

    @Column(name = "form_id", nullable = true)
    private Long formId;

    @Column(name = "form_title", nullable = false)
    private String formTitle;

    @Column(name = "employee_id", nullable = false)
    private String employeeId;

    @Column(name = "employee_name", nullable = false)
    private String employeeName;

    @Column(name = "timestamp", nullable = false)
    private ZonedDateTime timestamp;

    // Constructors
    public ActivityLog() {}

    public ActivityLog(String actionType, Long formId, String formTitle, String employeeId, String employeeName, ZonedDateTime timestamp) {
        this.actionType = actionType;
        this.formId = formId;
        this.formTitle = formTitle;
        this.employeeId = employeeId;
        this.employeeName = employeeName;
        this.timestamp = timestamp;
    }

    // Getters and Setters (omitted for brevity, they remain unchanged)
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }
    public Long getFormId() { return formId; }
    public void setFormId(Long formId) { this.formId = formId; }
    public String getFormTitle() { return formTitle; }
    public void setFormTitle(String formTitle) { this.formTitle = formTitle; }
    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
    public String getEmployeeName() { return employeeName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }
    public ZonedDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(ZonedDateTime timestamp) { this.timestamp = timestamp; }


    // --- ADDED METHODS ---
    // These methods are required to correctly de-duplicate activities when merging lists.
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ActivityLog that = (ActivityLog) o;
        // Two activity logs are considered equal if they have the same ID.
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        // The hash code is based on the ID.
        return Objects.hash(id);
    }
}