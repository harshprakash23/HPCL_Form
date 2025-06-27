package com.hpcl.demo.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "form_field_access")
@Data
public class FormFieldAccess {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "form_id", nullable = false)
    private Long formId;

    @Column(name = "level_number", nullable = false)
    private Integer levelNumber;

    @Column(name = "field_id", nullable = false)
    private String fieldId;
}