package com.hpcl.demo.repository;

import com.hpcl.demo.entity.FormEmployeeLevel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FormEmployeeLevelRepository extends JpaRepository<FormEmployeeLevel, Long> {
    List<FormEmployeeLevel> findByEmployeeId(String employeeId);
}