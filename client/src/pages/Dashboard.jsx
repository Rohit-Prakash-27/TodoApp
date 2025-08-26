import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
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
  const navigate = useNavigate();

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
    await api.delete(`/tasks/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    fetchTasks();
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

      {/* Task List */}
      <div className="container mt-4">
        <h2>Tasks</h2>
        <div className="row">
          {tasks.map((item) => (
            <div className="col-md-4 mb-4" key={item._id}>
              <div className="card todo-card shadow-sm">
                <div className="card-body">
                  {editId !== item._id ? (
                    <>
                      <h5 className="card-title fw-bold">{item.title}</h5>
                      <p className="card-text">{item.description}</p>
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
                  </div>
                </div>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="text-muted text-center">No tasks yet. Add one!</p>
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
