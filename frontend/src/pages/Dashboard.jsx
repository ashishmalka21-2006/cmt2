import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import complaintService from '../services/complaintService';
import feedbackService from '../services/feedbackService';
import notificationService from '../services/notificationService';
import chatService from '../services/chatService';
import analyticsService from '../services/analyticsService';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { user } = useAuth();
  
  // Tab control for User role
  const [activeTab, setActiveTab] = useState('complaints'); // complaints, feedback

  // Tab control for Agent role
  const [agentActiveTab, setAgentActiveTab] = useState('queue'); // tasks, assigned, resolved, queue
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  // Workspace states
  const [workspaceNotes, setWorkspaceNotes] = useState('');
  const [workspaceNotesSubmitting, setWorkspaceNotesSubmitting] = useState(false);
  const [workspaceActivePane, setWorkspaceActivePane] = useState('details'); // details, chat

  // Workspace Chat states
  const [workspaceMessages, setWorkspaceMessages] = useState([]);
  const [workspaceChatText, setWorkspaceChatText] = useState('');
  const [workspaceChatLoading, setWorkspaceChatLoading] = useState(false);
  const [workspaceChatSubmitting, setWorkspaceChatSubmitting] = useState(false);

  const workspaceSocketRef = useRef(null);
  const workspaceMessagesEndRef = useRef(null);

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const [assignedToMe, setAssignedToMe] = useState(false);

  // Complaint stats
  const [stats, setStats] = useState({ total: 0, pending: 0, progress: 0, resolved: 0 });

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Feedback history state
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [feedbackHistoryLoading, setFeedbackHistoryLoading] = useState(false);

  // Admin Analytics states
  const [adminData, setAdminData] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);

  // Fetch Admin Analytics
  const fetchAdminData = useCallback(async () => {
    if (user?.role !== 'Admin') return;
    setAdminLoading(true);
    try {
      const resData = await analyticsService.getAdminDashboardData();
      setAdminData(resData.data || null);
    } catch (error) {
      console.error('Failed to fetch admin analytics:', error);
    } finally {
      setAdminLoading(false);
    }
  }, [user]);

  // Fetch complaints
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (status) filters.status = status;
      if (category) filters.category = category;
      if (priority) filters.priority = priority;
      if (search) filters.search = search;
      
      if (user?.role === 'Agent' && assignedToMe) {
        filters.assignedToMe = 'true';
      }

      const data = await complaintService.getComplaints(filters);
      const list = data.complaints || [];
      setComplaints(list);
      
      // Calculate Stats based on user role (specifically for Agent vs general)
      if (user?.role === 'Agent') {
        const myTickets = list.filter((c) => c.assignedTo?._id === user._id || c.assignedTo === user._id);
        setStats({
          total: myTickets.length,
          pending: myTickets.filter((c) => c.status === 'Assigned').length,
          progress: myTickets.filter((c) => c.status === 'In Progress').length,
          resolved: myTickets.filter((c) => c.status === 'Resolved' || c.status === 'Closed').length,
        });
      } else {
        setStats({
          total: list.length,
          pending: list.filter((c) => c.status === 'Pending').length,
          progress: list.filter((c) => c.status === 'In Progress' || c.status === 'Assigned').length,
          resolved: list.filter((c) => c.status === 'Resolved' || c.status === 'Closed').length,
        });
      }

      // Refresh admin data
      if (user?.role === 'Admin') {
        fetchAdminData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  }, [user, status, category, priority, search, assignedToMe, fetchAdminData]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setNotificationsLoading(true);
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  }, [user]);

  // Fetch feedback history (User only)
  const fetchFeedbackHistory = useCallback(async () => {
    if (user?.role !== 'User') return;
    setFeedbackHistoryLoading(true);
    try {
      const data = await feedbackService.getMyFeedbackHistory();
      setFeedbackHistory(data.feedbacks || []);
    } catch (error) {
      console.error('Failed to fetch feedback history:', error);
    } finally {
      setFeedbackHistoryLoading(false);
    }
  }, [user]);

  // Trigger base load
  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Socket configurations for real-time notifications
  useEffect(() => {
    if (!user) return;
    
    fetchNotifications();
    if (user.role === 'User') {
      fetchFeedbackHistory();
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('join_user_room', user._id);
    });

    socket.on('receive_notification', (newNotification) => {
      setNotifications((prev) => {
        if (prev.some((n) => n._id === newNotification._id)) return prev;
        return [newNotification, ...prev];
      });
      toast.info(newNotification.text);
      fetchComplaints();
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user, fetchNotifications, fetchFeedbackHistory, fetchComplaints]);

  // Workspace Chat Room Socket Mapping
  useEffect(() => {
    if (!selectedComplaint || user?.role !== 'Agent') return;

    const fetchWorkspaceChatHistory = async () => {
      workspaceChatLoading || setWorkspaceMessages([]);
      try {
        const data = await chatService.getChatMessages(selectedComplaint._id);
        setWorkspaceMessages(data.messages || []);
      } catch (err) {
        console.error('Failed to load workspace chat:', err);
      }
    };

    fetchWorkspaceChatHistory();

    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    workspaceSocketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_room', selectedComplaint._id);
    });

    socket.on('receive_message', (msg) => {
      setWorkspaceMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [selectedComplaint, user]);

  const scrollToWorkspaceChatBottom = () => {
    workspaceMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (workspaceActivePane === 'chat') {
      scrollToWorkspaceChatBottom();
    }
  }, [workspaceMessages, workspaceActivePane]);

  // Notification actions
  const handleMarkRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  // Quick Action transitions for Agent Workspace
  const handleWorkspaceClaim = async (complaintId) => {
    try {
      const data = await complaintService.updateComplaint(complaintId, { assignedTo: user._id });
      toast.success('Complaint claimed successfully');
      setSelectedComplaint(data.complaint);
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to claim complaint');
    }
  };

  const handleWorkspaceStartWork = async (complaintId) => {
    try {
      const data = await complaintService.updateComplaint(complaintId, { status: 'In Progress' });
      toast.success('Work started on this complaint');
      setSelectedComplaint(data.complaint);
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start work');
    }
  };

  const handleWorkspaceResolve = async (complaintId) => {
    try {
      const data = await complaintService.updateComplaint(complaintId, { status: 'Resolved' });
      toast.success('Complaint marked as Resolved');
      setSelectedComplaint(data.complaint);
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve complaint');
    }
  };

  // Add Progress Notes in Workspace
  const handleWorkspaceAddNoteSubmit = async (e) => {
    e.preventDefault();
    if (!workspaceNotes.trim() || workspaceNotesSubmitting) return;

    setWorkspaceNotesSubmitting(true);
    try {
      const data = await complaintService.addNote(selectedComplaint._id, workspaceNotes.trim());
      toast.success('Progress note recorded');
      setWorkspaceNotes('');
      setSelectedComplaint(data.complaint);
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record progress note');
    } finally {
      setWorkspaceNotesSubmitting(false);
    }
  };

  // Send Workspace Chat Message
  const handleWorkspaceChatSubmit = async (e) => {
    e.preventDefault();
    if (!workspaceChatText.trim() || workspaceChatSubmitting) return;

    const msgToSend = workspaceChatText.trim();
    setWorkspaceChatText('');
    setWorkspaceChatSubmitting(true);

    try {
      await chatService.sendChatMessage(selectedComplaint._id, msgToSend);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
      setWorkspaceChatText(msgToSend);
    } finally {
      setWorkspaceChatSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) {
      try {
        await complaintService.deleteComplaint(id);
        toast.success('Complaint deleted successfully');
        fetchComplaints();
        if (selectedComplaint?._id === id) {
          setSelectedComplaint(null);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete complaint');
      }
    }
  };

  const getStatusBadge = (statusValue) => {
    switch (statusValue) {
      case 'Pending':
        return <span className="badge bg-secondary px-2.5 py-1.5 rounded-pill">Pending</span>;
      case 'Assigned':
        return <span className="badge bg-info text-dark px-2.5 py-1.5 rounded-pill">Assigned</span>;
      case 'In Progress':
        return <span className="badge bg-warning text-dark px-2.5 py-1.5 rounded-pill">In Progress</span>;
      case 'Resolved':
        return <span className="badge bg-success px-2.5 py-1.5 rounded-pill">Resolved</span>;
      case 'Closed':
        return <span className="badge bg-dark px-2.5 py-1.5 rounded-pill">Closed</span>;
      default:
        return <span className="badge bg-light text-dark px-2.5 py-1.5 rounded-pill">{statusValue}</span>;
    }
  };

  const getPriorityBadge = (priorityValue) => {
    switch (priorityValue) {
      case 'High':
        return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 rounded">High</span>;
      case 'Medium':
        return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 rounded">Medium</span>;
      case 'Low':
        return <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded">Low</span>;
      default:
        return <span className="badge bg-light text-dark px-2 py-1 rounded">{priorityValue}</span>;
    }
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // ----------------------------------------------------
  // DEDICATED USER DASHBOARD RENDER
  // ----------------------------------------------------
  if (user?.role === 'User') {
    return (
      <div className="py-2 animate-fade-in">
        {/* Header */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
          <div>
            <h1 className="h2 fw-bold text-dark mb-1">My Resolution Portal</h1>
            <p className="text-muted mb-0">Overview of complaints and active ticket metrics</p>
          </div>
          <Link to="/complaints/submit" className="btn btn-primary d-flex align-items-center justify-content-center shadow-sm">
            <i className="bi bi-plus-lg me-2"></i> Raise Complaint
          </Link>
        </div>
        <div className="row g-4">
          {/* Left Column: Profile Card + Notifications Feed */}
          <div className="col-lg-4 col-md-5">
            {/* Profile Card */}
            <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4">
              <div className="card-body text-center p-1">
                <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                  <i className="bi bi-person-fill fs-1"></i>
                </div>
                <h4 className="fw-bold text-dark mb-1">{user.name}</h4>
                <p className="text-muted small mb-3">{user.email}</p>
                <div className="d-flex justify-content-center mb-3">
                  <span className="badge bg-primary px-3 py-1.5 rounded-pill fs-7">{user.role}</span>
                </div>
                <hr className="border-secondary-subtle" />
                <div className="row g-2 text-start mt-3">
                  <div className="col-12 d-flex justify-content-between small text-muted">
                    <span>Total Submissions:</span>
                    <strong className="text-dark">{stats.total}</strong>
                  </div>
                  <div className="col-12 d-flex justify-content-between small text-muted">
                    <span>Pending Action:</span>
                    <strong className="text-dark">{stats.pending}</strong>
                  </div>
                  <div className="col-12 d-flex justify-content-between small text-muted">
                    <span>Resolved Issues:</span>
                    <strong className="text-success">{stats.resolved}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Notifications Tray */}
            <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4">
              <div className="card-body p-1">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold text-dark mb-0">
                    Notifications
                    {unreadNotificationsCount > 0 && (
                      <span className="badge bg-danger ms-2 rounded-circle fs-8">{unreadNotificationsCount}</span>
                    )}
                  </h5>
                  {unreadNotificationsCount > 0 && (
                    <button className="btn btn-link p-0 text-primary text-decoration-none small" style={{ fontSize: '12px' }} onClick={handleMarkAllRead}>
                      Mark all read
                    </button>
                  )}
                </div>

                {notificationsLoading && notifications.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading alerts...</span>
                    </div>
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="text-muted small mb-0 italic text-center py-4">No notifications to display.</p>
                ) : (
                  <div className="notification-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {notifications.map((notif) => (
                      <div
                        key={notif._id}
                        onClick={() => handleMarkRead(notif._id)}
                        className={`p-3 mb-2 rounded-3 border transition-all ${
                          notif.read ? 'bg-light border-light-subtle text-muted' : 'bg-primary-subtle border-primary-subtle text-dark fw-medium'
                        }`}
                        style={{ cursor: 'pointer', fontSize: '12.5px' }}
                      >
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          {notif.link ? (
                            <Link to={notif.link} className="text-decoration-none text-reset flex-grow-1">
                              {notif.text}
                            </Link>
                          ) : (
                            <span className="flex-grow-1">{notif.text}</span>
                          )}
                          {!notif.read && (
                            <span className="bg-primary rounded-circle d-inline-block flex-shrink-0" style={{ width: '8px', height: '8px', marginTop: '5px' }}></span>
                          )}
                        </div>
                        <small className="text-muted d-block mt-1" style={{ fontSize: '9.5px' }}>
                          {new Date(notif.createdAt).toLocaleString()}
                        </small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Multi-tab main complaints tables vs Feedback logs */}
          <div className="col-lg-8 col-md-7">
            {/* Portal Tab Controls */}
            <div className="card border-0 shadow-sm mb-4 rounded-4 bg-white p-3">
              <ul className="nav nav-pills nav-fill">
                <li className="nav-item">
                  <button
                    className={`nav-link fw-semibold rounded-pill ${activeTab === 'complaints' ? 'active' : ''}`}
                    onClick={() => setActiveTab('complaints')}
                  >
                    <i className="bi bi-file-earmark-text-fill me-2"></i> My Complaints
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link fw-semibold rounded-pill ${activeTab === 'feedback' ? 'active' : ''}`}
                    onClick={() => setActiveTab('feedback')}
                  >
                    <i className="bi bi-star-fill me-2"></i> Feedback History
                  </button>
                </li>
              </ul>
            </div>

            {/* TAB 1: COMPLAINTS */}
            {activeTab === 'complaints' && (
              <>
                {/* Stats Counters */}
                <div className="row g-3 mb-4">
                  <div className="col-4">
                    <div className="card border-0 shadow-sm rounded-3 bg-secondary-subtle text-secondary-emphasis">
                      <div className="card-body p-3 text-center">
                        <span className="small fw-semibold text-uppercase tracking-wider">Pending</span>
                        <h4 className="fw-bold mb-0 mt-1">{stats.pending}</h4>
                      </div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="card border-0 shadow-sm rounded-3 bg-warning-subtle text-warning-emphasis">
                      <div className="card-body p-3 text-center">
                        <span className="small fw-semibold text-uppercase tracking-wider">Active</span>
                        <h4 className="fw-bold mb-0 mt-1">{stats.progress}</h4>
                      </div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="card border-0 shadow-sm rounded-3 bg-success-subtle text-success-emphasis">
                      <div className="card-body p-3 text-center">
                        <span className="small fw-semibold text-uppercase tracking-wider">Resolved</span>
                        <h4 className="fw-bold mb-0 mt-1">{stats.resolved}</h4>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filters card */}
                <div className="card border-0 shadow-sm mb-4 rounded-3 bg-white p-4">
                  <div className="row g-2">
                    <div className="col-md-6 col-12">
                      <input
                        type="text"
                        className="form-control bg-light"
                        placeholder="Search Ticket ID or subject..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="col-md-3 col-6">
                      <select className="form-select bg-light" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                    <div className="col-md-3 col-6">
                      <select className="form-select bg-light" value={priority} onChange={(e) => setPriority(e.target.value)}>
                        <option value="">All Priorities</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Complaints Table Grid */}
                <div className="card border-0 shadow-sm rounded-3">
                  <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold">Filing Record</h5>
                    <button className="btn btn-sm btn-outline-secondary" onClick={fetchComplaints}>
                      <i className="bi bi-arrow-clockwise me-1"></i> Refresh
                    </button>
                  </div>
                  <div className="card-body p-0">
                    {loading ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    ) : complaints.length === 0 ? (
                      <div className="text-center py-5 text-muted">
                        <i className="bi bi-inbox display-6"></i>
                        <p className="small mt-2 mb-0">No complaints logged.</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th className="ps-4">Ticket ID</th>
                              <th>Category</th>
                              <th>Subject</th>
                              <th>Priority</th>
                              <th>Status</th>
                              <th>Date Filed</th>
                              <th className="text-center pe-4">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {complaints.map((complaint) => (
                              <tr key={complaint._id}>
                                <td className="ps-4 fw-semibold">{complaint.ticketId}</td>
                                <td>
                                  <span className="badge bg-light text-dark border px-2 py-1.5">{complaint.category}</span>
                                </td>
                                <td className="text-truncate" style={{ maxWidth: '200px' }} title={complaint.title}>
                                  {complaint.title}
                                </td>
                                <td>{getPriorityBadge(complaint.priority)}</td>
                                <td>{getStatusBadge(complaint.status)}</td>
                                <td>{new Date(complaint.createdAt).toLocaleDateString()}</td>
                                <td className="text-center pe-4">
                                  <div className="btn-group">
                                    <Link to={`/complaints/${complaint._id}`} className="btn btn-sm btn-outline-primary">
                                      View
                                    </Link>
                                    {complaint.status === 'Pending' && (
                                      <>
                                        <Link to={`/complaints/${complaint._id}/edit`} className="btn btn-sm btn-outline-secondary">
                                          Edit
                                        </Link>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(complaint._id)}>
                                          <i className="bi bi-trash"></i>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: FEEDBACK HISTORY */}
            {activeTab === 'feedback' && (
              <div className="card border-0 shadow-sm rounded-3 bg-white">
                <div className="card-header bg-white border-bottom py-3">
                  <h5 className="mb-0 fw-bold">Feedback History</h5>
                </div>
                <div className="card-body p-0">
                  {feedbackHistoryLoading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading ratings...</span>
                      </div>
                    </div>
                  ) : feedbackHistory.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="bi bi-star display-6 opacity-50"></i>
                      <p className="small mt-2 mb-0">No rating feedback submitted yet.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th className="ps-4">Ticket ID</th>
                            <th>Category</th>
                            <th>Complaint Subject</th>
                            <th>Rating Given</th>
                            <th>Comments Left</th>
                            <th>Date Logged</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feedbackHistory.map((item) => (
                            <tr key={item._id}>
                              <td className="ps-4 fw-semibold">
                                <Link to={`/complaints/${item.complaint?._id}`} className="text-decoration-none fw-bold">
                                  {item.complaint?.ticketId || 'N/A'}
                                </Link>
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border px-2 py-1.5">
                                  {item.complaint?.category || 'N/A'}
                                </span>
                              </td>
                              <td className="text-truncate" style={{ maxWidth: '180px' }} title={item.complaint?.title}>
                                {item.complaint?.title || 'N/A'}
                              </td>
                              <td>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <i
                                    key={star}
                                    className={`bi ${star <= item.rating ? 'bi-star-fill text-warning' : 'bi-star text-muted'} fs-7 me-0.5`}
                                  ></i>
                                ))}
                              </td>
                              <td className="text-truncate small text-muted" style={{ maxWidth: '200px' }} title={item.comments}>
                                {item.comments || <em className="text-muted-subtle opacity-50">No comment</em>}
                              </td>
                              <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // DEDICATED AGENT SUPPORT CENTER RENDER (SPLIT SCREEN)
  // ----------------------------------------------------
  if (user?.role === 'Agent') {
    const myTickets = complaints.filter((c) => c.assignedTo?._id === user._id || c.assignedTo === user._id);
    const assignedComplaints = myTickets.filter((c) => c.status === 'Assigned' || c.status === 'In Progress');
    const resolvedComplaints = myTickets.filter((c) => c.status === 'Resolved' || c.status === 'Closed');
    const todaysTasks = myTickets.filter((c) => c.status === 'Assigned' || (c.status === 'In Progress' && c.priority === 'High'));
    const generalQueue = complaints.filter((c) => !c.assignedTo && c.status === 'Pending');

    const filterList = (list) => {
      return list.filter((c) => {
        const matchesSearch = search ? (c.ticketId.toLowerCase().includes(search.toLowerCase()) || c.title.toLowerCase().includes(search.toLowerCase())) : true;
        const matchesCategory = category ? c.category === category : true;
        const matchesPriority = priority ? c.priority === priority : true;
        return matchesSearch && matchesCategory && matchesPriority;
      });
    };

    const activeList = filterList(
      agentActiveTab === 'tasks' ? todaysTasks :
      agentActiveTab === 'assigned' ? assignedComplaints :
      agentActiveTab === 'resolved' ? resolvedComplaints : generalQueue
    );

    return (
      <div className="py-2 animate-fade-in">
        {/* Agent Metrics Widgets */}
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm rounded-3 bg-primary-subtle text-primary-emphasis">
              <div className="card-body p-3 text-center">
                <span className="small fw-semibold text-uppercase tracking-wider">My Assignments</span>
                <h4 className="fw-bold mb-0 mt-1">{stats.total}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm rounded-3 bg-danger-subtle text-danger-emphasis">
              <div className="card-body p-3 text-center">
                <span className="small fw-semibold text-uppercase tracking-wider">Today's Tasks</span>
                <h4 className="fw-bold mb-0 mt-1">{todaysTasks.length}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm rounded-3 bg-warning-subtle text-warning-emphasis">
              <div className="card-body p-3 text-center">
                <span className="small fw-semibold text-uppercase tracking-wider">Work in Progress</span>
                <h4 className="fw-bold mb-0 mt-1">{stats.progress}</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm rounded-3 bg-success-subtle text-success-emphasis">
              <div className="card-body p-3 text-center">
                <span className="small fw-semibold text-uppercase tracking-wider">My Resolved</span>
                <h4 className="fw-bold mb-0 mt-1">{stats.resolved}</h4>
              </div>
            </div>
          </div>
        </div>

        {/* Global Agent Filters */}
        <div className="card border-0 shadow-sm mb-4 rounded-3 bg-white p-3">
          <div className="row g-2">
            <div className="col-md-6 col-12">
              <input
                type="text"
                className="form-control bg-light px-3 py-2 small border-light-subtle rounded-pill"
                placeholder="Search active lists by subject or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-3 col-6">
              <select className="form-select bg-light border-light-subtle rounded-pill small" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All Categories</option>
                <option value="Technical">Technical</option>
                <option value="Billing">Billing</option>
                <option value="Service">Service</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="col-md-3 col-6">
              <select className="form-select bg-light border-light-subtle rounded-pill small" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Work Split Screen console */}
        <div className="row g-4">
          {/* Left Panel: Lists selector */}
          <div className="col-lg-5 col-md-6">
            <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden" style={{ minHeight: '520px' }}>
              <div className="card-header bg-white border-bottom p-0">
                <div className="d-flex flex-wrap text-center">
                  <button
                    className={`flex-fill py-3 border-0 bg-transparent fw-bold small text-muted border-bottom-3 ${agentActiveTab === 'tasks' ? 'text-primary border-primary-active border-bottom-primary' : ''}`}
                    onClick={() => { setAgentActiveTab('tasks'); setSelectedComplaint(null); }}
                    style={{ fontSize: '11.5px' }}
                  >
                    Today's Tasks ({todaysTasks.length})
                  </button>
                  <button
                    className={`flex-fill py-3 border-0 bg-transparent fw-bold small text-muted border-bottom-3 ${agentActiveTab === 'assigned' ? 'text-primary border-primary-active border-bottom-primary' : ''}`}
                    onClick={() => { setAgentActiveTab('assigned'); setSelectedComplaint(null); }}
                    style={{ fontSize: '11.5px' }}
                  >
                    Assigned ({assignedComplaints.length})
                  </button>
                  <button
                    className={`flex-fill py-3 border-0 bg-transparent fw-bold small text-muted border-bottom-3 ${agentActiveTab === 'resolved' ? 'text-primary border-primary-active border-bottom-primary' : ''}`}
                    onClick={() => { setAgentActiveTab('resolved'); setSelectedComplaint(null); }}
                    style={{ fontSize: '11.5px' }}
                  >
                    Resolved ({resolvedComplaints.length})
                  </button>
                  <button
                    className={`flex-fill py-3 border-0 bg-transparent fw-bold small text-muted border-bottom-3 ${agentActiveTab === 'queue' ? 'text-primary border-primary-active border-bottom-primary' : ''}`}
                    onClick={() => { setAgentActiveTab('queue'); setSelectedComplaint(null); }}
                    style={{ fontSize: '11.5px' }}
                  >
                    Claim Queue ({generalQueue.length})
                  </button>
                </div>
              </div>

              <div className="card-body p-3 bg-light-subtle overflow-auto" style={{ maxHeight: '480px' }}>
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading queue...</span>
                    </div>
                  </div>
                ) : activeList.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-folder2-open display-6 opacity-25"></i>
                    <p className="small mt-2 mb-0">No complaints in this queue.</p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {activeList.map((ticket) => (
                      <div
                        key={ticket._id}
                        onClick={() => setSelectedComplaint(ticket)}
                        className={`p-3 rounded-4 border transition-all ${
                          selectedComplaint?._id === ticket._id ? 'bg-primary-subtle border-primary-subtle shadow-sm' : 'bg-white border-light-subtle'
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-bold text-dark small">{ticket.ticketId}</span>
                          <div className="d-flex gap-1 align-items-center">
                            {getPriorityBadge(ticket.priority)}
                            {getStatusBadge(ticket.status)}
                          </div>
                        </div>
                        <h6 className="fw-bold text-dark mb-1 text-truncate" style={{ fontSize: '13.5px' }}>{ticket.title}</h6>
                        
                        <div className="mb-2" style={{ fontSize: '11.5px' }}>
                          <div className="text-muted text-truncate">
                            Category: <span className="text-dark fw-medium">{ticket.category}</span>
                          </div>
                          <div className="text-muted text-truncate">
                            User: <strong className="text-dark">{ticket.user?.name || 'Customer'}</strong> ({ticket.user?.email || 'N/A'})
                          </div>
                        </div>
                        
                        <div className="d-flex justify-content-between align-items-center pt-2 border-top border-light-subtle">
                          <span className="text-muted" style={{ fontSize: '10px' }}>
                            <i className="bi bi-clock me-1"></i>
                            Filed: {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                          <div className="d-flex gap-2">
                            {ticket.status === 'Pending' && !ticket.assignedTo && (
                              <button 
                                className="btn btn-sm btn-primary text-white py-1 px-2.5 rounded-pill fw-semibold" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWorkspaceClaim(ticket._id);
                                }}
                                style={{ fontSize: '10px' }}
                              >
                                Accept
                              </button>
                            )}
                            <button 
                              className="btn btn-sm btn-outline-secondary py-1 px-2.5 rounded-pill"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedComplaint(ticket);
                              }}
                              style={{ fontSize: '10px' }}
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Integrated Workspace details + Chat */}
          <div className="col-lg-7 col-md-6">
            {!selectedComplaint ? (
              <div className="card border-0 shadow-sm rounded-4 bg-white d-flex align-items-center justify-content-center text-center p-5" style={{ minHeight: '520px' }}>
                <div>
                  <i className="bi bi-journal-text display-3 text-muted opacity-25 mb-3"></i>
                  <h5 className="fw-bold text-dark">Agent Workspace</h5>
                  <p className="text-muted small mx-auto" style={{ maxWidth: '280px' }}>
                    Select a ticket from the left panel tabs to open details, update work status, read timeline logs, and text client in real-time.
                  </p>
                </div>
              </div>
            ) : (
              <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden d-flex flex-column" style={{ minHeight: '520px' }}>
                {/* Workspace Header */}
                <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                  <div>
                    <span className="fw-bold text-dark me-2">{selectedComplaint.ticketId}</span>
                    {getStatusBadge(selectedComplaint.status)}
                  </div>
                  <div>
                    <ul className="nav nav-pills card-header-pills small">
                      <li className="nav-item">
                        <button
                          className={`nav-link px-3 py-1.5 fw-semibold ${workspaceActivePane === 'details' ? 'active' : ''}`}
                          onClick={() => setWorkspaceActivePane('details')}
                        >
                          Details & Notes
                        </button>
                      </li>
                      <li className="nav-item">
                        <button
                          className={`nav-link px-3 py-1.5 fw-semibold ${workspaceActivePane === 'chat' ? 'active' : ''}`}
                          onClick={() => setWorkspaceActivePane('chat')}
                          disabled={!selectedComplaint.assignedTo}
                        >
                          Resolution Chat
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Workspace Panes */}
                <div className="card-body p-4 overflow-auto flex-grow-1" style={{ height: '380px' }}>
                  {workspaceActivePane === 'details' && (
                    <div className="animate-fade-in">
                      {/* Quick actions */}
                      <div className="mb-4 bg-light p-3 rounded-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <span className="small text-muted fw-semibold">Workspace Controls:</span>
                        <div className="d-flex gap-2">
                          {!selectedComplaint.assignedTo && (
                            <button className="btn btn-sm btn-primary text-white font-semibold rounded-pill px-3" onClick={() => handleWorkspaceClaim(selectedComplaint._id)}>
                              Claim Ticket
                            </button>
                          )}
                          {selectedComplaint.assignedTo && selectedComplaint.status === 'Assigned' && (
                            <button className="btn btn-sm btn-warning text-dark font-semibold rounded-pill px-3" onClick={() => handleWorkspaceStartWork(selectedComplaint._id)}>
                              Start Work
                            </button>
                          )}
                          {selectedComplaint.assignedTo && selectedComplaint.status === 'In Progress' && (
                            <button className="btn btn-sm btn-success text-white font-semibold rounded-pill px-3" onClick={() => handleWorkspaceResolve(selectedComplaint._id)}>
                              Resolve Complaint
                            </button>
                          )}
                          <Link to={`/complaints/${selectedComplaint._id}`} className="btn btn-sm btn-outline-secondary rounded-pill px-3">
                            Full Page Details <i className="bi bi-box-arrow-up-right ms-1"></i>
                          </Link>
                        </div>
                      </div>

                      <h5 className="fw-bold text-dark mb-1">{selectedComplaint.title}</h5>
                      <p className="text-muted small mb-3">Filed by: <strong className="text-dark">{selectedComplaint.user?.name || 'Customer'}</strong> ({selectedComplaint.user?.email})</p>
                      
                      <div className="row g-2 mb-4">
                        <div className="col-6">
                          <small className="text-muted d-block small">Category</small>
                          <span className="small fw-semibold">{selectedComplaint.category}</span>
                        </div>
                        <div className="col-6">
                          <small className="text-muted d-block small">Priority</small>
                          {getPriorityBadge(selectedComplaint.priority)}
                        </div>
                      </div>

                      <div className="bg-light p-3 rounded-3 mb-4">
                        <strong className="small text-muted d-block mb-1">Issue Description:</strong>
                        <p className="small text-dark mb-0" style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                          {selectedComplaint.description}
                        </p>
                      </div>

                      {/* Notes Section */}
                      <hr className="border-secondary-subtle" />
                      <h6 className="fw-bold text-dark mb-3"><i className="bi bi-journal-text me-2"></i>Internal Progress Logs</h6>
                      <div className="mb-4">
                        {!selectedComplaint.notes || selectedComplaint.notes.length === 0 ? (
                          <p className="text-muted small italic mb-3">No progress notes logged yet.</p>
                        ) : (
                          <div className="d-flex flex-column gap-2 mb-3" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                            {selectedComplaint.notes.map((note, idx) => (
                              <div key={idx} className="bg-light p-2.5 rounded-3 border border-light-subtle">
                                <p className="small text-dark mb-1" style={{ whiteSpace: 'pre-line' }}>{note.text}</p>
                                <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '9.5px' }}>
                                  <span className="text-muted fw-medium">By: {note.addedBy?.name || 'Staff'}</span>
                                  <span className="text-muted">{new Date(note.createdAt).toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {selectedComplaint.status !== 'Closed' && (
                          <form onSubmit={handleWorkspaceAddNoteSubmit} className="d-flex gap-2">
                            <input
                              type="text"
                              className="form-control rounded-pill bg-light border-light-subtle px-3 py-1.5 small"
                              placeholder="Write a progress log note..."
                              value={workspaceNotes}
                              onChange={(e) => setWorkspaceNotes(e.target.value)}
                              required
                            />
                            <button type="submit" className="btn btn-sm btn-primary rounded-pill px-3 flex-shrink-0 text-white font-semibold" disabled={workspaceNotesSubmitting}>
                              {workspaceNotesSubmitting ? 'Logging...' : 'Log Note'}
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  )}

                  {/* WORKSPACE PANE 2: CHAT */}
                  {workspaceActivePane === 'chat' && (
                    <div className="d-flex flex-column h-100 animate-fade-in">
                      <div className="flex-grow-1 overflow-auto bg-light-subtle p-2 mb-3 rounded-3" style={{ minHeight: '260px', maxHeight: '280px' }}>
                        {workspaceMessages.length === 0 ? (
                          <div className="h-100 d-flex flex-column justify-content-center align-items-center text-center p-3 text-muted">
                            <i className="bi bi-chat-left-quote fs-2 mb-1 opacity-50"></i>
                            <p className="small mb-0">No messages yet. Send a message to start.</p>
                          </div>
                        ) : (
                          <div className="d-flex flex-column gap-3">
                            {workspaceMessages.map((msg) => {
                              const isMe = msg.sender?._id === user?._id || msg.sender === user?._id;
                              const senderName = msg.sender?.name || (isMe ? 'You' : 'Filer');
                              const senderRole = msg.sender?.role || (isMe ? user?.role : '');

                              return (
                                <div key={msg._id} className={`d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}`}>
                                  <div className="d-flex align-items-center mb-1 gap-1">
                                    <span className="fw-semibold text-dark" style={{ fontSize: '10.5px' }}>{senderName}</span>
                                    {senderRole && senderRole !== 'User' && (
                                      <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill" style={{ fontSize: '8px', padding: '1px 4px' }}>
                                        {senderRole}
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    className={`p-2.5 rounded-3 text-break ${isMe ? 'bg-primary text-white' : 'bg-white text-dark border border-light-subtle'}`}
                                    style={{
                                      maxWidth: '85%',
                                      fontSize: '12.5px',
                                      borderTopRightRadius: isMe ? '0px' : '12px',
                                      borderTopLeftRadius: isMe ? '12px' : '0px',
                                    }}
                                  >
                                    {msg.message}
                                  </div>
                                  <span className="text-muted mt-1" style={{ fontSize: '8.5px' }}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              );
                            })}
                            <div ref={workspaceMessagesEndRef} />
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleWorkspaceChatSubmit} className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control rounded-pill border-light-subtle bg-light px-3 py-1.5 small"
                          placeholder={selectedComplaint.status === 'Closed' ? 'Chat is closed' : 'Type message to client...'}
                          value={workspaceChatText}
                          onChange={(e) => setWorkspaceChatText(e.target.value)}
                          disabled={selectedComplaint.status === 'Closed' || workspaceChatSubmitting}
                          required
                        />
                        <button type="submit" className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }} disabled={selectedComplaint.status === 'Closed' || !workspaceChatText.trim() || workspaceChatSubmitting}>
                          {workspaceChatSubmitting ? (
                            <span className="spinner-border spinner-border-sm" role="status"></span>
                          ) : (
                            <i className="bi bi-send-fill text-white fs-7"></i>
                          )}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // DEDICATED ADMIN ANALYTICS DASHBOARD RENDER
  // ----------------------------------------------------
  const cards = adminData?.cards || { totalUsers: 0, totalAgents: 0, pendingComplaints: 0, resolvedComplaints: 0 };
  const monthlyComplaints = adminData?.monthlyComplaints || [];
  const categoryComplaints = adminData?.categoryComplaints || [];
  const agentPerformance = adminData?.agentPerformance || [];
  const recentActivities = adminData?.recentActivities || [];

  // Calculate monthly stats maximum to scale SVG columns
  const maxMonthlyCount = monthlyComplaints.length > 0 ? Math.max(...monthlyComplaints.map((m) => m.count)) : 10;

  return (
    <div className="py-4 animate-fade-in">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 fw-bold text-dark mb-1">Admin Analytics Dashboard</h1>
          <p className="text-muted mb-0">System metrics, feedback trends, and agent workload indicators</p>
        </div>
        <button className="btn btn-primary rounded-pill px-4" onClick={fetchComplaints}>
          <i className="bi bi-arrow-clockwise me-1"></i> Sync Metrics
        </button>
      </div>

      {/* Cards deck */}
      {adminLoading && !adminData ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading metrics...</span>
          </div>
        </div>
      ) : (
        <>
          <div className="row g-4 mb-5">
            <div className="col-lg-3 col-sm-6">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-semibold text-uppercase tracking-wider">Total Clients</span>
                    <h2 className="fw-black text-dark mb-0 mt-1" style={{ fontWeight: '800' }}>{cards.totalUsers}</h2>
                  </div>
                  <div className="bg-primary-subtle text-primary rounded-3 p-3">
                    <i className="bi bi-people-fill fs-3"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-sm-6">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-semibold text-uppercase tracking-wider">Total Agents</span>
                    <h2 className="fw-black text-dark mb-0 mt-1" style={{ fontWeight: '800' }}>{cards.totalAgents}</h2>
                  </div>
                  <div className="bg-info-subtle text-info-emphasis rounded-3 p-3">
                    <i className="bi bi-person-badge-fill fs-3"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-sm-6">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-semibold text-uppercase tracking-wider">Pending Action</span>
                    <h2 className="fw-black text-danger mb-0 mt-1" style={{ fontWeight: '800' }}>{cards.pendingComplaints}</h2>
                  </div>
                  <div className="bg-danger-subtle text-danger rounded-3 p-3">
                    <i className="bi bi-hourglass-split fs-3"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-sm-6">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted small fw-semibold text-uppercase tracking-wider">Resolved Tickets</span>
                    <h2 className="fw-black text-success mb-0 mt-1" style={{ fontWeight: '800' }}>{cards.resolvedComplaints}</h2>
                  </div>
                  <div className="bg-success-subtle text-success rounded-3 p-3">
                    <i className="bi bi-check-circle-fill fs-3"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="row g-4 mb-5">
            {/* Chart 1: Monthly Complaints SVG Chart */}
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
                <h5 className="fw-bold mb-1 text-dark">Monthly Complaint Trend</h5>
                <p className="text-muted small mb-4">Volume of complaints filed over the past 6 months</p>

                {monthlyComplaints.length === 0 ? (
                  <div className="h-100 d-flex justify-content-center align-items-center text-muted small italic">
                    No trend history available.
                  </div>
                ) : (
                  <div className="d-flex flex-column h-100">
                    {/* SVG Bar Chart */}
                    <div style={{ height: '220px', width: '100%' }}>
                      <svg width="100%" height="100%" viewBox="0 0 600 220" preserveAspectRatio="none">
                        {/* Horizontal grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                          const y = 20 + pct * 150;
                          return (
                            <line
                              key={idx}
                              x1="40"
                              y1={y}
                              x2="580"
                              y2={y}
                              stroke="#e9ecef"
                              strokeWidth="1"
                              strokeDasharray="4,4"
                            />
                          );
                        })}

                        {/* Rendering Columns */}
                        {monthlyComplaints.map((item, idx) => {
                          const colWidth = 45;
                          const spacing = 75;
                          const x = 70 + idx * spacing;
                          const heightVal = (item.count / maxMonthlyCount) * 140;
                          const y = 170 - heightVal;

                          return (
                            <g key={idx}>
                              {/* Gradient definition */}
                              <defs>
                                <linearGradient id={`grad-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#0d6efd" />
                                  <stop offset="100%" stopColor="#0d6efd" stopOpacity="0.25" />
                                </linearGradient>
                              </defs>
                              <rect
                                x={x}
                                y={y}
                                width={colWidth}
                                height={heightVal > 0 ? heightVal : 2}
                                fill={`url(#grad-${idx})`}
                                rx="5"
                                style={{ transition: 'all 0.3s' }}
                              />
                              {/* Tooltip value */}
                              <text
                                x={x + colWidth / 2}
                                y={y - 8}
                                textAnchor="middle"
                                fill="#212529"
                                fontSize="11"
                                fontWeight="bold"
                              >
                                {item.count}
                              </text>
                              {/* Month Label */}
                              <text
                                x={x + colWidth / 2}
                                y="195"
                                textAnchor="middle"
                                fill="#6c757d"
                                fontSize="11"
                                fontWeight="600"
                              >
                                {item.label}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Category Breakdown progress list */}
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
                <h5 className="fw-bold mb-1 text-dark">Category-wise Share</h5>
                <p className="text-muted small mb-4">Distribution of ticket issues across categories</p>
                <div className="d-flex flex-column gap-4 justify-content-center h-100">
                  {categoryComplaints.map((item) => {
                    const totalComplaints = categoryComplaints.reduce((a, b) => a + b.count, 0) || 1;
                    const percent = Math.round((item.count / totalComplaints) * 100);
                    
                    let color = 'bg-primary';
                    if (item.category === 'Billing') color = 'bg-success';
                    if (item.category === 'Service') color = 'bg-warning';
                    if (item.category === 'Other') color = 'bg-secondary';

                    return (
                      <div key={item.category}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="small text-dark fw-semibold">{item.category}</span>
                          <span className="small text-muted fw-bold">
                            {item.count} ({percent}%)
                          </span>
                        </div>
                        <div className="progress" style={{ height: '10px' }}>
                          <div
                            className={`progress-bar rounded-pill ${color}`}
                            role="progressbar"
                            style={{ width: `${percent}%` }}
                            aria-valuenow={percent}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Performance & Activities Grid */}
          <div className="row g-4 mb-5">
            {/* Agent Performance Table */}
            <div className="col-lg-7">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
                <h5 className="fw-bold mb-1 text-dark">Agent Workload & Performance</h5>
                <p className="text-muted small mb-3">Staff ticket allocations, completions, and customer feedback average ratings</p>
                
                {agentPerformance.length === 0 ? (
                  <div className="text-center py-4 text-muted small italic">No agents registered.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Agent Name</th>
                          <th className="text-center">Assigned</th>
                          <th className="text-center">Resolved</th>
                          <th>Satisfaction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentPerformance.map((agent) => {
                          const pct = agent.totalAssigned > 0 ? Math.round((agent.resolvedCount / agent.totalAssigned) * 100) : 0;
                          return (
                            <tr key={agent._id}>
                              <td>
                                <span className="d-block fw-semibold">{agent.name}</span>
                                <small className="text-muted fs-8">{agent.email}</small>
                              </td>
                              <td className="text-center fw-bold">{agent.totalAssigned}</td>
                              <td className="text-center">
                                <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1.5 rounded-pill small">
                                  {agent.resolvedCount} ({pct}%)
                                </span>
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-1">
                                  <span className="fw-bold text-dark small me-1">{agent.averageRating > 0 ? agent.averageRating : 'N/A'}</span>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <i
                                      key={star}
                                      className={`bi bi-star-fill ${star <= Math.round(agent.averageRating) ? 'text-warning' : 'text-muted-subtle opacity-25'} fs-8`}
                                    ></i>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activities Log */}
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
                <h5 className="fw-bold mb-1 text-dark">Recent System Activities</h5>
                <p className="text-muted small mb-4">Latest triggers, updates, allocations, and user events</p>
                
                {recentActivities.length === 0 ? (
                  <p className="text-muted small italic text-center py-4">No system activity events recorded.</p>
                ) : (
                  <div className="d-flex flex-column gap-3 overflow-auto" style={{ maxHeight: '320px' }}>
                    {recentActivities.map((act) => {
                      let icon = 'bi-activity text-secondary bg-secondary-subtle';
                      if (act.text.includes('status')) icon = 'bi-arrow-left-right text-warning bg-warning-subtle';
                      if (act.text.includes('assigned')) icon = 'bi-person-plus-fill text-info bg-info-subtle';
                      if (act.text.includes('rating') || act.text.includes('stars')) icon = 'bi-star-fill text-success bg-success-subtle';
                      if (act.text.includes('chat') || act.text.includes('message')) icon = 'bi-chat-dots-fill text-primary bg-primary-subtle';

                      return (
                        <div key={act._id} className="d-flex align-items-start gap-3 border-bottom border-light-subtle pb-2.5">
                          <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0`} style={{ width: '32px', height: '32px', padding: '1px' }}>
                            <span className={`badge rounded-circle p-2 ${icon.split(' ')[1]}`}>
                              <i className={`bi ${icon.split(' ')[0]} fs-7 ${icon.split(' ')[2]}`}></i>
                            </span>
                          </div>
                          <div className="flex-grow-1">
                            <p className="small text-dark mb-0 fw-medium" style={{ fontSize: '12px' }}>
                              {act.link ? <Link to={act.link} className="text-decoration-none text-reset">{act.text}</Link> : act.text}
                            </p>
                            <small className="text-muted d-block" style={{ fontSize: '9px' }}>
                              {new Date(act.createdAt).toLocaleString()}
                            </small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Standard Complaints Search and Table view */}
          <div className="card border-0 shadow-sm mb-4 rounded-3 bg-white p-4">
            <h5 className="fw-bold mb-3 text-dark">Search Complaint System</h5>
            <div className="row g-3">
              <div className="col-lg-3 col-md-6">
                <label className="form-label small fw-semibold text-muted">Search Tickets</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 bg-light"
                    placeholder="ID or title keywords..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-lg-2 col-md-6 col-sm-4">
                <label className="form-label small fw-semibold text-muted">Status</label>
                <select className="form-select bg-light" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div className="col-lg-2 col-md-6 col-sm-4">
                <label className="form-label small fw-semibold text-muted">Category</label>
                <select className="form-select bg-light" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  <option value="Technical">Technical</option>
                  <option value="Billing">Billing</option>
                  <option value="Service">Service</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="col-lg-2 col-md-6 col-sm-4">
                <label className="form-label small fw-semibold text-muted">Priority</label>
                <select className="form-select bg-light" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">Active System Complaints</h5>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : complaints.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-inbox text-muted display-4"></i>
                  <p className="text-muted mt-2 mb-0">No complaints found matching criteria.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Ticket ID</th>
                        <th>Category</th>
                        <th>Subject</th>
                        <th>Filer</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Assigned Agent</th>
                        <th>Date Filed</th>
                        <th className="text-center pe-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.map((complaint) => (
                        <tr key={complaint._id}>
                          <td className="ps-4 fw-semibold">{complaint.ticketId}</td>
                          <td>
                            <span className="badge bg-light text-dark border px-2 py-1.5">{complaint.category}</span>
                          </td>
                          <td className="text-truncate" style={{ maxWidth: '200px' }} title={complaint.title}>
                            {complaint.title}
                          </td>
                          <td>
                            <span className="d-block fw-semibold">{complaint.user?.name}</span>
                            <small className="text-muted">{complaint.user?.email}</small>
                          </td>
                          <td>{getPriorityBadge(complaint.priority)}</td>
                          <td>{getStatusBadge(complaint.status)}</td>
                          <td>
                            {complaint.assignedTo ? (
                              <span className="text-dark small fw-semibold">
                                <i className="bi bi-person-badge text-primary me-1"></i>
                                {complaint.assignedTo.name}
                              </span>
                            ) : (
                              <span className="text-muted small italic">Unassigned</span>
                            )}
                          </td>
                          <td>{new Date(complaint.createdAt).toLocaleDateString()}</td>
                          <td className="text-center pe-4">
                            <div className="btn-group">
                              <Link to={`/complaints/${complaint._id}`} className="btn btn-sm btn-outline-primary">
                                View
                              </Link>
                              <Link to={`/complaints/${complaint._id}/edit`} className="btn btn-sm btn-outline-secondary">
                                Edit
                              </Link>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(complaint._id)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
