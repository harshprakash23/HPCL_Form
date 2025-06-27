package com.hpcl.demo.entity;

import java.util.List;

public class FormRequest {
    private String title;
    private String formContent;
    private Integer numLevels;
    private String ownerEmployeeId;
    private List<LevelAssignment> levelAssignments;

    public static class LevelAssignment {
        private List<String> employeeIds;
        private Integer levelNumber;

        public List<String> getEmployeeIds() {
            return employeeIds;
        }

        public void setEmployeeIds(List<String> employeeIds) {
            this.employeeIds = employeeIds;
        }

        public Integer getLevelNumber() {
            return levelNumber;
        }

        public void setLevelNumber(Integer levelNumber) {
            this.levelNumber = levelNumber;
        }
    }

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

    public String getOwnerEmployeeId() {
        return ownerEmployeeId;
    }

    public void setOwnerEmployeeId(String ownerEmployeeId) {
        this.ownerEmployeeId = ownerEmployeeId;
    }

    public List<LevelAssignment> getLevelAssignments() {
        return levelAssignments;
    }

    public void setLevelAssignments(List<LevelAssignment> levelAssignments) {
        this.levelAssignments = levelAssignments;
    }
}