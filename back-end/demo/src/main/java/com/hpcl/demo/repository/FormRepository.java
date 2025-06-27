package com.hpcl.demo.repository;

import com.hpcl.demo.entity.Form;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FormRepository extends JpaRepository<Form, Long> {
    List<Form> findByOwnerEmployeeId(String ownerEmployeeId);
}