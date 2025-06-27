package com.hpcl.demo.repository;

import com.hpcl.demo.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeRepository extends JpaRepository<Employee, String> {
    Employee findByEmployeeId(String employeeId);
}