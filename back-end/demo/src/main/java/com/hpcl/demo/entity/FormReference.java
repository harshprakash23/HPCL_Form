package com.hpcl.demo.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "form_reference")
@Data
public class FormReference {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "form_id", nullable = false)
    private Long formId;

    @Column(name = "employee_id", nullable = false)
    private String employeeId;
}
