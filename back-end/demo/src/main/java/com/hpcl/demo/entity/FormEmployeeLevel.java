package com.hpcl.demo.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "form_employee_level")
@Data
public class FormEmployeeLevel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "form_id", nullable = false)
    private Long formId;

    @Column(name = "employee_id", nullable = false)
    private String employeeId;

    @Column(name = "level_number", nullable = false)
    private Integer levelNumber;

    // Explicit getters and setters to ensure compatibility
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public Integer getLevelNumber() {
        return levelNumber;
    }

    public void setLevelNumber(Integer levelNumber) {
        this.levelNumber = levelNumber;
    }
}