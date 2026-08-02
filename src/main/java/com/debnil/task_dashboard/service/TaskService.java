package com.debnil.task_dashboard.service;

import com.debnil.task_dashboard.entity.Task;

import java.util.List;

public interface TaskService {

    Task createTask(Task task);

    List<Task> getAllTasks();

    Task getTaskById(Long id);

    Task updateTask(Long id, Task task);

    void deleteTask(Long id);

    List<Task> getTasksByStatus(String status);

}