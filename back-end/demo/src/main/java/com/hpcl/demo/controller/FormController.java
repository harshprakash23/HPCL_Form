package com.hpcl.demo.controller;

import com.hpcl.demo.entity.*;
import com.hpcl.demo.repository.ActivityLogRepository;
import com.hpcl.demo.service.FormService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.hpcl.demo.repository.EmployeeRepository;
import com.hpcl.demo.repository.FormRepository;
import com.hpcl.demo.repository.ResponseRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Pageable;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import java.util.Comparator;

@RestController
@RequestMapping("/api")
public class FormController {

    private static final Logger logger = LoggerFactory.getLogger(FormController.class);

    @Autowired
    private FormService formService;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private FormRepository formRepository;

    @Autowired
    private ResponseRepository responseRepository;

    @Autowired
    private ActivityLogRepository activityLogRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @GetMapping("/employee/profile")
    public ResponseEntity<Employee> getProfile(Authentication authentication) {
        String employeeId = authentication.getName();
        Employee employee = employeeRepository.findByEmployeeId(employeeId);
        if (employee == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(employee);
    }

    @GetMapping("/employee/all")
    public ResponseEntity<List<Employee>> getAllEmployees() {
        List<Employee> employees = employeeRepository.findAll();
        return ResponseEntity.ok(employees);
    }

    @GetMapping("/employee/forms")
    public ResponseEntity<List<Form>> getForms(Authentication authentication) {
        String employeeId = authentication.getName();
        Employee employee = employeeRepository.findByEmployeeId(employeeId);
        if (employee == null) {
            logger.error("Employee ID {} not found", employeeId);
            return ResponseEntity.notFound().build();
        }

        List<Form> forms;
        if (employee.getRole() == Employee.Role.OWNER) {
            forms = formRepository.findAll();
        } else {
            List<Form> ownedForms = formRepository.findByOwnerEmployeeId(employeeId);
            List<Form> assignedForms = formRepository.findAll().stream()
                    .filter(form -> {
                        try {
                            FormContent formContent = objectMapper.readValue(form.getFormContent(), FormContent.class);
                            Map<Integer, List<String>> levelAssignments = formContent.getLevelAssignments();
                            return levelAssignments.values().stream()
                                    .anyMatch(employeeIds -> employeeIds.contains(employeeId));
                        } catch (Exception e) {
                            logger.error("Error parsing form content for form ID {}: {}", form.getId(), e.getMessage());
                            return false;
                        }
                    })
                    .collect(Collectors.toList());
            forms = Stream.concat(ownedForms.stream(), assignedForms.stream())
                    .distinct()
                    .collect(Collectors.toList());
        }
        return ResponseEntity.ok(forms);
    }

    @GetMapping("/employee/form/{id}")
    public ResponseEntity<Form> getFormById(@PathVariable Long id, Authentication authentication) {
        String employeeId = authentication.getName();
        logger.debug("Fetching form ID {} for employee ID {}", id, employeeId);
        Employee employee = employeeRepository.findByEmployeeId(employeeId);
        if (employee == null) {
            logger.error("Employee ID {} not found", employeeId);
            return ResponseEntity.notFound().build();
        }

        Optional<Form> form = formRepository.findById(id);
        if (form.isEmpty()) {
            logger.error("Form ID {} not found", id);
            return ResponseEntity.notFound().build();
        }

        Form formEntity = form.get();
        FormContent formContent;
        try {
            if (formEntity.getFormContent() == null || formEntity.getFormContent().isEmpty()) {
                logger.error("Form content is null or empty for form ID {}", id);
                return ResponseEntity.status(400).build();
            }
            formContent = objectMapper.readValue(formEntity.getFormContent(), FormContent.class);
            logger.debug("Form content parsed for form ID {} successfully", id);
        } catch (Exception e) {
            logger.error("Error parsing form content for form ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }

        if (!hasFormAccess(employee, formEntity, formContent)) {
            logger.warn("Employee ID {} is not assigned to any level for form ID {}", employeeId, id);
            return ResponseEntity.status(403).build();
        }

        List<String> accessibleFieldIds = (employee.getRole() == Employee.Role.OWNER || formEntity.getOwnerEmployeeId().equals(employeeId))
                ? formContent.getFields().stream().map(Field::getId).collect(Collectors.toList())
                : formContent.getFields().stream()
                .filter(field -> field.getLevelNumbers() != null && field.getLevelNumbers().stream()
                        .anyMatch(levelNum -> formContent.getLevelAssignments().getOrDefault(levelNum, new ArrayList<>()).contains(employeeId)))
                .map(Field::getId)
                .collect(Collectors.toList());

        Map<Integer, List<String>> levelAssignments = formContent.getLevelAssignments();
        List<Integer> levelPriorityOrder = formContent.getLevelPriorityOrder();
        List<Integer> employeeLevels = levelAssignments.entrySet().stream()
                .filter(entry -> entry.getValue().contains(employeeId))
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
        boolean canFillCurrentLevel = employee.getRole() == Employee.Role.OWNER || formEntity.getOwnerEmployeeId().equals(employeeId);
        if (!canFillCurrentLevel) {
            int lowestEmployeeLevelPriority = levelPriorityOrder.stream()
                    .filter(employeeLevels::contains)
                    .mapToInt(level -> levelPriorityOrder.indexOf(level))
                    .min()
                    .orElse(Integer.MAX_VALUE);
            canFillCurrentLevel = isHigherPriorityLevelsFilled(id, levelPriorityOrder, lowestEmployeeLevelPriority, levelAssignments, formContent.getFields());
        }

        Map<String, List<FieldResponse>> higherPriorityResponses = new HashMap<>();
        if (!employee.getRole().equals(Employee.Role.OWNER) && !formEntity.getOwnerEmployeeId().equals(employeeId)) {
            int lowestEmployeeLevelPriority = levelPriorityOrder.stream()
                    .filter(employeeLevels::contains)
                    .mapToInt(level -> levelPriorityOrder.indexOf(level))
                    .min()
                    .orElse(Integer.MAX_VALUE);
            List<Integer> relevantLevels = levelPriorityOrder.subList(0, Math.min(lowestEmployeeLevelPriority + 1, levelPriorityOrder.size()));
            List<String> relevantFieldIds = formContent.getFields().stream()
                    .filter(field -> field.getLevelNumbers().stream().anyMatch(relevantLevels::contains))
                    .map(Field::getId)
                    .collect(Collectors.toList());

            List<Response> responses = responseRepository.findByFormIdOrderByIdDesc(id);
            Map<String, Map<String, FieldResponse>> latestResponsesByEmployeeAndField = new HashMap<>();

            for (Response response : responses) {
                try {
                    Employee respondent = employeeRepository.findByEmployeeId(response.getEmployeeId());
                    String respondentName = respondent != null ? respondent.getEmployeeName() : response.getEmployeeId();
                    List<FieldResponse> fieldResponses = objectMapper.readValue(response.getResponses(),
                            objectMapper.getTypeFactory().constructCollectionType(List.class, FieldResponse.class));

                    Map<String, FieldResponse> employeeResponses = latestResponsesByEmployeeAndField
                            .computeIfAbsent(response.getEmployeeId(), k -> new HashMap<>());

                    for (FieldResponse fr : fieldResponses) {
                        if (relevantFieldIds.contains(fr.getFieldId())) {
                            if (!employeeResponses.containsKey(fr.getFieldId())) {
                                employeeResponses.put(fr.getFieldId(),
                                        new FieldResponse(response.getEmployeeId(), respondentName, fr.getFieldId(), fr.getValue(), fr.getLinkedResponseId()));
                            }
                        }
                    }
                } catch (Exception e) {
                    logger.error("Error parsing response ID {}: {}", response.getId(), e.getMessage());
                }
            }

            latestResponsesByEmployeeAndField.forEach((empId, fieldResponses) -> {
                fieldResponses.forEach((fieldId, fr) -> {
                    higherPriorityResponses.computeIfAbsent(fieldId, k -> new ArrayList<>()).add(fr);
                });
            });
        }

        formContent.setAccessibleFieldIds(accessibleFieldIds);
        formContent.setCanFillCurrentLevel(canFillCurrentLevel);
        formContent.setHigherPriorityResponses(higherPriorityResponses);

        try {
            formEntity.setFormContent(objectMapper.writeValueAsString(formContent));
        } catch (Exception e) {
            logger.error("Error serializing form content for form ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }

        return ResponseEntity.ok(formEntity);
    }

    private boolean hasFormAccess(Employee employee, Form form, FormContent formContent) {
        return employee.getRole() == Employee.Role.OWNER ||
                form.getOwnerEmployeeId().equals(employee.getEmployeeId()) ||
                formContent.getLevelAssignments().values().stream()
                        .anyMatch(employeeIds -> employeeIds.contains(employee.getEmployeeId()));
    }

    private boolean isHigherPriorityLevelsFilled(Long formId, List<Integer> levelPriorityOrder, int currentLevelPriorityIndex, Map<Integer, List<String>> levelAssignments, List<Field> fields) {
        if (currentLevelPriorityIndex == 0) {
            return true;
        }

        List<Integer> higherPriorityLevels = levelPriorityOrder.subList(0, currentLevelPriorityIndex);
        List<String> higherPriorityFieldIds = fields.stream()
                .filter(field -> field.getLevelNumbers().stream().anyMatch(higherPriorityLevels::contains))
                .map(Field::getId)
                .collect(Collectors.toList());

        if (higherPriorityFieldIds.isEmpty()) {
            return true;
        }

        List<Response> responses = responseRepository.findByFormId(formId);
        Set<String> respondedFieldIds = new HashSet<>();
        for (Response response : responses) {
            try {
                List<FieldResponse> fieldResponses = objectMapper.readValue(response.getResponses(),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, FieldResponse.class));
                fieldResponses.stream()
                        .filter(fr -> higherPriorityFieldIds.contains(fr.getFieldId()))
                        .forEach(fr -> respondedFieldIds.add(fr.getFieldId()));
            } catch (Exception e) {
                logger.error("Error parsing response ID {}: {}", response.getId(), e.getMessage());
            }
        }

        return higherPriorityFieldIds.stream().allMatch(respondedFieldIds::contains);
    }

    @PostMapping("/employee/form/{id}/response")
    public ResponseEntity<?> submitResponse(@PathVariable Long id, @RequestBody ResponseRequest responseRequest, Authentication auth) {
        String authEmployeeId = auth.getName();
        Employee authEmployee = employeeRepository.findByEmployeeId(authEmployeeId);
        if (authEmployee == null) {
            logger.error("Authenticated employee ID {} not found", authEmployeeId);
            return ResponseEntity.notFound().build();
        }

        Optional<Form> formOpt = formRepository.findById(id);
        if (formOpt.isEmpty()) {
            logger.error("Form ID {} not found", id);
            return ResponseEntity.notFound().build();
        }

        Form formEntity = formOpt.get();

        if (!formEntity.isActive()) {
            logger.warn("Attempt to submit response to inactive form ID {}", id);
            return ResponseEntity.status(403).body(Map.of("message", "This form is inactive and does not accept new responses."));
        }

        FormContent formContent;
        try {
            formContent = objectMapper.readValue(formEntity.getFormContent(), FormContent.class);
        } catch (Exception e) {
            logger.error("Error parsing form content for response submission, form ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(500).body(null);
        }

        String recordId = responseRequest.getRecordId();
        if (recordId == null || recordId.isEmpty()) {
            logger.error("No recordId provided in request for form ID {}", id);
            return ResponseEntity.badRequest().build();
        }

        String targetEmployeeId = authEmployeeId;

        Response existingResponse = responseRepository.findByFormIdAndRecordId(id, recordId)
                .stream()
                .findFirst()
                .orElse(null);

        Response response;
        String actionType = "SUBMIT";
        if (existingResponse != null) {
            response = existingResponse;
            actionType = "UPDATE_RESPONSE";
            response.setTime(ZonedDateTime.now());

            try {
                List<FieldResponse> existingFieldResponses = objectMapper.readValue(
                        response.getResponses(),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, FieldResponse.class));

                Map<String, ResponseRequest.FieldResponse> newResponsesMap = responseRequest.getResponses().stream()
                        .collect(Collectors.toMap(ResponseRequest.FieldResponse::getFieldId, fr -> fr));

                List<FieldResponse> mergedResponses = existingFieldResponses.stream()
                        .filter(fr -> !newResponsesMap.containsKey(fr.getFieldId()))
                        .collect(Collectors.toList());

                newResponsesMap.forEach((fieldId, fr) -> {
                    mergedResponses.add(new FieldResponse(
                            targetEmployeeId,
                            authEmployee.getEmployeeName(),
                            fr.getFieldId(),
                            fr.getValue(),
                            fr.getLinkedResponseId()));
                });

                response.setResponses(objectMapper.writeValueAsString(mergedResponses));
            } catch (Exception e) {
                logger.error("Error merging responses: {}", e.getMessage());
                return ResponseEntity.status(500).build();
            }
        }
        else {
            response = new Response();
            response.setFormId(id);
            response.setEmployeeId(targetEmployeeId);
            response.setRecordId(recordId);
            response.setTime(ZonedDateTime.now());

            try {
                response.setResponses(objectMapper.writeValueAsString(
                        responseRequest.getResponses().stream()
                                .map(fr -> new FieldResponse(
                                        targetEmployeeId,
                                        authEmployee.getEmployeeName(),
                                        fr.getFieldId(),
                                        fr.getValue(),
                                        fr.getLinkedResponseId()))
                                .collect(Collectors.toList())));
            } catch (Exception e) {
                logger.error("Error serializing response: {}", e.getMessage());
                return ResponseEntity.status(500).build();
            }
        }

        response = formService.saveResponse(response);

        ActivityLog activity = new ActivityLog(
                actionType,
                formEntity.getId(),
                formEntity.getTitle(),
                authEmployeeId,
                authEmployee.getEmployeeName(),
                ZonedDateTime.now()
        );
        activityLogRepository.save(activity);
        logger.debug("Logged {} activity for form ID {} by employee ID {}", actionType, id, authEmployeeId);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/employee/form/{id}/responses")
    public ResponseEntity<List<FormResponseDTO>> getFormResponses(@PathVariable Long id, Authentication authentication) {
        String employeeId = authentication.getName();
        logger.debug("Fetching responses for form ID {} by employee ID {}", id, employeeId);
        Employee employee = employeeRepository.findByEmployeeId(employeeId);
        if (employee == null) {
            logger.error("Employee ID {} not found", employeeId);
            return ResponseEntity.notFound().build();
        }

        Optional<Form> form = formRepository.findById(id);
        if (form.isEmpty()) {
            logger.error("Form ID {} not found", id);
            return ResponseEntity.notFound().build();
        }

        Form formEntity = form.get();
        FormContent formContent;
        try {
            formContent = objectMapper.readValue(formEntity.getFormContent(), FormContent.class);
        } catch (Exception e) {
            logger.error("Error parsing form content for form ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(500).body(null);
        }

        Map<Integer, List<String>> levelAssignments = formContent.getLevelAssignments();
        boolean isAssignedToAnyLevel = levelAssignments.values().stream()
                .anyMatch(employeeIds -> employeeIds.contains(employeeId));

        if (employee.getRole() != Employee.Role.OWNER && !formEntity.getOwnerEmployeeId().equals(employeeId) && !isAssignedToAnyLevel) {
            logger.warn("Unauthorized access to form responses for form ID {} by employee ID {}", id, employeeId);
            return ResponseEntity.status(403).build();
        }

        Set<String> accessibleFieldIds = (employee.getRole() == Employee.Role.OWNER ||
                formEntity.getOwnerEmployeeId().equals(employeeId) ||
                isAssignedToAnyLevel)
                ? formContent.getFields().stream().map(Field::getId).collect(Collectors.toSet())
                : new HashSet<>();

        List<Response> responses = responseRepository.findByFormId(id);
        List<FormResponseDTO> responseDTOs = new ArrayList<>();
        try {
            Map<String, String> fieldIdToQuestion = formContent.getFields().stream()
                    .filter(field -> field.getId() != null && field.getQuestion() != null)
                    .collect(Collectors.toMap(Field::getId, Field::getQuestion, (existing, replacement) -> existing, HashMap::new));

            for (Response response : responses) {
                List<FieldResponse> fieldResponses = objectMapper.readValue(response.getResponses(),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, FieldResponse.class));

                List<FieldResponseDTO> filteredResponses = fieldResponses.stream()
                        .filter(fr -> accessibleFieldIds.contains(fr.getFieldId()))
                        .map(fr -> new FieldResponseDTO(
                                fr.getFieldId(),
                                fieldIdToQuestion.getOrDefault(fr.getFieldId(), "Unknown Question"),
                                fr.getValue(),
                                fr.getLinkedResponseId(),
                                response.getRecordId(),
                                fr.getEmployeeId(),
                                fr.getEmployeeName()
                        ))
                        .collect(Collectors.toList());

                if (!filteredResponses.isEmpty()) {
                    Employee respondent = employeeRepository.findByEmployeeId(response.getEmployeeId());
                    String respondentName = respondent != null ? respondent.getEmployeeName() : "Unknown";
                    responseDTOs.add(new FormResponseDTO(response.getId(), response.getEmployeeId(), respondentName, filteredResponses));
                }
            }
            logger.debug("Returning {} responses for form ID {} to employee ID {}", responseDTOs.size(), id, employeeId);
            return ResponseEntity.ok(responseDTOs);
        } catch (Exception e) {
            logger.error("Error processing responses for form ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(500).body(null);
        }
    }

    @GetMapping("/owner/responses")
    public ResponseEntity<List<OwnerResponseDTO>> getAllResponses(Authentication authentication) {
        String employeeId = authentication.getName();
        logger.debug("Fetching all responses for employee ID {}", employeeId);
        Employee employee = employeeRepository.findByEmployeeId(employeeId);
        if (employee == null) {
            logger.error("Employee ID {} not found", employeeId);
            return ResponseEntity.notFound().build();
        }

        if (employee.getRole() != Employee.Role.OWNER) {
            logger.warn("Unauthorized access to all responses by employee ID {}", employeeId);
            return ResponseEntity.status(403).build();
        }

        List<Form> forms = formRepository.findAll();
        List<OwnerResponseDTO> responseDTOs = new ArrayList<>();
        for (Form form : forms) {
            List<Response> responses = responseRepository.findByFormId(form.getId());
            Employee formOwner = employeeRepository.findByEmployeeId(form.getOwnerEmployeeId());
            String formOwnerName = formOwner != null ? formOwner.getEmployeeName() : "Unknown";
            try {
                List<FormResponseDTO> formResponseDTOs = mapResponsesToDTO(responses, form);
                responseDTOs.add(new OwnerResponseDTO(form.getId(), form.getTitle(), form.getOwnerEmployeeId(), formOwnerName, formResponseDTOs));
            } catch (Exception e) {
                logger.error("Error processing responses for form ID {}: {}", form.getId(), e.getMessage(), e);
                continue;
            }
        }
        return ResponseEntity.ok(responseDTOs);
    }

    @GetMapping("/employee/recent-activity")
    public ResponseEntity<List<Map<String, Object>>> getRecentActivity(Authentication authentication) {
        String employeeId = authentication.getName();
        Employee employee = employeeRepository.findByEmployeeId(employeeId);
        if (employee == null) { return ResponseEntity.notFound().build(); }

        List<ActivityLog> activities;
        Pageable pageable = PageRequest.of(0, 10);

        if (employee.getRole() == Employee.Role.OWNER) {
            activities = activityLogRepository.findTop10ByActionTypeNotOrderByTimestampDesc("VIEW", pageable);
        } else {
            // 1. Get IDs of forms the user is currently assigned to.
            List<Form> assignedForms = formRepository.findAll().stream()
                    .filter(form -> {
                        try {
                            return objectMapper.readValue(form.getFormContent(), FormContent.class)
                                    .getLevelAssignments().values().stream().anyMatch(e -> e.contains(employeeId));
                        } catch (Exception e) { return false; }
                    })
                    .collect(Collectors.toList());
            List<Long> activeFormIds = assignedForms.stream().map(Form::getId).collect(Collectors.toList());

            // 2. Get IDs of all forms the user has ever interacted with from the activity log itself.
            List<Long> historicalFormIds = activityLogRepository.findDistinctFormIdsByEmployeeId(employeeId);

            // 3. Combine all relevant form IDs into a single, unique list.
            List<Long> allRelevantFormIds = Stream.concat(activeFormIds.stream(), historicalFormIds.stream())
                    .distinct()
                    .collect(Collectors.toList());

            if (allRelevantFormIds.isEmpty()) {
                activities = new ArrayList<>();
            } else {
                // 4. Fetch activities using this complete list of IDs.
                activities = activityLogRepository.findTop10ByFormIdsAndActionTypeNotOrderByTimestampDesc(allRelevantFormIds, "VIEW", pageable);
            }
        }

        // Map to DTO for the JSON response
        List<Map<String, Object>> activityList = activities.stream().map(activity -> {
            Map<String, Object> activityData = new HashMap<>();
            activityData.put("actionType", activity.getActionType());
            activityData.put("formId", activity.getFormId());
            activityData.put("formTitle", activity.getFormTitle());
            activityData.put("employeeId", activity.getEmployeeId());
            activityData.put("employeeName", activity.getEmployeeName());
            activityData.put("timestamp", activity.getTimestamp().toString());
            return activityData;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(activityList);
    }

    @GetMapping("/employee/form/{id}/activity")
    public ResponseEntity<List<Map<String, Object>>> getFormActivity(@PathVariable Long id, Authentication authentication) {
        String employeeId = authentication.getName();
        logger.debug("Fetching activity for form ID {} for employee ID {}", id, employeeId);

        Optional<Form> formOpt = formRepository.findById(id);
        if (formOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Form formEntity = formOpt.get();
        Employee employee = employeeRepository.findByEmployeeId(employeeId);
        if (employee == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        boolean hasAccess;
        try {
            FormContent formContent = objectMapper.readValue(formEntity.getFormContent(), FormContent.class);
            hasAccess = hasFormAccess(employee, formEntity, formContent);
        } catch (Exception e) {
            logger.error("Error parsing form content for activity access check, form ID {}: {}", id, e.getMessage());
            return ResponseEntity.status(500).build();
        }

        if (!hasAccess) {
            logger.warn("Unauthorized attempt to view activity for form ID {} by employee ID {}", id, employeeId);
            return ResponseEntity.status(403).build();
        }

        List<ActivityLog> activities = activityLogRepository.findByFormIdOrderByTimestampDesc(id);

        List<Map<String, Object>> activityList = activities.stream().map(activity -> {
            Map<String, Object> activityData = new HashMap<>();
            activityData.put("actionType", activity.getActionType());
            activityData.put("formId", activity.getFormId());
            activityData.put("formTitle", activity.getFormTitle());
            activityData.put("employeeId", activity.getEmployeeId());
            activityData.put("employeeName", activity.getEmployeeName());
            activityData.put("timestamp", activity.getTimestamp().toString());
            return activityData;
        }).collect(Collectors.toList());

        logger.debug("Returning {} activities for form ID {}", activityList.size(), id);
        return ResponseEntity.ok(activityList);
    }

    @PutMapping("/employee/form/{id}/status")
    public ResponseEntity<Form> toggleFormStatus(@PathVariable Long id, @RequestBody Map<String, Boolean> statusRequest, Authentication auth) {
        String employeeId = auth.getName();
        Employee employee = employeeRepository.findByEmployeeId(employeeId);
        if (employee == null) {
            return ResponseEntity.notFound().build();
        }

        Optional<Form> formOpt = formRepository.findById(id);
        if (formOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Form formToUpdate = formOpt.get();

        if (employee.getRole() != Employee.Role.OWNER && !formToUpdate.getOwnerEmployeeId().equals(employeeId)) {
            logger.warn("Unauthorized attempt to change status for form ID {} by employee ID {}", id, employeeId);
            return ResponseEntity.status(403).build();
        }

        Boolean newStatus = statusRequest.get("isActive");
        if (newStatus == null) {
            return ResponseEntity.badRequest().build();
        }
        formToUpdate.setActive(newStatus);
        Form updatedForm = formRepository.save(formToUpdate);

        ActivityLog activity = new ActivityLog(
                "STATUS_CHANGE",
                updatedForm.getId(),
                updatedForm.getTitle(),
                employeeId,
                employee.getEmployeeName(),
                ZonedDateTime.now()
        );
        activityLogRepository.save(activity);
        logger.debug("Logged STATUS_CHANGE activity for form ID {} by employee ID {}", id, employeeId);

        return ResponseEntity.ok(updatedForm);
    }

    @PostMapping("/employee/form")
    public ResponseEntity<Form> createForm(@RequestBody FormRequest formRequest, Authentication auth) {
        String ownerEmployeeId = auth.getName();
        logger.debug("Creating form with title: {} by employee ID {}", formRequest.getTitle(), ownerEmployeeId);

        Employee owner = employeeRepository.findByEmployeeId(ownerEmployeeId);
        if (owner == null) {
            logger.error("Owner employee ID {} not found", ownerEmployeeId);
            return ResponseEntity.notFound().build();
        }

        try {
            FormContent formContent = objectMapper.readValue(formRequest.getFormContent(), FormContent.class);
            Integer numLevels = formRequest.getNumLevels();
            List<FormRequest.LevelAssignment> levelAssignments = formRequest.getLevelAssignments();
            List<Integer> levelPriorityOrder = formRequest.getLevelPriorityOrder();

            if (numLevels == null || numLevels < 1) {
                logger.error("Invalid number of levels: {}", numLevels);
                return ResponseEntity.badRequest().build();
            }

            if (levelAssignments == null || levelAssignments.size() != numLevels) {
                logger.error("Level assignments count ({}) does not match numLevels ({})",
                        levelAssignments == null ? 0 : levelAssignments.size(), numLevels);
                return ResponseEntity.badRequest().build();
            }

            if (levelPriorityOrder == null || levelPriorityOrder.size() != numLevels ||
                    !new HashSet<>(levelPriorityOrder).containsAll(IntStream.rangeClosed(1, numLevels).boxed().collect(Collectors.toList()))) {
                logger.error("Invalid level priority order: {}", levelPriorityOrder);
                return ResponseEntity.badRequest().build();
            }

            Map<Integer, List<String>> levelAssignmentMap = new HashMap<>();
            for (FormRequest.LevelAssignment assignment : levelAssignments) {
                if (assignment.getLevelNumber() == null || assignment.getLevelNumber() < 1 ||
                        assignment.getLevelNumber() > numLevels) {
                    logger.error("Invalid level number in assignment: {}", assignment.getLevelNumber());
                    return ResponseEntity.badRequest().build();
                }
                if (assignment.getEmployeeIds() == null || assignment.getEmployeeIds().isEmpty()) {
                    logger.error("No employees assigned to level: {}", assignment.getLevelNumber());
                    return ResponseEntity.badRequest().build();
                }
                for (String empId : assignment.getEmployeeIds()) {
                    if (employeeRepository.findByEmployeeId(empId) == null) {
                        logger.error("Employee ID {} not found in level assignment", empId);
                        return ResponseEntity.badRequest().build();
                    }
                }
                levelAssignmentMap.put(assignment.getLevelNumber(), assignment.getEmployeeIds());
            }

            for (Field field : formContent.getFields()) {
                if (field.getLevelNumbers() == null || field.getLevelNumbers().isEmpty()) {
                    logger.error("Field {} has no level assignments", field.getId());
                    return ResponseEntity.badRequest().build();
                }
                for (Integer levelNum : field.getLevelNumbers()) {
                    if (levelNum < 1 || levelNum > numLevels) {
                        logger.error("Invalid level number {} for field {}", levelNum, field.getId());
                        return ResponseEntity.badRequest().build();
                    }
                }
                if ("radio".equals(field.getType())) {
                    if (field.getOptions() == null || field.getOptions().isEmpty()) {
                        logger.error("Radio field {} has no options", field.getId());
                        return ResponseEntity.badRequest().build();
                    }
                }
            }

            formContent.setLevelAssignments(levelAssignmentMap);
            formContent.setLevelPriorityOrder(levelPriorityOrder);

            Form form = new Form();
            form.setTitle(formRequest.getTitle());
            form.setOwnerEmployeeId(ownerEmployeeId);
            form.setFormContent(objectMapper.writeValueAsString(formContent));
            form = formRepository.save(form);

            ActivityLog activity = new ActivityLog(
                    "CREATE",
                    form.getId(),
                    form.getTitle(),
                    ownerEmployeeId,
                    owner.getEmployeeName(),
                    ZonedDateTime.now()
            );
            activityLogRepository.save(activity);
            logger.debug("Logged CREATE activity for form ID {} by employee ID {}", form.getId(), ownerEmployeeId);

            return ResponseEntity.ok(form);
        } catch (Exception e) {
            logger.error("Error creating form: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/employee/form/{id}/activity/add-record")
    public ResponseEntity<Void> logAddRecordActivity(@PathVariable Long id, Authentication auth) {
        String employeeId = auth.getName();
        Employee employee = employeeRepository.findByEmployeeId(employeeId);
        if (employee == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Form> formOpt = formRepository.findById(id);
        if (formOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Form formEntity = formOpt.get();

        try {
            ActivityLog activity = new ActivityLog(
                    "ADD_RECORD",
                    formEntity.getId(),
                    formEntity.getTitle(),
                    employeeId,
                    employee.getEmployeeName(),
                    ZonedDateTime.now()
            );
            activityLogRepository.save(activity);
            logger.debug("Logged ADD_RECORD activity for form ID {} by employee ID {}", id, employeeId);

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Could not log ADD_RECORD activity for form ID {}: {}", id, e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }


    @DeleteMapping("/employee/form/{id}")
    public ResponseEntity<Void> deleteForm(@PathVariable Long id, Authentication auth) {
        String employeeId = auth.getName();
        Employee employee = employeeRepository.findByEmployeeId(employeeId);
        if (employee == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Form> formOpt = formRepository.findById(id);
        if (formOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Form form = formOpt.get();

        if (employee.getRole() != Employee.Role.OWNER && !form.getOwnerEmployeeId().equals(employeeId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            // Log the delete action. The log will permanently keep the form's ID and title.
            ActivityLog activity = new ActivityLog(
                    "DELETE",
                    form.getId(),
                    form.getTitle(),
                    employeeId,
                    employee.getEmployeeName(),
                    ZonedDateTime.now()
            );
            activityLogRepository.save(activity);

            // Delete associated responses.
            responseRepository.deleteByFormId(id);

            // Delete the form. The activity logs are NOT touched and keep their formId.
            formRepository.delete(form);

            logger.debug("Successfully deleted form ID {} and its responses. Activity logs preserved.", id);
            return ResponseEntity.ok().build();

        } catch (Exception e) {
            logger.error("Error during form deletion for form ID {}:", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }


    @DeleteMapping("/employee/form/{id}/record/{recordId}")
    public ResponseEntity<Void> deleteRecord(@PathVariable Long id, @PathVariable String recordId, Authentication auth) {
        String authEmployeeId = auth.getName();
        Employee authEmployee = employeeRepository.findByEmployeeId(authEmployeeId);
        if (authEmployee == null) {
            return ResponseEntity.status(401).build();
        }

        List<Response> responses = responseRepository.findByFormIdAndRecordId(id, recordId);
        if (responses.isEmpty()) {
            logger.warn("No record found with recordId {} for form ID {}", recordId, id);
            return ResponseEntity.notFound().build();
        }

        String recordCreatorId = responses.get(0).getEmployeeId();

        if (!authEmployee.getRole().equals(Employee.Role.OWNER) && !recordCreatorId.equals(authEmployeeId)) {
            logger.warn("Unauthorized attempt to delete recordId {} by employee ID {}", recordId, authEmployeeId);
            return ResponseEntity.status(403).build();
        }

        try {
            responseRepository.deleteByFormIdAndRecordId(id, recordId);

            Form form = formRepository.findById(id).orElse(null);
            ActivityLog activity = new ActivityLog(
                    "DELETE_RECORD",
                    id,
                    form != null ? form.getTitle() : "Unknown Form",
                    authEmployeeId,
                    authEmployee.getEmployeeName(),
                    ZonedDateTime.now()
            );
            activityLogRepository.save(activity);
            logger.debug("Successfully deleted recordId {} from form ID {}", recordId, id);

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Error deleting recordId {}: {}", recordId, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @DeleteMapping("/employee/form/{id}/response")
    public ResponseEntity<Void> deleteResponse(@PathVariable Long id, @RequestBody Map<String, String> request, Authentication auth) {
        String authEmployeeId = auth.getName();
        String recordId = request.get("recordId");
        String fieldId = request.get("fieldId");

        if (recordId == null || fieldId == null) {
            return ResponseEntity.badRequest().build();
        }

        Employee authEmployee = employeeRepository.findByEmployeeId(authEmployeeId);
        if (authEmployee == null) {
            logger.error("Authenticated employee ID {} not found", authEmployeeId);
            return ResponseEntity.status(401).build();
        }

        Optional<Form> formOpt = formRepository.findById(id);
        if (formOpt.isEmpty()) {
            logger.error("Form ID {} not found during response deletion", id);
            return ResponseEntity.notFound().build();
        }

        Response responseToUpdate = responseRepository.findByFormIdAndRecordId(id, recordId)
                .stream()
                .findFirst()
                .orElse(null);

        if (responseToUpdate == null) {
            logger.warn("No response found for recordId {} in form ID {}", recordId, id);
            return ResponseEntity.notFound().build();
        }

        try {
            List<FieldResponse> fieldResponses = objectMapper.readValue(responseToUpdate.getResponses(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, FieldResponse.class));

            boolean fieldExists = fieldResponses.stream().anyMatch(fr -> fr.getFieldId().equals(fieldId));
            if (!fieldExists) {
                logger.warn("Field ID {} not found within recordId {} for deletion.", fieldId, recordId);
                return ResponseEntity.notFound().build();
            }

            List<FieldResponse> updatedFieldResponses = fieldResponses.stream()
                    .filter(fr -> !fr.getFieldId().equals(fieldId))
                    .collect(Collectors.toList());

            if (updatedFieldResponses.isEmpty()) {
                responseRepository.delete(responseToUpdate);
                logger.debug("Deleted entire response entity as it became empty. RecordId: {}", recordId);
            } else {
                responseToUpdate.setResponses(objectMapper.writeValueAsString(updatedFieldResponses));
                formService.saveResponse(responseToUpdate);
                logger.debug("Removed field {} from recordId {}", fieldId, recordId);
            }

        } catch (Exception e) {
            logger.error("Error updating response JSON for recordId {}: {}", recordId, e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }

        ActivityLog activity = new ActivityLog(
                "DELETE_RESPONSE",
                formOpt.get().getId(),
                formOpt.get().getTitle(),
                authEmployeeId,
                authEmployee.getEmployeeName(),
                ZonedDateTime.now()
        );
        activityLogRepository.save(activity);

        return ResponseEntity.ok().build();
    }


    private List<FormResponseDTO> mapResponsesToDTO(List<Response> responses, Form form) {
        List<FormResponseDTO> responseDTOs = new ArrayList<>();
        FormContent formContent;
        try {
            if (form.getFormContent() == null) {
                logger.error("Form content is null for form ID {}", form.getId());
                return responseDTOs;
            }
            formContent = objectMapper.readValue(form.getFormContent(), FormContent.class);
            if (formContent.getFields() == null) {
                logger.error("Form fields are null for form ID {}", form.getId());
                return responseDTOs;
            }
        } catch (Exception e) {
            logger.error("Error parsing form content for form ID {}: {}", form.getId(), e.getMessage(), e);
            return responseDTOs;
        }

        Map<String, String> fieldIdToQuestion = formContent.getFields().stream()
                .filter(field -> field.getId() != null && field.getQuestion() != null)
                .collect(Collectors.toMap(
                        Field::getId,
                        Field::getQuestion,
                        (existing, replacement) -> existing,
                        HashMap::new
                ));

        for (Response response : responses) {
            List<FieldResponseDTO> fieldResponses = new ArrayList<>();
            try {
                if (response.getResponses() == null) {
                    logger.error("Response content is null for response ID {}", response.getId());
                    continue;
                }
                List<FieldResponse> responseFields = objectMapper.readValue(response.getResponses(),
                        objectMapper.getTypeFactory().constructCollectionType(List.class, FieldResponse.class));

                for (FieldResponse fieldResponse : responseFields) {
                    if (fieldResponse.getFieldId() == null) {
                        logger.warn("Field ID is null in response ID {}", response.getId());
                        continue;
                    }
                    String question = fieldIdToQuestion.getOrDefault(fieldResponse.getFieldId(), "Unknown Question");

                    fieldResponses.add(new FieldResponseDTO(
                            fieldResponse.getFieldId(),
                            question,
                            fieldResponse.getValue(),
                            fieldResponse.getLinkedResponseId(),
                            response.getRecordId(),
                            fieldResponse.getEmployeeId(),
                            fieldResponse.getEmployeeName()
                    ));
                }
            } catch (Exception e) {
                logger.error("Error parsing response for response ID {}: {}", response.getId(), e.getMessage(), e);
                continue;
            }

            Employee respondent = employeeRepository.findByEmployeeId(response.getEmployeeId());
            String respondentName = respondent != null ? respondent.getEmployeeName() : "Unknown";
            responseDTOs.add(new FormResponseDTO(response.getId(), response.getEmployeeId(), respondentName, fieldResponses));
        }
        return responseDTOs;
    }

    // Helper classes for JSON parsing
    private static class FormContent {
        private List<Field> fields;
        private Map<Integer, List<String>> levelAssignments;
        private List<String> accessibleFieldIds;
        private List<Integer> levelPriorityOrder;
        private boolean canFillCurrentLevel;
        private Map<String, List<FieldResponse>> higherPriorityResponses;

        public List<Field> getFields() {
            return fields != null ? fields : new ArrayList<>();
        }

        public void setFields(List<Field> fields) {
            this.fields = fields;
        }

        public Map<Integer, List<String>> getLevelAssignments() {
            return levelAssignments != null ? levelAssignments : new HashMap<>();
        }

        public void setLevelAssignments(Map<Integer, List<String>> levelAssignments) {
            this.levelAssignments = levelAssignments;
        }

        public List<String> getAccessibleFieldIds() {
            return accessibleFieldIds != null ? accessibleFieldIds : new ArrayList<>();
        }

        public void setAccessibleFieldIds(List<String> accessibleFieldIds) {
            this.accessibleFieldIds = accessibleFieldIds;
        }

        public List<Integer> getLevelPriorityOrder() {
            return levelPriorityOrder != null ? levelPriorityOrder : new ArrayList<>();
        }

        public void setLevelPriorityOrder(List<Integer> levelPriorityOrder) {
            this.levelPriorityOrder = levelPriorityOrder;
        }

        public boolean isCanFillCurrentLevel() {
            return canFillCurrentLevel;
        }

        public void setCanFillCurrentLevel(boolean canFillCurrentLevel) {
            this.canFillCurrentLevel = canFillCurrentLevel;
        }

        public Map<String, List<FieldResponse>> getHigherPriorityResponses() {
            return higherPriorityResponses != null ? higherPriorityResponses : new HashMap<>();
        }

        public void setHigherPriorityResponses(Map<String, List<FieldResponse>> higherPriorityResponses) {
            this.higherPriorityResponses = higherPriorityResponses;
        }
    }

    private static class Field {
        private String id;
        private String question;
        private String type;
        private List<Integer> levelNumbers;
        private List<String> options; // Renamed from answers to options for clarity
        private List<String> answers; // For other purposes, if needed

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getQuestion() {
            return question;
        }

        public void setQuestion(String question) {
            this.question = question;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public List<Integer> getLevelNumbers() {
            return levelNumbers != null ? levelNumbers : new ArrayList<>();
        }

        public void setLevelNumbers(List<Integer> levelNumbers) {
            this.levelNumbers = levelNumbers;
        }

        public List<String> getOptions() {
            return options != null ? options : new ArrayList<>();
        }

        public void setOptions(List<String> options) {
            this.options = options;
        }

        public List<String> getAnswers() {
            return answers != null ? answers : new ArrayList<>();
        }

        public void setAnswers(List<String> answers) {
            this.answers = answers;
        }
    }

    private static class FormRequest {
        private String title;
        private String formContent;
        private Integer numLevels;
        private List<LevelAssignment> levelAssignments;
        private List<Integer> levelPriorityOrder;

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getFormContent() {
            return formContent;
        }

        public void setFormContent(String formContent) {
            this.formContent = formContent;
        }

        public Integer getNumLevels() {
            return numLevels;
        }

        public void setNumLevels(Integer numLevels) {
            this.numLevels = numLevels;
        }

        public List<LevelAssignment> getLevelAssignments() {
            return levelAssignments;
        }

        public void setLevelAssignments(List<LevelAssignment> levelAssignments) {
            this.levelAssignments = levelAssignments;
        }

        public List<Integer> getLevelPriorityOrder() {
            return levelPriorityOrder;
        }

        public void setLevelPriorityOrder(List<Integer> levelPriorityOrder) {
            this.levelPriorityOrder = levelPriorityOrder;
        }

        public static class LevelAssignment {
            private Integer levelNumber;
            private List<String> employeeIds;

            public Integer getLevelNumber() {
                return levelNumber;
            }

            public void setLevelNumber(Integer levelNumber) {
                this.levelNumber = levelNumber;
            }

            public List<String> getEmployeeIds() {
                return employeeIds;
            }

            public void setEmployeeIds(List<String> employeeIds) {
                this.employeeIds = employeeIds;
            }
        }
    }

    // DTO classes
    private static class FormResponseDTO {
        private Long responseId;
        private String employeeId;
        private String employeeName;
        private List<FieldResponseDTO> responses;

        public FormResponseDTO(Long responseId, String employeeId, String employeeName, List<FieldResponseDTO> responses) {
            this.responseId = responseId;
            this.employeeId = employeeId;
            this.employeeName = employeeName;
            this.responses = responses;
        }

        public Long getResponseId() {
            return responseId;
        }

        public String getEmployeeId() {
            return employeeId;
        }

        public String getEmployeeName() {
            return employeeName;
        }

        public List<FieldResponseDTO> getResponses() {
            return responses;
        }
    }

    private static class FieldResponseDTO {
        private String fieldId;
        private String question;
        private String value;
        private String linkedResponseId;
        private String recordId;
        private String employeeId;      // * ADD THIS
        private String employeeName;    // * ADD THIS

        public FieldResponseDTO(String fieldId, String question, String value, String linkedResponseId, String recordId, String employeeId, String employeeName) {
            this.fieldId = fieldId;
            this.question = question;
            this.value = value;
            this.linkedResponseId = linkedResponseId;
            this.recordId = recordId;
            this.employeeId = employeeId;    // * ADD THIS
            this.employeeName = employeeName;  // * ADD THIS
        }

        public String getFieldId() {return fieldId;}
        public String getQuestion() {return question;}
        public String getValue() {return value;}
        public String getLinkedResponseId() {return linkedResponseId;}
        public String getRecordId() {return recordId;}
        public String getEmployeeId() { return employeeId; }
        public String getEmployeeName() { return employeeName; }
    }

    private static class OwnerResponseDTO {
        private Long formId;
        private String formTitle;
        private String formOwnerId;
        private String formOwnerName;
        private List<FormResponseDTO> responses;

        public OwnerResponseDTO(Long formId, String formTitle, String formOwnerId, String formOwnerName, List<FormResponseDTO> responses) {
            this.formId = formId;
            this.formTitle = formTitle;
            this.formOwnerId = formOwnerId;
            this.formOwnerName = formOwnerName;
            this.responses = responses;
        }

        public Long getFormId() {
            return formId;
        }

        public String getFormTitle() {
            return formTitle;
        }

        public String getFormOwnerId() {
            return formOwnerId;
        }

        public String getFormOwnerName() {
            return formOwnerName;
        }

        public List<FormResponseDTO> getResponses() {
            return responses;
        }
    }

    private static class ResponseRequest {
        private String recordId; // Add this field
        private List<FieldResponse> responses;

        public List<FieldResponse> getResponses() {
            return responses;
        }

        public void setResponses(List<FieldResponse> responses) {
            this.responses = responses;
        }

        public static class FieldResponse {
            private String employeeId;
            private String fieldId;
            private String value;
            private String linkedResponseId;
            private String recordId; // New field

            public String getEmployeeId() {
                return employeeId;
            }

            public void setEmployeeId(String employeeId) {
                this.employeeId = employeeId;
            }

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

            public String getLinkedResponseId() {
                return linkedResponseId;
            }

            public void setLinkedResponseId(String linkedResponseId) {
                this.linkedResponseId = linkedResponseId;
            }

            public String getRecordId() {
                return recordId;
            }

            public void setRecordId(String recordId) {
                this.recordId = recordId;
            }
        }

        public String getRecordId() {
            return recordId;
        }

        public void setRecordId(String recordId) {
            this.recordId = recordId;
        }
    }

    private static class FieldResponse {
        private String employeeId;
        private String employeeName;
        private String fieldId;
        private String value;
        private String linkedResponseId;

        public FieldResponse() { } // * ADD THIS NO-ARG CONSTRUCTOR FOR JACKSON

        public FieldResponse(String employeeId, String employeeName, String fieldId, String value, String linkedResponseId) {
            this.employeeId = employeeId;
            this.employeeName = employeeName;
            this.fieldId = fieldId;
            this.value = value;
            this.linkedResponseId = linkedResponseId;
        }

        public String getEmployeeId() {
            return employeeId;
        }

        public void setEmployeeId(String employeeId) {
            this.employeeId = employeeId;
        }

        public String getEmployeeName() {
            return employeeName;
        }

        public void setEmployeeName(String employeeName) {
            this.employeeName = employeeName;
        }

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

        public String getLinkedResponseId() {
            return linkedResponseId;
        }

        public void setLinkedResponseId(String linkedResponseId) {
            this.linkedResponseId = linkedResponseId;
        }
    }
}