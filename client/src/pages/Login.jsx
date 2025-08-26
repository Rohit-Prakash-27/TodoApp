import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "./header";
import api from "../api/axios";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", form);
      // Save token in localStorage
      localStorage.setItem("token", res.data.token || "dummy-token");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    }
  };

  // 🚀 Redirect to dashboard if already logged in
  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  return (
    <>
      <Header />
      <div
        className="d-flex align-items-center justify-content-center bg-light"
        style={{ minHeight: "70vh" }}
      >
        <div className="card shadow p-4" style={{ width: "22rem" }}>
          <h2 className="text-center mb-4">Login</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-control"
                placeholder="Enter email"
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-control"
                placeholder="Enter password"
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-100">
              Login
            </button>
          </form>

          <div className="text-center mt-3">
            <p>
              New user?{" "}
              <Link to="/register" className="text-decoration-none fw-bold">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
