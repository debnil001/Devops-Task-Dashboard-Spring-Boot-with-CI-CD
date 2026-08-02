package com.debnil.task_dashboard.controller;

import com.debnil.task_dashboard.dto.TaskRequestDTO;
import com.debnil.task_dashboard.dto.TaskResponseDTO;
import com.debnil.task_dashboard.entity.Task;
import com.debnil.task_dashboard.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    /*
     * Convert Entity -> Response DTO
     */
    private TaskResponseDTO mapToResponseDTO(Task task) {

        return TaskResponseDTO.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .priority(task.getPriority())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }

    /*
     * Convert Request DTO -> Entity
     */
    private Task mapToEntity(TaskRequestDTO dto) {

        return Task.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .status(dto.getStatus())
                .priority(dto.getPriority())
                .build();
    }

    /*
     * Create Task
     */
    @PostMapping
    public ResponseEntity<TaskResponseDTO> createTask(
            @Valid @RequestBody TaskRequestDTO dto) {

        Task savedTask = taskService.createTask(mapToEntity(dto));

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(mapToResponseDTO(savedTask));
    }

    /*
     * Get All Tasks
     */
    @GetMapping
    public ResponseEntity<List<TaskResponseDTO>> getAllTasks() {

        List<TaskResponseDTO> response =
                taskService.getAllTasks()
                        .stream()
                        .map(this::mapToResponseDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /*
     * Get Task by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<TaskResponseDTO> getTaskById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                mapToResponseDTO(
                        taskService.getTaskById(id)
                )
        );
    }

    /*
     * Update Task
     */
    @PutMapping("/{id}")
    public ResponseEntity<TaskResponseDTO> updateTask(
            @PathVariable Long id,
            @Valid @RequestBody TaskRequestDTO dto) {

        Task updatedTask =
                taskService.updateTask(id, mapToEntity(dto));

        return ResponseEntity.ok(
                mapToResponseDTO(updatedTask)
        );
    }

    /*
     * Delete Task
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(
            @PathVariable Long id) {

        taskService.deleteTask(id);

        return ResponseEntity.noContent().build();
    }

    /*
     * Get Tasks by Status
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<List<TaskResponseDTO>> getTasksByStatus(
            @PathVariable String status) {

        List<TaskResponseDTO> response =
                taskService.getTasksByStatus(status)
                        .stream()
                        .map(this::mapToResponseDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }
}