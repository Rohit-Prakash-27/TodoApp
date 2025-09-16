import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import confetti from "canvas-confetti"; // 🎉 import
import "../styles/dashboard.css";

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editId, setEditId] = useState(-1);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [completedTasks, setCompletedTasks] = useState({}); // { taskId: true }
  const [hideCompleted, setHideCompleted] = useState(false);
  const navigate = useNavigate();

  // Load completed tasks from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("completedTasks") || "{}");
      setCompletedTasks(saved);
    } catch {
      setCompletedTasks({});
    }
  }, []);

  // Save completed tasks to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("completedTasks", JSON.stringify(completedTasks));
  }, [completedTasks]);

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const res = await api.get("/tasks", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setTasks(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
      }
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // 🎉 Trigger confetti when all tasks are completed
  useEffect(() => {
    const totalCount = tasks.length;
    const completedCount = tasks.filter((t) => completedTasks[t._id]).length;

    if (totalCount > 0 && totalCount === completedCount) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [completedTasks, tasks]);

  // Add task
  const handleSubmit = async () => {
    try {
      if (!title || !description) {
        setError("Both fields are required");
        return;
      }
      await api.post(
        "/tasks",
        { title, description },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setMessage("Task added successfully!");
      setError("");
      setTitle("");
      setDescription("");
      fetchTasks();

      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Error adding task");
    }
  };

  // Delete task
  const handleDelete = async (id) => {
    try {
      await api.delete(`/tasks/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      // Also remove from local completed map so UI doesn't show stale state
      const copy = { ...completedTasks };
      delete copy[id];
      setCompletedTasks(copy);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Error deleting task");
    }
  };

  // Edit task
  const handleEdit = (task) => {
    setEditId(task._id);
    setEditTitle(task.title);
    setEditDescription(task.description);
  };

  // Update task
  const handleUpdate = async () => {
    try {
      await api.put(
        `/tasks/${editId}`,
        { title: editTitle, description: editDescription },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setEditId(-1);
      setEditTitle("");
      setEditDescription("");
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Error updating task");
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditId(-1);
    setEditTitle("");
    setEditDescription("");
  };

  // Logout with confirmation
  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (confirmLogout) {
      localStorage.removeItem("token");
      navigate("/login", { replace: true });
    }
  };

  // MARK COMPLETE (frontend-only)
  const toggleComplete = (id) => {
    setCompletedTasks((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  };

  // derived stats
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => completedTasks[t._id]).length;
  const visibleTasks = tasks.filter((t) =>
    hideCompleted ? !completedTasks[t._id] : true
  );

  return (
    <>
      {/* Header */}
      <div className="row p-3 bg-dark text-light text-center">
        <h1 className="todo-title">Todo-Pro</h1>
        <p className="todo-subtitle">Your Productivity Partner</p>
      </div>

      {/* Add form */}
      <div className="container mt-4">
        <h2 className="mb-3">Add Item</h2>
        {message && <p className="text-success">{message}</p>}
        {error && <p className="text-danger">{error}</p>}
        <div className="form-group d-flex gap-2 mb-2">
          <input
            placeholder="Enter Title"
            onChange={(e) => setTitle(e.target.value)}
            className="form-control"
            type="text"
            value={title}
          />
          <input
            placeholder="Enter Description"
            onChange={(e) => setDescription(e.target.value)}
            className="form-control"
            type="text"
            value={description}
          />
          <button className="btn btn-primary" onClick={handleSubmit}>
            Add
          </button>
        </div>
      </div>

      {/* Small toolbar: progress + hide completed */}
      <div className="container mt-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div style={{ width: "60%" }}>
            <div className="d-flex justify-content-between">
              <small className="text-muted">Progress</small>
              <small className="text-muted">
                {completedCount} / {totalCount}
              </small>
            </div>
            <div className="progress" style={{ height: 8 }}>
              <div
                className="progress-bar"
                role="progressbar"
                style={{
                  width: totalCount
                    ? `${(completedCount / totalCount) * 100}%`
                    : "0%",
                }}
                aria-valuenow={completedCount}
                aria-valuemin="0"
                aria-valuemax={totalCount}
              />
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <label className="mb-0">
              <input
                type="checkbox"
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
              />{" "}
              Hide Completed
            </label>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="container mt-2">
        <h2>Tasks</h2>
        <div className="row">
          {visibleTasks.map((item) => {
            const isCompleted = !!completedTasks[item._id];
            return (
              <div className="col-md-4 mb-4" key={item._id}>
                <div
                  className={`card todo-card shadow-sm ${
                    isCompleted ? "completed-card" : ""
                  }`}
                >
                  <div className="card-body">
                    {editId !== item._id ? (
                      <>
                        <div className="d-flex justify-content-between align-items-start">
                          <h5
                            className={`card-title fw-bold ${
                              isCompleted ? "line-through" : ""
                            }`}
                          >
                            {item.title}
                          </h5>
                          {isCompleted && (
                            <span className="badge bg-success">Completed</span>
                          )}
                        </div>
                        <p
                          className={`card-text ${
                            isCompleted ? "line-through" : ""
                          }`}
                        >
                          {item.description}
                        </p>
                      </>
                    ) : (
                      <div className="form-group d-flex flex-column gap-2">
                        <input
                          placeholder="Enter Title"
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="form-control"
                          type="text"
                          value={editTitle}
                        />
                        <input
                          placeholder="Enter Description"
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="form-control"
                          type="text"
                          value={editDescription}
                        />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="d-flex justify-content-end gap-2 mt-3">
                      {editId !== item._id ? (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </button>
                      ) : (
                        <button
                          onClick={handleUpdate}
                          className="btn btn-sm btn-warning"
                        >
                          Update
                        </button>
                      )}

                      {editId !== item._id ? (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(item._id)}
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={handleCancel}
                        >
                          Cancel
                        </button>
                      )}

                      {/* Mark as Complete button (frontend-only) */}
                      {!isCompleted ? (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => toggleComplete(item._id)}
                        >
                          Mark as Complete
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => toggleComplete(item._id)}
                        >
                          Undo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && (
            <p className="text-muted text-center">No tasks yet. Add one!</p>
          )}

          {tasks.length > 0 && visibleTasks.length === 0 && (
            <p className="text-muted text-center">
              No visible tasks. Try unchecking "Hide Completed".
            </p>
          )}
        </div>
      </div>

      {/* Logout button at bottom */}
      <div className="d-flex justify-content-center my-5">
        <button onClick={handleLogout} className="btn btn-danger">
          Logout
        </button>
      </div>
    </>
  );
}
