const API_URL = "/api/tasks";

let allTasks = [];

let editTaskId = null;

const taskModal = new bootstrap.Modal(document.getElementById("taskModal"));

const deleteModal = new bootstrap.Modal(document.getElementById("deleteModal"));

let deleteTaskId = null;

/* ============================
   Page Load
============================ */

document.addEventListener("DOMContentLoaded", () => {

    loadTasks();

});

/* ============================
   Load Tasks
============================ */

async function loadTasks() {

    const response = await fetch(API_URL);

    allTasks = await response.json();

    renderTable(allTasks);

    updateDashboardCards();

}

/* ============================
   Dashboard Cards
============================ */

function updateDashboardCards() {

    document.getElementById("totalTasks").textContent =
        allTasks.length;

    document.getElementById("pendingTasks").textContent =
        allTasks.filter(t => t.status === "Pending").length;

    document.getElementById("runningTasks").textContent =
        allTasks.filter(t => t.status === "Running").length;

    document.getElementById("completedTasks").textContent =
        allTasks.filter(t => t.status === "Completed").length;

}

/* ============================
   Render Table
============================ */

function renderTable(tasks) {

    const tbody = document.getElementById("taskTableBody");

    tbody.innerHTML = "";

    tasks.forEach(task => {

        tbody.innerHTML += `

<tr>

<td>${task.id}</td>

<td>${task.title}</td>

<td>${task.description}</td>

<td>${priorityBadge(task.priority)}</td>

<td>${statusBadge(task.status)}</td>

<td>${formatDate(task.createdAt)}</td>

<td>

<button
class="btn action-btn edit-btn"
onclick="editTask(${task.id})">

<i class="bi bi-pencil"></i>

</button>

<button
class="btn action-btn delete-btn"
onclick="confirmDelete(${task.id})">

<i class="bi bi-trash"></i>

</button>

</td>

</tr>

`;

    });

}

/* ============================
   Badges
============================ */

function statusBadge(status) {

    if (status === "Pending")
        return `<span class="badge badge-pending">${status}</span>`;

    if (status === "Running")
        return `<span class="badge badge-running">${status}</span>`;

    return `<span class="badge badge-completed">${status}</span>`;

}

function priorityBadge(priority) {

    if (priority === "High")
        return `<span class="badge priority-high">${priority}</span>`;

    if (priority === "Medium")
        return `<span class="badge priority-medium">${priority}</span>`;

    return `<span class="badge priority-low">${priority}</span>`;

}

/* ============================
   Date
============================ */

function formatDate(date) {

    if (!date) return "";

    return new Date(date).toLocaleDateString();

}

/* ============================
   Save Task
============================ */

document
    .getElementById("taskForm")
    .addEventListener("submit", async function (e) {

        e.preventDefault();

        const task = {

            title: document.getElementById("title").value,

            description: document.getElementById("description").value,

            priority: document.getElementById("priority").value,

            status: document.getElementById("status").value

        };

        if (editTaskId == null) {

            await fetch(API_URL, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(task)

            });

        } else {

            await fetch(`${API_URL}/${editTaskId}`, {

                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(task)

            });

        }

        this.reset();

        editTaskId = null;

        taskModal.hide();

        loadTasks();

    });

/* ============================
   Edit
============================ */

function editTask(id) {

    const task = allTasks.find(t => t.id === id);

    editTaskId = id;

    document.getElementById("title").value = task.title;

    document.getElementById("description").value = task.description;

    document.getElementById("priority").value = task.priority;

    document.getElementById("status").value = task.status;

    taskModal.show();

}

/* ============================
   Delete
============================ */

function confirmDelete(id) {

    deleteTaskId = id;

    deleteModal.show();

}

document
.getElementById("confirmDeleteBtn")
.addEventListener("click", async () => {

    await fetch(`${API_URL}/${deleteTaskId}`, {

        method: "DELETE"

    });

    deleteModal.hide();

    loadTasks();

});

/* ============================
   Add Button
============================ */

document
.getElementById("addTaskBtn")
.addEventListener("click", () => {

    editTaskId = null;

    document.getElementById("taskForm").reset();

    taskModal.show();

});

/* ============================
   Refresh
============================ */

document
.getElementById("refreshBtn")
.addEventListener("click", loadTasks);

/* ============================
   Search
============================ */

document
.getElementById("searchBox")
.addEventListener("keyup", function () {

    const value = this.value.toLowerCase();

    renderTable(

        allTasks.filter(task =>

            task.title.toLowerCase().includes(value)

        )

    );

});

/* ============================
   Status Filter
============================ */

document
.getElementById("statusFilter")
.addEventListener("change", function () {

    if (this.value === "") {

        renderTable(allTasks);

        return;

    }

    renderTable(

        allTasks.filter(

            t => t.status === this.value

        )

    );

});