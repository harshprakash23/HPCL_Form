package com.hpcl.demo.repository;

import com.hpcl.demo.entity.Response;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ResponseRepository extends JpaRepository<Response, Long> {

    // --- Query Methods (Read-only) ---

    List<Response> findByFormId(Long formId);

    List<Response> findByFormIdOrderByIdDesc(Long formId);

    List<Response> findByFormIdAndEmployeeId(Long formId, String employeeId);

    List<Response> findByFormIdAndRecordId(Long formId, String recordId);


    // --- Modifying Methods (Write/Delete) ---

    /**
     * Deletes all responses associated with a specific form ID.
     * @Transactional and @Modifying are required for delete operations.
     */
    @Transactional
    @Modifying
    void deleteByFormId(Long formId);

    /**
     * Deletes all responses submitted by a specific employee for a specific form.
     * @Transactional and @Modifying are required for delete operations.
     */
    @Transactional
    @Modifying
    void deleteByFormIdAndEmployeeId(Long formId, String employeeId);

    /**
     * Deletes all responses associated with a specific record ID within a form.
     * This is the corrected method to fix the 500 error.
     * @Transactional and @Modifying are required for delete operations.
     */
    @Transactional
    @Modifying
    void deleteByFormIdAndRecordId(Long formId, String recordId);
}
