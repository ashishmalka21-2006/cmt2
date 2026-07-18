import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import complaintService from '../services/complaintService';
import chatService from '../services/chatService';
import feedbackService from '../services/feedbackService';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

const ComplaintDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);

  // Notes state
  const [noteText, setNoteText] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [chatSubmitting, setChatSubmitting] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Feedback state
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comments, setComments] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const fetchComplaintDetails = async () => {
    setLoading(true);
    try {
      const data = await complaintService.getComplaintById(id);
      setComplaint(data.complaint);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch complaint details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaintDetails();
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;

    const fetchChatHistory = async () => {
      setMessagesLoading(true);
      try {
        const data = await chatService.getChatMessages(id);
        setMessages(data.messages || []);
      } catch (error) {
        console.error('Failed to fetch chat logs:', error);
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchChatHistory();

    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.io connected:', socket.id);
      socket.emit('join_room', id);
    });

    socket.on('receive_message', (message) => {
      setMessages((prev) => {
        if (prev.some((msg) => msg._id === message._id)) return prev;
        return [...prev, message];
      });
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [id, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatText.trim() || chatSubmitting) return;

    const messageToSend = chatText.trim();
    setChatText('');
    setChatSubmitting(true);

    try {
      await chatService.sendChatMessage(id, messageToSend);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
      setChatText(messageToSend);
    } finally {
      setChatSubmitting(false);
    }
  };

  useEffect(() => {
    if (!complaint) return;
    
    const isResolvedOrClosed = complaint.status === 'Resolved' || complaint.status === 'Closed';
    if (!isResolvedOrClosed) {
      setFeedbackLoading(false);
      return;
    }

    const fetchFeedback = async () => {
      setFeedbackLoading(true);
      try {
        const data = await feedbackService.getFeedbackForComplaint(complaint._id);
        setFeedback(data.feedback || null);
      } catch (err) {
        console.error('Failed to fetch feedback:', err);
      } finally {
        setFeedbackLoading(false);
      }
    };

    fetchFeedback();
  }, [complaint]);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a star rating.');
      return;
    }
    setFeedbackSubmitting(true);
    try {
      const data = await feedbackService.submitFeedback(id, rating, comments);
      setFeedback(data.feedback);
      toast.success('Thank you! Your feedback has been submitted.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this complaint ticket? This action is permanent.')) {
      try {
        await complaintService.deleteComplaint(id);
        toast.success('Complaint deleted successfully');
        navigate('/dashboard');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete complaint');
      }
    }
  };

  const handleQuickAction = async (fields) => {
    try {
      const data = await complaintService.updateComplaint(id, fields);
      setComplaint(data.complaint);
      toast.success(data.message || 'Ticket status updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update ticket status');
    }
  };

  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setNoteSubmitting(true);

    try {
      const data = await complaintService.addNote(id, noteText);
      setComplaint(data.complaint);
      setNoteText('');
      toast.success('Progress note recorded successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add progress note');
    } finally {
      setNoteSubmitting(false);
    }
  };

  const getStatusBadge = (statusValue) => {
    switch (statusValue) {
      case 'Pending':
        return <span className="badge bg-secondary px-3 py-2 fs-6 rounded-pill">Pending</span>;
      case 'Assigned':
        return <span className="badge bg-info text-dark px-3 py-2 fs-6 rounded-pill">Assigned</span>;
      case 'In Progress':
        return <span className="badge bg-warning text-dark px-3 py-2 fs-6 rounded-pill">In Progress</span>;
      case 'Resolved':
        return <span className="badge bg-success px-3 py-2 fs-6 rounded-pill">Resolved</span>;
      case 'Closed':
        return <span className="badge bg-dark px-3 py-2 fs-6 rounded-pill">Closed</span>;
      default:
        return <span className="badge bg-light text-dark px-3 py-2 fs-6">{statusValue}</span>;
    }
  };

  const getPriorityBadge = (priorityValue) => {
    switch (priorityValue) {
      case 'High':
        return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2.5 py-1.5 fs-7 rounded">High</span>;
      case 'Medium':
        return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2.5 py-1.5 fs-7 rounded">Medium</span>;
      case 'Low':
        return <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1.5 fs-7 rounded">Low</span>;
      default:
        return <span className="badge bg-light text-dark px-2.5 py-1.5 fs-7 rounded">{priorityValue}</span>;
    }
  };

  const getAttachmentUrl = (filePath) => {
    const apiBaseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${apiBaseUrl}/${filePath}`;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50 py-5">
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="alert alert-danger text-center py-5">
        <i className="bi bi-exclamation-triangle-fill display-4 text-danger mb-3"></i>
        <h4>Complaint Details Not Found</h4>
        <p className="text-muted">The requested ticket does not exist or you lack authorization to view it.</p>
        <Link to="/dashboard" className="btn btn-primary mt-3">Back to Dashboard</Link>
      </div>
    );
  }

  const statusSteps = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
  const currentStepIndex = statusSteps.indexOf(complaint.status);

  // Check if assignedTo matches logged in user ID
  const assignedAgentId = complaint.assignedTo?._id || complaint.assignedTo;
  const isAssignedToMe = assignedAgentId === user._id;

  return (
    <div className="py-2">
      {/* Back Button */}
      <div className="mb-4">
        <Link to="/dashboard" className="text-muted text-decoration-none small fw-semibold d-inline-flex align-items-center">
          <i className="bi bi-arrow-left me-1"></i> Back to Dashboard
        </Link>
      </div>

      {/* Main Grid */}
      <div className="row g-4">
        {/* Left Column: Complaint details */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4">
            <div className="card-body">
              {/* Ticket header */}
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center pb-3 border-bottom mb-4 gap-2">
                <div>
                  <span className="text-muted small fw-bold">Ticket ID: {complaint.ticketId}</span>
                  <h3 className="fw-bold mt-1 text-dark mb-0">{complaint.title}</h3>
                </div>
                <div className="mt-1 mt-sm-0">{getStatusBadge(complaint.status)}</div>
              </div>

              {/* Metadata row */}
              <div className="row g-3 mb-4 bg-light p-3 rounded">
                <div className="col-sm-4 col-6">
                  <span className="text-muted small d-block">Category</span>
                  <span className="fw-semibold text-dark">{complaint.category}</span>
                </div>
                <div className="col-sm-4 col-6">
                  <span className="text-muted small d-block">Priority</span>
                  <div>{getPriorityBadge(complaint.priority)}</div>
                </div>
                <div className="col-sm-4 col-12">
                  <span className="text-muted small d-block">Date Filed</span>
                  <span className="fw-semibold text-dark">{new Date(complaint.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <h5 className="fw-bold mb-3 text-dark">Complaint Description</h5>
                <p className="text-muted" style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                  {complaint.description}
                </p>
              </div>

              {/* Attachments */}
              {complaint.attachments && complaint.attachments.length > 0 && (
                <div className="mb-4">
                  <h5 className="fw-bold mb-3 text-dark">Attachments ({complaint.attachments.length})</h5>
                  <div className="row g-2">
                    {complaint.attachments.map((file, idx) => {
                      const isImage = /\.(jpg|jpeg|png)$/i.test(file);
                      return (
                        <div key={idx} className="col-md-6 col-12">
                          <a
                            href={getAttachmentUrl(file)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-decoration-none"
                          >
                            <div className="d-flex align-items-center p-2 rounded border border-light bg-light-subtle hover-bg-light transition-all">
                              {isImage ? (
                                <i className="bi bi-file-earmark-image text-danger fs-4 me-3"></i>
                              ) : (
                                <i className="bi bi-file-earmark-text text-primary fs-4 me-3"></i>
                              )}
                              <span className="text-truncate text-muted small fw-semibold flex-grow-1" title={file}>
                                {file.replace('uploads/', '').replace(/^\d+-/, '')}
                              </span>
                              <i className="bi bi-download text-muted ms-2"></i>
                            </div>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Associated Parties */}
              <div className="row g-3 border-top pt-4 mt-4">
                <div className="col-sm-6">
                  <h6 className="fw-bold text-dark small text-uppercase text-muted mb-2">Submitted By:</h6>
                  <div className="d-flex align-items-center">
                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '36px', height: '36px' }}>
                      <i className="bi bi-person"></i>
                    </div>
                    <div>
                      <span className="fw-semibold d-block text-dark small">{complaint.user?.name}</span>
                      <small className="text-muted fs-8">{complaint.user?.email}</small>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <h6 className="fw-bold text-dark small text-uppercase text-muted mb-2">Assigned Agent:</h6>
                  {complaint.assignedTo ? (
                    <div className="d-flex align-items-center">
                      <div className="bg-info text-dark rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '36px', height: '36px' }}>
                        <i className="bi bi-person-badge"></i>
                      </div>
                      <div>
                        <span className="fw-semibold d-block text-dark small">{complaint.assignedTo.name}</span>
                        <small className="text-muted fs-8">{complaint.assignedTo.email}</small>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted italic small d-block mt-1">Pending allocation to an agent.</span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="d-flex justify-content-end gap-2 border-top pt-4 mt-4">
                {(user?.role === 'Admin' || (user?.role === 'User' && complaint.status === 'Pending')) && (
                  <button className="btn btn-outline-danger px-3" onClick={handleDelete}>
                    <i className="bi bi-trash me-1"></i> Delete Ticket
                  </button>
                )}
                {(user?.role !== 'User' || complaint.status === 'Pending') && (
                  <Link to={`/complaints/${complaint._id}/edit`} className="btn btn-outline-secondary px-4">
                    <i className="bi bi-pencil me-1"></i> Edit Ticket
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tracking Timeline, notes log, and actions */}
        <div className="col-lg-5">
          {/* Management Quick Actions (for Agents/Admins) */}
          {(user?.role === 'Agent' || user?.role === 'Admin') && (
            <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4 border-start border-primary border-4">
              <div className="card-body p-1">
                <h5 className="fw-bold mb-2 text-dark">Management Panel</h5>
                <p className="text-muted small mb-3">Execute status updates directly for this complaint.</p>
                
                <div className="d-flex flex-column gap-2">
                  {/* Case 1: Unassigned ticket */}
                  {!complaint.assignedTo && (
                    <button
                      className="btn btn-primary d-flex align-items-center justify-content-center shadow-sm"
                      onClick={() => handleQuickAction({ assignedTo: user._id })}
                    >
                      <i className="bi bi-person-plus-fill me-2"></i> Assign to Me
                    </button>
                  )}

                  {/* Case 2: Assigned, status is Assigned */}
                  {isAssignedToMe && complaint.status === 'Assigned' && (
                    <button
                      className="btn btn-warning text-dark d-flex align-items-center justify-content-center"
                      onClick={() => handleQuickAction({ status: 'In Progress' })}
                    >
                      <i className="bi bi-play-fill me-2"></i> Start Work (In Progress)
                    </button>
                  )}

                  {/* Case 3: Assigned to me, status is In Progress */}
                  {isAssignedToMe && complaint.status === 'In Progress' && (
                    <button
                      className="btn btn-success d-flex align-items-center justify-content-center"
                      onClick={() => handleQuickAction({ status: 'Resolved' })}
                    >
                      <i className="bi bi-check-circle-fill me-2"></i> Resolve Complaint
                    </button>
                  )}

                  {/* Case 4: Resolved ticket, and user is Admin (to close it) */}
                  {complaint.status === 'Resolved' && user?.role === 'Admin' && (
                    <button
                      className="btn btn-dark d-flex align-items-center justify-content-center"
                      onClick={() => handleQuickAction({ status: 'Closed' })}
                    >
                      <i className="bi bi-lock-fill me-2"></i> Close Ticket
                    </button>
                  )}
                  
                  {/* If assigned to someone else, allow re-assignment to me */}
                  {complaint.assignedTo && !isAssignedToMe && (
                    <button
                      className="btn btn-outline-primary d-flex align-items-center justify-content-center"
                      onClick={() => handleQuickAction({ assignedTo: user._id })}
                    >
                      <i className="bi bi-person-check-fill me-2"></i> Claim Assignment
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tracking Timeline */}
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4">
            <div className="card-body">
              <h5 className="fw-bold mb-4 text-dark">Ticket Status Tracking</h5>
              
              <div className="position-relative ps-4 ms-2">
                {/* Vertical timeline connector */}
                <div className="position-absolute top-0 start-0 h-100 bg-light-subtle border-start border-2" style={{ transform: 'translateX(-1px)' }}></div>
                
                {statusSteps.map((step, idx) => {
                  const isCompleted = idx <= currentStepIndex;
                  const isActive = idx === currentStepIndex;

                  return (
                    <div key={idx} className="position-relative mb-4">
                      {/* Timeline dot */}
                      <div
                        className="position-absolute top-0 start-0 translate-middle rounded-circle d-flex align-items-center justify-content-center"
                        style={{
                          width: '24px',
                          height: '24px',
                          left: '-24px',
                          backgroundColor: isActive
                            ? '#3b82f6'
                            : isCompleted
                            ? '#10b981'
                            : '#e2e8f0',
                          color: isCompleted ? '#ffffff' : '#cbd5e1',
                          border: isActive ? '3px solid #dbeafe' : 'none',
                        }}
                      >
                        {isCompleted && !isActive ? (
                          <i className="bi bi-check-lg small"></i>
                        ) : (
                          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{idx + 1}</span>
                        )}
                      </div>
                      
                      {/* Timeline step content */}
                      <div>
                        <h6 className={`mb-1 fw-bold ${isActive ? 'text-primary' : isCompleted ? 'text-success' : 'text-muted'}`}>
                          {step}
                        </h6>
                        <small className="text-muted">
                          {isActive
                            ? 'Currently in this stage.'
                            : isCompleted
                            ? 'Completed.'
                            : 'Pending action.'}
                        </small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Support Progress Notes (Timeline log) */}
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4">
            <div className="card-body p-1">
              <h5 className="fw-bold mb-3 text-dark">Support Progress Notes</h5>
              
              {/* Add Note Form (for Admin/Agent) */}
              {(user?.role === 'Agent' || user?.role === 'Admin') && (
                <form onSubmit={handleNoteSubmit} className="mb-4 pb-3 border-bottom">
                  <div className="mb-2">
                    <textarea
                      className="form-control bg-light"
                      rows="2"
                      placeholder="Add progress note details..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  <div className="text-end">
                    <button type="submit" className="btn btn-sm btn-primary px-3 fw-semibold" disabled={noteSubmitting}>
                      {noteSubmitting ? 'Submitting...' : 'Add Log Note'}
                    </button>
                  </div>
                </form>
              )}

              {/* Notes Timeline List */}
              {!complaint.notes || complaint.notes.length === 0 ? (
                <p className="text-muted small mb-0 italic">No notes logged for this complaint yet.</p>
              ) : (
                <div className="notes-timeline" style={{ maxH: '300px', overflowY: 'auto' }}>
                  {complaint.notes.map((note, idx) => (
                    <div key={idx} className="mb-3 border-bottom pb-2">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong className="small text-dark">
                          <i className="bi bi-person-fill text-muted me-1"></i>
                          {note.addedBy?.name || 'Staff'}
                        </strong>
                        <small className="text-muted" style={{ fontSize: '10px' }}>
                          {new Date(note.createdAt).toLocaleString()}
                        </small>
                      </div>
                      <p className="small text-muted mb-0">{note.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Real-time Resolution Chat */}
          {(() => {
            const isAdmin = user?.role === 'Admin';
            const isOwner = complaint.user?._id === user?._id || complaint.user === user?._id;
            const assignedAgentId = complaint.assignedTo?._id || complaint.assignedTo;
            const isAssignedAgent = assignedAgentId === user?._id;
            const isAuthorized = isAdmin || isOwner || isAssignedAgent;

            if (!isAuthorized) {
              return (
                <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4">
                  <div className="card-body py-4 text-center">
                    <div className="bg-danger-subtle text-danger rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                      <i className="bi bi-shield-lock-fill fs-3"></i>
                    </div>
                    <h6 className="fw-bold text-dark mb-1">Access Restricted</h6>
                    <p className="text-muted small mb-0">
                      You are not authorized to view the chat for this ticket.
                    </p>
                  </div>
                </div>
              );
            }

            const isClosed = complaint.status === 'Closed';
            const isUnassigned = !complaint.assignedTo;

            return (
              <div className="card border-0 shadow-sm rounded-4 bg-white mb-4 d-flex flex-column overflow-hidden" style={{ minHeight: '450px' }}>
                {/* Chat Header */}
                <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '40px', height: '40px' }}>
                      <i className="bi bi-chat-dots-fill fs-5"></i>
                    </div>
                    <div>
                      <h6 className="fw-bold text-dark mb-0">Resolution Chat</h6>
                      <small className="text-muted fs-8">
                        {isUnassigned
                          ? 'Waiting for allocation'
                          : `With ${isOwner ? (complaint.assignedTo?.name || 'Assigned Agent') : (complaint.user?.name || 'Client')}`}
                      </small>
                    </div>
                  </div>
                  <div>
                    {isClosed ? (
                      <span className="badge bg-dark-subtle text-dark border border-dark-subtle rounded-pill small">Locked</span>
                    ) : isUnassigned ? (
                      <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill small">Pending Agent</span>
                    ) : (
                      <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill small">Live</span>
                    )}
                  </div>
                </div>

                {/* Chat Messages */}
                <div
                  className="card-body p-4 bg-light-subtle d-flex flex-column"
                  style={{ height: '320px', overflowY: 'auto' }}
                >
                  {messagesLoading ? (
                    <div className="d-flex flex-grow-1 justify-content-center align-items-center">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading chat logs...</span>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="d-flex flex-column flex-grow-1 justify-content-center align-items-center text-center p-4">
                      <i className="bi bi-chat-left-quote text-muted fs-1 mb-2 opacity-50"></i>
                      <p className="text-muted small mb-0">No messages yet.</p>
                      {isUnassigned ? (
                        <p className="text-muted fs-8 mt-1">Once an agent is assigned, real-time resolution chat will begin.</p>
                      ) : (
                        <p className="text-muted fs-8 mt-1">Send a message to start the conversation.</p>
                      )}
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {messages.map((msg) => {
                        const isMe = msg.sender?._id === user?._id || msg.sender === user?._id;
                        const senderName = msg.sender?.name || (isMe ? 'You' : 'Staff');
                        const senderRole = msg.sender?.role || (isMe ? user?.role : '');
                        
                        return (
                          <div
                            key={msg._id}
                            className={`d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}`}
                          >
                            <div className="d-flex align-items-center mb-1 gap-1">
                              <span className="fw-semibold text-dark" style={{ fontSize: '11px' }}>
                                {senderName}
                              </span>
                              {senderRole && senderRole !== 'User' && (
                                <span
                                  className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill"
                                  style={{ fontSize: '9px', padding: '1px 5px' }}
                                >
                                  {senderRole}
                                </span>
                              )}
                            </div>
                            <div
                              className={`p-3 rounded-4 shadow-sm text-break ${
                                isMe
                                  ? 'bg-primary text-white'
                                  : 'bg-white text-dark border border-light-subtle'
                              }`}
                              style={{
                                maxWidth: '85%',
                                fontSize: '13.5px',
                                borderTopRightRadius: isMe ? '0px' : '16px',
                                borderTopLeftRadius: isMe ? '16px' : '0px',
                              }}
                            >
                              {msg.message}
                            </div>
                            <span className="text-muted mt-1" style={{ fontSize: '9px' }}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Chat Input Footer */}
                <div className="card-footer bg-white border-top p-3">
                  <form onSubmit={handleChatSubmit} className="d-flex gap-2 align-items-center">
                    <input
                      type="text"
                      className="form-control rounded-pill border-light-subtle bg-light px-3 py-2 small"
                      style={{ fontSize: '14px' }}
                      placeholder={
                        isClosed
                          ? 'This ticket is closed. Chat is locked.'
                          : isUnassigned
                          ? 'Waiting for agent to claim ticket...'
                          : 'Type your message...'
                      }
                      value={chatText}
                      onChange={(e) => setChatText(e.target.value)}
                      disabled={isClosed || isUnassigned || messagesLoading || chatSubmitting}
                      required
                    />
                    <button
                      type="submit"
                      className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
                      style={{ width: '38px', height: '38px', transition: 'all 0.2s' }}
                      disabled={isClosed || isUnassigned || !chatText.trim() || chatSubmitting}
                    >
                      {chatSubmitting ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        <i className="bi bi-send-fill text-white fs-6"></i>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            );
          })()}

          {/* Support Feedback Module */}
          {(complaint.status === 'Resolved' || complaint.status === 'Closed') && (
            <div className="card border-0 shadow-sm rounded-4 bg-white p-4 border border-success-subtle mb-4">
              {feedbackLoading ? (
                <div className="py-4 text-center">
                  <div className="spinner-border spinner-border-sm text-success" role="status">
                    <span className="visually-hidden">Loading feedback...</span>
                  </div>
                </div>
              ) : feedback ? (
                /* Feedback View (Already Submitted) */
                <div className="card-body p-0">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-success-subtle text-success rounded-circle d-inline-flex align-items-center justify-content-center me-3" style={{ width: '48px', height: '48px' }}>
                      <i className="bi bi-patch-check-fill fs-4"></i>
                    </div>
                    <div>
                      <h5 className="fw-bold text-dark mb-0">Support Rating Logged</h5>
                      <small className="text-muted fs-8">Submitted by client</small>
                    </div>
                  </div>

                  <div className="mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <i
                        key={star}
                        className={`bi ${star <= feedback.rating ? 'bi-star-fill text-warning' : 'bi-star text-muted'} fs-4 me-1`}
                      ></i>
                    ))}
                    <span className="ms-2 fw-semibold text-dark" style={{ fontSize: '14px' }}>
                      {(() => {
                        const ratingsText = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
                        return ratingsText[feedback.rating - 1];
                      })()}
                    </span>
                  </div>

                  {feedback.comments && (
                    <div className="bg-light p-3 rounded-3 mt-3">
                      <strong className="text-muted small d-block mb-1">User Comment:</strong>
                      <p className="small text-dark mb-0" style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                        {feedback.comments}
                      </p>
                    </div>
                  )}

                  <small className="text-muted d-block mt-3" style={{ fontSize: '10px' }}>
                    <i className="bi bi-clock me-1"></i>
                    Submitted on {new Date(feedback.createdAt).toLocaleString()}
                  </small>
                </div>
              ) : (
                /* Feedback Form (To be Submitted by Owner) */
                (() => {
                  const isOwner = complaint.user?._id === user?._id || complaint.user === user?._id;
                  if (!isOwner) {
                    return (
                      <div className="card-body py-3 text-center">
                        <i className="bi bi-star-half text-muted display-6 opacity-50 mb-2 d-block"></i>
                        <h6 className="fw-bold text-dark mb-1">No Feedback Logged</h6>
                        <p className="text-muted small mb-0">
                          The client has not yet submitted feedback for this ticket.
                        </p>
                      </div>
                    );
                  }

                  const ratingDescriptions = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

                  return (
                    <div className="card-body p-0">
                      <h5 className="fw-bold text-dark mb-2">Submit Support Feedback</h5>
                      <p className="text-muted small mb-4">
                        We value your input. Please rate your experience with resolving this ticket.
                      </p>

                      <form onSubmit={handleFeedbackSubmit}>
                        {/* Interactive Stars */}
                        <div className="mb-4 text-center text-sm-start d-flex align-items-center flex-wrap gap-2">
                          <div className="d-inline-block">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                type="button"
                                key={star}
                                className="btn p-0 border-0 bg-transparent text-decoration-none"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                style={{ outline: 'none' }}
                              >
                                <i
                                  className={`bi ${
                                    star <= (hoverRating || rating) ? 'bi-star-fill text-warning' : 'bi-star text-muted'
                                  } fs-3 me-1.5 transition-all`}
                                  style={{ transform: star <= (hoverRating || rating) ? 'scale(1.1)' : 'scale(1.0)', cursor: 'pointer' }}
                                ></i>
                              </button>
                            ))}
                          </div>
                          {rating > 0 && (
                            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-3 py-1.5 fw-bold fs-7">
                              {ratingDescriptions[rating - 1]}
                            </span>
                          )}
                        </div>

                        {/* Comments Textarea */}
                        <div className="mb-3">
                          <label className="form-label text-muted small fw-semibold">Share details about your experience (optional)</label>
                          <textarea
                            className="form-control bg-light border-light-subtle rounded-3 p-3 small"
                            rows="3"
                            placeholder="Tell us what went well, or how we can improve..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            maxLength="500"
                            style={{ fontSize: '13.5px' }}
                          ></textarea>
                          <div className="text-end text-muted fs-8 mt-1">
                            {comments.length}/500 characters
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="text-end">
                          <button
                            type="submit"
                            className="btn btn-success px-4 py-2 rounded-pill fw-semibold shadow-sm text-white"
                            disabled={rating === 0 || feedbackSubmitting}
                          >
                            {feedbackSubmitting ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Submitting...
                              </>
                            ) : (
                              'Submit Rating'
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetails;
