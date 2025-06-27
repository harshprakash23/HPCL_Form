package com.hpcl.demo.repository;

import com.hpcl.demo.entity.ActivityLog;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    @Transactional
    void deleteByFormId(Long formId);

    // Note: This custom query is functionally identical to the default JpaRepository method.
    // Consider removing it and using the default `findAll(Pageable pageable)` for simplicity.
    @Query("SELECT a FROM ActivityLog a ORDER BY a.timestamp DESC")
    List<ActivityLog> findTop10ByOrderByTimestampDesc(Pageable pageable);

    // Note: This custom query can be replaced by a simpler method name if desired.
    @Query("SELECT a FROM ActivityLog a WHERE a.formId IN :formIds ORDER BY a.timestamp DESC")
    List<ActivityLog> findTop10ByFormIdsOrderByTimestampDesc(@Param("formIds") List<Long> formIds, Pageable pageable);

    @Query("SELECT a FROM ActivityLog a WHERE a.actionType != :actionType ORDER BY a.timestamp DESC")
    List<ActivityLog> findTop10ByActionTypeNotOrderByTimestampDesc(@Param("actionType") String actionType, Pageable pageable);

    @Query("SELECT a FROM ActivityLog a WHERE a.formId IN :formIds AND a.actionType != :actionType ORDER BY a.timestamp DESC")
    List<ActivityLog> findTop10ByFormIdsAndActionTypeNotOrderByTimestampDesc(@Param("formIds") List<Long> formIds, @Param("actionType") String actionType, Pageable pageable);

    @Query("SELECT DISTINCT a.formId FROM ActivityLog a WHERE a.employeeId = :employeeId AND a.formId IS NOT NULL")
    List<Long> findDistinctFormIdsByEmployeeId(@Param("employeeId") String employeeId);

    List<ActivityLog> findByFormIdOrderByTimestampDesc(Long formId);

    // --- ADDED METHOD ---
    // This new method is used by the controller to fetch activities performed by a specific user.
    // Spring Data JPA automatically creates the query from this method name.
    List<ActivityLog> findTop10ByEmployeeIdAndActionTypeNotOrderByTimestampDesc(String employeeId, String actionType, Pageable pageable);
}