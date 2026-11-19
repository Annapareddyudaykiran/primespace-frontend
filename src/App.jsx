import { useCallback, useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const PAGE_LIST = [
  ["dashboard", "Dashboard", "▦"], ["property", "Property & Organisation", "⌂"],
  ["users", "Users, Roles & Permissions", "♙"], ["helpdesk", "Helpdesk", "◉"],
  ["workorders", "Work Orders", "▤"], ["workforce", "Workforce & Attendance", "♟"],
  ["myatt", "My Attendance", "⏱"], ["assets", "Assets & PPM", "▣"],
  ["inventory", "Inventory", "▥"], ["procurement", "Procurement", "▢"],
  ["vendors", "Vendors & AMC", "◇"], ["hse", "HSE & Safety", "✚"],
  ["visitors", "Visitors", "☺"], ["meters", "Utilities & Meters", "⚡"],
  ["inspections", "Inspections", "☑"], ["compliance", "Compliance & Licences", "✔"],
  ["audit", "Audit Log", "☰"], ["reports", "Reports", "▧"],
  ["integrations", "Integrations & Edge", "⌘"], ["settings", "Settings", "⚙"],
];

const ALL = PAGE_LIST.map(([id]) => id).filter((id) => id !== "myatt");
const ROLE_PAGES = {
  "Super Admin": ALL,
  "Property Manager": ALL.filter((page) => !["users", "settings"].includes(page)),
  "Helpdesk Executive": ["dashboard", "helpdesk", "workorders", "assets", "reports", "visitors"],
  Supervisor: ["dashboard", "helpdesk", "workorders", "workforce", "assets", "inventory", "procurement", "hse", "reports", "visitors", "meters", "inspections", "compliance"],
  Technician: ["dashboard", "workorders", "assets", "inventory", "inspections", "meters", "myatt"],
  "Client User": ["dashboard", "helpdesk"],
};

const MODULES = {
  property: { title: "Property & Organisation", description: "Client → Property → Tower → Floor. Locations feed tickets, assets and work orders.", path: "/properties", columns: [["Property", "name"], ["City", "city"], ["Built-up area (sq.ft.)", "area"]], fields: [["name", "Property name", "text", true], ["city", "City"], ["area", "Built-up area (sq.ft.)", "number"]] },
  users: { title: "Users, Roles & Permissions", description: "A user has a login account. An employee is a workforce record. A role controls module access.", path: "/users", columns: [["Name", "name"], ["Login ID", "login"], ["Role", "role"], ["Scope", "scope"], ["Status", "status"]], fields: [["name", "Full name", "text", true], ["login", "Login ID (email)", "email", true], ["password", "Initial password (12+ characters)", "password", false], ["role", "Role", "select", true, ["Super Admin", "Property Manager", "Helpdesk Executive", "Supervisor", "Technician", "Client User"]], ["scope", "Property name or All properties"], ["status", "Status", "select", false, ["Active", "Disabled"]]] },
  helpdesk: { title: "Helpdesk", description: "Requester → Helpdesk Executive → Technician. Track tickets, comments and assignment history.", path: "/tickets", columns: [["Ticket", "id", "T-"], ["Title", "title"], ["Requester", "requester"], ["Location", "location"], ["Category", "category"], ["Priority", "priority"], ["Status", "status"], ["Assignee", "assignee"]], fields: [["title", "Title", "text", true], ["category", "Category", "select", true, ["HVAC", "Electrical", "Plumbing", "Civil", "Housekeeping", "Other"]], ["priority", "Priority", "select", true, ["Low", "Medium", "High", "Critical"]], ["propertyId", "Property ID (UUID)", "text", true], ["buildingId", "Tower / building ID (UUID)", "text"], ["floorId", "Floor ID (UUID)", "text"], ["assetId", "Asset ID (UUID)", "text"], ["assigneeId", "Assignee user ID (UUID)", "text"], ["description", "Description", "textarea", true]] },
  workorders: { title: "Work Orders", description: "New → Assigned → Accepted → In Progress → Awaiting Material → Completed → Verified → Closed.", path: "/work-orders", columns: [["WO", "id", "WO-"], ["Title", "title"], ["Ticket", "ticketId", "T-"], ["Asset", "asset"], ["Location", "location"], ["Technician", "technician"], ["Priority", "priority"], ["Status", "status"]], fields: [["title", "Work description", "text", true], ["ticketId", "Ticket ID (UUID)", "text"], ["propertyId", "Property ID (UUID)", "text"], ["buildingId", "Tower / building ID (UUID)", "text"], ["floorId", "Floor ID (UUID)", "text"], ["assetId", "Asset ID (UUID)", "text"], ["technicianId", "Technician employee ID (UUID)", "text"], ["priority", "Priority", "select", true, ["Low", "Medium", "High", "Critical"]], ["dueDate", "Due date", "date"], ["notes", "Work notes", "textarea"]] },
  workforce: { title: "Workforce & Attendance", description: "Manage employees, configurable shifts and attendance records.", path: "/employees", columns: [["Employee", "name"], ["Role", "jobTitle"], ["Team", "team"], ["Shift", "shiftName"], ["Status", "attendanceStatus"]], fields: [["name", "Employee name", "text", true], ["userId", "Linked user ID (UUID)", "text"], ["propertyId", "Property ID (UUID)", "text"], ["jobTitle", "Job title", "text", true], ["team", "Team"], ["shiftId", "Assigned shift ID (UUID)", "text"]] },
  assets: { title: "Assets & Preventive Maintenance", description: "Track equipment, raise faults, and schedule planned maintenance.", path: "/assets", columns: [["Code", "code"], ["Asset", "name"], ["Location", "location"], ["Status", "status"], ["Last service", "lastServiced"]], fields: [["code", "Asset code", "text", true], ["name", "Asset name", "text", true], ["propertyId", "Property ID (UUID)", "text", true], ["buildingId", "Tower ID (UUID)", "text"], ["floorId", "Floor ID (UUID)", "text"], ["status", "Status", "select", false, ["Operational", "Needs Attention", "Under Maintenance", "Out of Service"]], ["lastServiced", "Last service date", "date"]] },
  inventory: { title: "Inventory", description: "Monitor stock, issue material to work orders, receive stock and raise purchase requests.", path: "/inventory/items", columns: [["Code", "code"], ["Material", "name"], ["Available", "quantity"], ["Unit", "unit"], ["Minimum", "minimumQuantity"], ["Status", "status"]], fields: [["code", "Item code", "text", true], ["name", "Material name", "text", true], ["propertyId", "Property ID (UUID)", "text", true], ["unit", "Unit", "select", true, ["Nos", "Metres", "Litres", "Kg", "Box", "Set"]], ["quantity", "Opening quantity", "number"], ["minimumQuantity", "Minimum level", "number"]] },
  procurement: { title: "Procurement", description: "Purchase request → approval → purchase order → goods receipt → stock updated.", path: "/procurement/requests", columns: [["PR", "id", "PR-"], ["Item", "item"], ["Quantity", "quantity"], ["Requested by", "requestedBy"], ["Vendor / PO", "purchaseOrderNumber"], ["Status", "status"]], fields: [["propertyId", "Property ID (UUID)", "text", true], ["item", "Item", "text", true], ["quantity", "Quantity", "number", true], ["unit", "Unit", "text"], ["reason", "Reason / note", "textarea"]] },
  vendors: { title: "Vendors & AMC", description: "Service providers, contract expiry and renewals.", path: "/vendors", columns: [["Vendor", "name"], ["Service", "service"], ["Contact", "contact"], ["AMC expiry", "expiryDate"], ["Status", "status"]], fields: [["name", "Vendor name", "text", true], ["service", "Service"], ["contact", "Contact"], ["expiryDate", "AMC expiry", "date"]] },
  hse: { title: "HSE & Safety", description: "Incident → severity → owner → corrective action → verification → closure.", path: "/hse/incidents", columns: [["Incident", "title"], ["Severity", "severity"], ["Location", "location"], ["Owner", "owner"], ["Date", "incidentDate"], ["Status", "status"]], fields: [["title", "Incident title", "text", true], ["severity", "Severity", "select", true, ["Low", "Medium", "High", "Critical"]], ["propertyId", "Property ID (UUID)", "text", true], ["buildingId", "Tower ID (UUID)", "text"], ["floorId", "Floor ID (UUID)", "text"], ["ownerId", "Owner employee ID (UUID)", "text"], ["incidentDate", "Date", "date", true], ["correctiveAction", "Corrective / preventive action", "textarea"]] },
  visitors: { title: "Visitors", description: "Register and track visitor visits and check-in / check-out times.", path: "/visitors", columns: [["Visitor", "name"], ["Company", "company"], ["Host", "host"], ["Purpose", "purpose"], ["Status", "status"], ["Check-in", "checkedInAt"], ["Check-out", "checkedOutAt"]], fields: [["name", "Visitor name", "text", true], ["company", "Company"], ["hostId", "Host user ID (UUID)", "text"], ["purpose", "Purpose"], ["propertyId", "Property ID (UUID)", "text", true]] },
  meters: { title: "Utilities & Meters", description: "Record utility readings and review consumption by meter and location.", path: "/utility-meters", columns: [["Meter", "name"], ["Location", "location"], ["Reading", "latestReading"], ["Unit", "unit"], ["Date", "readingDate"]], fields: [["name", "Meter name", "text", true], ["propertyId", "Property ID (UUID)", "text", true], ["buildingId", "Tower ID (UUID)", "text"], ["latestReading", "Reading", "number", true], ["unit", "Unit", "text", true], ["readingDate", "Reading date", "date", true]] },
  inspections: { title: "Inspections", description: "Schedule and record operational inspections and findings.", path: "/inspections", columns: [["Inspection", "name"], ["Area", "location"], ["Inspector", "inspector"], ["Date", "inspectionDate"], ["Result", "result"]], fields: [["name", "Inspection / round", "text", true], ["propertyId", "Property ID (UUID)", "text", true], ["buildingId", "Tower ID (UUID)", "text"], ["floorId", "Floor ID (UUID)", "text"], ["inspectorId", "Inspector employee ID (UUID)", "text"], ["inspectionDate", "Date", "date", true], ["result", "Result", "select", true, ["Pending", "Passed", "Issues Found"]], ["notes", "Notes", "textarea"]] },
  compliance: { title: "Compliance & Licences", description: "Track statutory documents, authorities and expiry dates.", path: "/compliance-documents", columns: [["Document", "name"], ["Type", "documentType"], ["Authority", "authority"], ["Expiry", "expiryDate"], ["Status", "status"]], fields: [["name", "Document name", "text", true], ["documentType", "Document type", "text", true], ["authority", "Issuing authority"], ["propertyId", "Property ID (UUID)", "text", true], ["expiryDate", "Expiry date", "date", true]] },
  integrations: { title: "Integrations & Edge", description: "Register building systems, devices and external applications and track readiness.", path: "/integrations", columns: [["System", "name"], ["Protocol", "protocol"], ["Endpoint", "endpoint"], ["Status", "status"]], fields: [["name", "System name", "text", true], ["protocol", "Protocol"], ["endpoint", "Endpoint / URL", "url"], ["status", "Status", "select", true, ["Planned", "Configured", "Active", "Disabled"]]] },
};

const SPECIAL_PAGES = {
  dashboard: { title: "Dashboard", description: "Facility operations overview." },
  myatt: { title: "My Attendance", description: "Check in and out against your assigned shift." },
  audit: { title: "Audit Log", description: "Important actions, newest first.", path: "/audit-logs", columns: [["Time", "createdAt"], ["Actor", "actorName"], ["Action", "action"], ["Record", "recordType"], ["Details", "details"]] },
  reports: { title: "Reports & Analytics", description: "Live summaries from current backend records." },
  settings: { title: "Settings", description: "Account, workspace and data controls." },
};

const READ_ONLY = new Set(["audit", "reports"]);
const initials = (name = "User") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const showValue = (value) => value == null || value === "" ? "—" : String(value);

async function apiRequest(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    const message = typeof payload === "object" && payload ? payload.message || payload.detail : payload;
    throw new Error(message || `Request failed (${response.status})`);
  }
  return payload;
}

function responseRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function mergeAccessRequests(requests, users) {
  const combined = new Map((requests || []).map((request) => [String(request.id), request]));
  (users || []).filter((user) => user.status === "Pending Approval" || user.status === "PENDING").forEach((user) => {
    const id = String(user.id);
    if (!combined.has(id)) combined.set(id, {
      id: user.id, name: user.name, email: user.login, requestedRole: user.requestedRole || "Role request",
    });
  });
  return [...combined.values()];
}

function App() {
  const [auth, setAuth] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [pageData, setPageData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [roleRows, setRoleRows] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [accessRequestError, setAccessRequestError] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [clientTicketOpen, setClientTicketOpen] = useState(false);
  const [viewingTicket, setViewingTicket] = useState(null);
  const [ticketLocations, setTicketLocations] = useState([]);
  const [ticketOptionsError, setTicketOptionsError] = useState("");
  const [signupNotice, setSignupNotice] = useState("");

  const user = auth?.user;
  const userName = user?.name || user?.fullName || user?.displayName || user?.email || "User";
  const role = user?.role || "";
  const allowedPages = auth?.modules || ROLE_PAGES[role] || [];
  const pageEntry = PAGE_LIST.find(([id]) => id === page);
  const config = MODULES[page] || SPECIAL_PAGES[page] || { title: pageEntry?.[1] || "PrimeSpace", description: "" };
  const canCreate = !READ_ONLY.has(page) && !["myatt", "settings"].includes(page) && page !== "dashboard";

  const notify = useCallback((message, isError = false) => {
    setToast({ message, isError });
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const loadPage = useCallback(async (activePage = page, activeAuth = auth) => {
    if (!activeAuth?.token) return;
    if (activePage === "dashboard") {
      setLoading(true); setLoadError("");
      try { setSummary(await apiRequest("/dashboard/summary", { token: activeAuth.token })); }
      catch (error) { setLoadError(error.message); }
      finally { setLoading(false); }
      return;
    }
    if (activePage === "myatt") {
      setLoading(true); setLoadError("");
      try { setPageData(responseRows(await apiRequest("/attendance/me", { token: activeAuth.token }))); }
      catch (error) { setLoadError(error.message); }
      finally { setLoading(false); }
      return;
    }
    if (activePage === "reports") {
      setLoading(true); setLoadError("");
      try { setSummary(await apiRequest("/reports/summary", { token: activeAuth.token })); }
      catch (error) { setLoadError(error.message); }
      finally { setLoading(false); }
      return;
    }
    if (activePage === "helpdesk" && activeAuth.user?.role === "Client User") {
      setLoading(true); setLoadError(""); setTicketOptionsError("");
      const [ticketsResult, optionsResult] = await Promise.allSettled([
        apiRequest("/tickets", { token: activeAuth.token }),
        apiRequest("/tickets/options", { token: activeAuth.token }),
      ]);
      if (ticketsResult.status === "fulfilled") setPageData(responseRows(ticketsResult.value));
      else { setPageData([]); setLoadError(ticketsResult.reason.message); }
      if (optionsResult.status === "fulfilled") setTicketLocations(responseRows(optionsResult.value?.locations));
      else { setTicketLocations([]); setTicketOptionsError(optionsResult.reason.message); }
      setLoading(false);
      return;
    }
    if (activePage === "users") {
      setLoading(true); setLoadError("");
      const [usersResult, rolesResult, requestsResult] = await Promise.allSettled([
        apiRequest("/users", { token: activeAuth.token }),
        apiRequest("/roles", { token: activeAuth.token }),
        apiRequest("/users/access-requests", { token: activeAuth.token }),
      ]);
      const loadedUsers = usersResult.status === "fulfilled" ? responseRows(usersResult.value) : [];
      const loadedRequests = requestsResult.status === "fulfilled" ? responseRows(requestsResult.value) : [];
      if (usersResult.status === "fulfilled") {
        setPageData(loadedUsers); setLoadError("");
      } else {
        setPageData([]); setLoadError(usersResult.reason.message);
      }
      if (rolesResult.status === "fulfilled") setRoleRows(responseRows(rolesResult.value));
      else setRoleRows([]);
      setAccessRequests(mergeAccessRequests(loadedRequests, loadedUsers));
      setAccessRequestError(requestsResult.status === "rejected" && loadedUsers.length === 0 ? requestsResult.reason.message : "");
      setLoading(false);
      return;
    }
    if (!configFor(activePage).path) return;
    setLoading(true); setLoadError("");
    try { setPageData(responseRows(await apiRequest(configFor(activePage).path, { token: activeAuth.token }))); }
    catch (error) { setLoadError(error.message); setPageData([]); }
    finally { setLoading(false); }
  }, [auth, page]);

  useEffect(() => { if (auth) loadPage(page, auth); }, [auth, page, loadPage]);
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(null), 3200); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (!auth?.token || role !== "Super Admin") return undefined;
    let active = true;
    const refreshRequests = async () => {
      const [requestsResult, usersResult] = await Promise.allSettled([
        apiRequest("/users/access-requests", { token: auth.token }),
        apiRequest("/users", { token: auth.token }),
      ]);
      if (!active) return;
      const requestRows = requestsResult.status === "fulfilled" ? responseRows(requestsResult.value) : [];
      const userRows = usersResult.status === "fulfilled" ? responseRows(usersResult.value) : [];
      setAccessRequests(mergeAccessRequests(requestRows, userRows));
      setAccessRequestError(requestsResult.status === "rejected" && usersResult.status === "rejected"
        ? requestsResult.reason.message : "");
    };
    refreshRequests();
    const timer = window.setInterval(refreshRequests, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [auth?.token, page, role]);

  async function handleLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoginBusy(true);
    setAuthError("");
    setSignupNotice("");
    try {
      const result = await apiRequest("/auth/login", { method: "POST", body: { username: form.get("email"), password: form.get("password") } });
      const token = result?.accessToken || result?.token;
      const account = result?.user || result?.account;
      if (!token || !account) throw new Error("Login response did not include an access token and user profile.");
      setAuth({ token, user: account, modules: result?.modules || [] }); setPage("dashboard"); setLoadError("");
      notify(`Welcome, ${account.name || account.fullName || account.email || "user"}`);
    } catch (error) { setAuthError(error.message); }
    finally { setLoginBusy(false); }
  }

  async function handleSignup(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      setAuthError("Passwords do not match.");
      return;
    }
    setLoginBusy(true);
    setAuthError("");
    setSignupNotice("");
    try {
      const result = await apiRequest("/auth/register", {
        method: "POST",
        body: {
          name: form.get("name"),
          email: form.get("email"),
          organisationName: form.get("organisationName"),
          password: form.get("password"),
          requestedRole: form.get("requestedRole"),
        },
      });
      if (result?.pendingApproval) {
        setSignupNotice(result.message || "Your access request was sent to the organisation administrator for approval.");
        return;
      }
      const token = result?.accessToken || result?.token;
      const account = result?.user || result?.account;
      if (!token || !account) throw new Error("Registration succeeded without an access token and user profile.");
      const requestedRole = form.get("requestedRole");
      if (account.role && account.role !== requestedRole) {
        throw new Error(`The server assigned ${account.role} instead of your requested ${requestedRole}. Your sign-up was not logged in. Restart the updated backend and try again.`);
      }
      setAuth({ token, user: account, modules: result?.modules || [] }); setPage("dashboard"); setLoadError("");
      notify(`Account created. Welcome, ${account.name || account.fullName || account.email || "user"}`);
    } catch (error) { setAuthError(error.message); }
    finally { setLoginBusy(false); }
  }

  async function logout() {
    if (auth?.token) {
      try { await apiRequest("/auth/logout", { token: auth.token, method: "POST" }); }
      catch { /* Local token state is still cleared on logout. */ }
    }
    setAuth(null); setPage("dashboard"); setPageData([]); setSummary(null); setLoadError(""); setModal(null);
    setAccessRequests([]); setAccessRequestError(""); setNotificationsOpen(false);
    notify("You have logged out");
  }

  async function saveRecord(values) {
    const basePath = configFor(page).path;
    try {
      if (modal?.record?.id != null) {
        await apiRequest(`${basePath}/${modal.record.id}`, { token: auth.token, method: "PUT", body: values });
      } else {
        await apiRequest(basePath, { token: auth.token, method: "POST", body: values });
      }
      setModal(null);
      await loadPage(page, auth);
      notify(modal?.record ? "Record updated" : "Record created");
    } catch (error) { notify(error.message, true); }
  }

  async function createClientTicket(values) {
    try {
      await apiRequest("/tickets", { token: auth.token, method: "POST", body: values });
      setClientTicketOpen(false);
      await loadPage("helpdesk", auth);
      notify("Ticket created successfully");
    } catch (error) { notify(error.message, true); }
  }

  async function resetUserPassword(userId, password) {
    await apiRequest(`/users/${userId}/password`, { token: auth.token, method: "PUT", body: { password } });
    setResetPasswordUser(null); notify("Password reset successfully");
  }

  async function setManagedUserStatus(record, status) {
    try {
      await apiRequest(`/users/${record.id}/status`, { token: auth.token, method: "PATCH", body: { status } });
      await loadPage("users", auth); notify(`User ${status === "Active" ? "activated" : "deactivated"}`);
    } catch (error) { notify(error.message, true); }
  }

  async function deleteManagedUser(record) {
    if (!window.confirm(`Delete ${record.name}? Historical records must be preserved, so linked accounts can only be deactivated.`)) return;
    try {
      await apiRequest(`/users/${record.id}`, { token: auth.token, method: "DELETE" });
      await loadPage("users", auth); notify("User deleted");
    } catch (error) { notify(error.message, true); }
  }

  async function decideAccessRequest(request, decision, roleName) {
    try {
      await apiRequest(`/users/access-requests/${request.id}`, { token: auth.token, method: "PATCH", body: { decision, role: roleName } });
      await loadPage("users", auth);
      setNotificationsOpen(false);
      notify(decision === "APPROVE" ? `${request.name} approved as ${roleName}` : `Access request from ${request.name} rejected`);
    } catch (error) { notify(error.message, true); }
  }

  async function deleteRecord(record) {
    if (!window.confirm("Delete this record?")) return;
    try {
      await apiRequest(`${configFor(page).path}/${record.id}`, { token: auth.token, method: "DELETE" });
      await loadPage(page, auth); notify("Record deleted");
    } catch (error) { notify(error.message, true); }
  }

  async function transitionWorkOrder(record, status) {
    try {
      await apiRequest(`/work-orders/${record.id}/status`, { token: auth.token, method: "PATCH", body: { status } });
      await loadPage(page, auth); notify(`Work order moved to ${status}`);
    } catch (error) { notify(error.message, true); }
  }

  async function attendanceAction(action) {
    try {
      await apiRequest(`/attendance/${action}`, { token: auth.token, method: "POST", body: {} });
      await loadPage("myatt", auth); notify(action === "check-in" ? "Check-in recorded" : "Check-out recorded");
    } catch (error) { notify(error.message, true); }
  }

  if (!auth) return <Login onSignIn={handleLogin} onSignUp={handleSignup} busy={loginBusy} error={authError} notice={signupNotice} />;

  const visibleRows = pageData.filter((record) => {
    const text = Object.values(record || {}).join(" ").toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (!statusFilter || record.status === statusFilter);
  });
  const statuses = [...new Set(pageData.map((item) => item.status).filter(Boolean))];

  return (
    <div className="app" id="appshell">
      <aside className="sidebar">
        <div className="brand"><img className="logoimg" src="/ibest-logo.jpg" alt="iBEST Solutions" /><span>PrimeSpace</span></div>
        <div className="subbrand">SMART FACILITY OPERATIONS · iBEST SOLUTIONS</div>
        <nav className="nav">
          {PAGE_LIST.filter(([id]) => allowedPages.includes(id)).map(([id, label, icon]) => (
            <button key={id} className={page === id ? "active" : ""} onClick={() => { setPage(id); setQuery(""); setStatusFilter(""); }}>
              <span className="ico">{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="chip"><div className="avatar">{initials(userName)}</div><div><b>{userName}</b><span>{role}</span></div></div>
          <button className="logoutbtn" onClick={logout}>⏻ Logout</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar"><div className="crumb">{config.title}</div><div className="topright"><span className="muted date-label">{new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</span><span className="muted user-label">{userName} · {role}</span>{role === "Super Admin" && <div className="notification-wrap"><button className="notification-bell" aria-label={`${accessRequests.length} pending access requests`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}>🔔{accessRequests.length > 0 && <span className="notification-count">{accessRequests.length}</span>}</button>{notificationsOpen && <div className="notification-popover"><div className="notification-heading"><b>Access requests</b><span>{accessRequests.length} pending</span></div>{accessRequestError ? <p className="notification-empty error-text">{accessRequestError}</p> : accessRequests.length === 0 ? <p className="notification-empty">No pending requests.</p> : <div className="notification-list">{accessRequests.map((request) => <div className="notification-item" key={request.id}><b>{request.name}</b><span>{request.email}</span><span>Organisation: {request.organisation || "Unknown organisation"}</span><span>Requested: {request.requestedRole}</span><div className="notification-actions"><button className="small" onClick={() => decideAccessRequest(request, "APPROVE", request.requestedRole)}>Accept</button><button className="danger small" onClick={() => decideAccessRequest(request, "REJECT")}>Reject</button></div></div>)}</div>}<button className="secondary notification-view" onClick={() => { setNotificationsOpen(false); setPage("users"); }}>View all requests</button></div>}</div>}<div className="avatar">{initials(userName)}</div></div></header>
        <div className="content">
          {page === "dashboard" ? <Dashboard summary={summary} loading={loading} error={loadError} onNavigate={setPage} /> :
            page === "myatt" ? <AttendancePage rows={pageData} loading={loading} error={loadError} onAction={attendanceAction} /> :
            page === "settings" ? <SettingsPage user={user} onPassword={() => notify("Password update will be available when the account API is implemented.", true)} /> :
            page === "reports" ? <ReportsPage summary={summary} rows={pageData} loading={loading} error={loadError} /> :
            page === "users" ? <UsersRolesPage rows={pageData} roles={roleRows} requests={accessRequests} loading={loading} error={loadError} requestError={accessRequestError}
              onCreate={() => setModal({ record: null })} onEdit={(record) => setModal({ record })}
              onResetPassword={setResetPasswordUser} onSetStatus={setManagedUserStatus} onDelete={deleteManagedUser}
              onDecideRequest={decideAccessRequest} currentUser={user} /> :
            page === "helpdesk" && role === "Client User" ? <ClientHelpdeskPage rows={pageData} loading={loading} error={loadError}
              onCreate={() => setClientTicketOpen(true)} onView={setViewingTicket} /> : <ModulePage
              page={page} config={config} rows={visibleRows} allRows={pageData} loading={loading} error={loadError}
              query={query} setQuery={setQuery} statuses={statuses} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              onCreate={() => setModal({ record: null })} onEdit={(record) => setModal({ record })}
              onDelete={deleteRecord} onTransition={transitionWorkOrder}
              canCreate={canCreate && !["Technician", "Client User"].includes(role)}
              canDelete={config.allowDelete === true}
            />}
        </div>
      </main>

      {modal && <RecordModal title={`${modal.record ? "Edit" : "Add"} ${config.title}`} fields={config.fields || []} record={modal.record} busy={loading} onClose={() => setModal(null)} onSave={saveRecord} />}
      {clientTicketOpen && <ClientTicketModal locations={ticketLocations} optionsError={ticketOptionsError} onClose={() => setClientTicketOpen(false)} onSubmit={createClientTicket} />}
      {viewingTicket && <ClientTicketDetails ticket={viewingTicket} onClose={() => setViewingTicket(null)} />}
      {resetPasswordUser && <ResetPasswordModal user={resetPasswordUser} onClose={() => setResetPasswordUser(null)} onSave={resetUserPassword} />}
      {toast && <div className={`toast show${toast.isError ? " err" : ""}`}>{toast.message}</div>}
    </div>
  );
}

function configFor(page) { return MODULES[page] || SPECIAL_PAGES[page] || {}; }

function Login({ onSignIn, onSignUp, busy, error, notice }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mode, setMode] = useState("signin");
  const signingUp = mode === "signup";
  return (
    <div className="auth" id="loginback">
      <div className="auth-left">
        <div className="auth-logo"><img src="/ibest-logo.jpg" alt="iBEST Solutions logo" /></div>
        <div className="auth-hero"><div className="auth-name">PrimeSpace</div><div className="auth-sub">SMART INTEGRATED FACILITY OPERATIONS PLATFORM</div><div className="auth-desc">One intelligent platform to manage, monitor and optimize building and facility operations.</div>
          <div className="feats"><div className="feat"><i>🏢</i>Smart Buildings</div><div className="feat"><i>⚙</i>Facility Operations</div><div className="feat"><i>📈</i>Real-Time Monitoring</div><div className="feat"><i>🍃</i>Energy Efficiency</div></div>
        </div><div className="auth-foot">© iBEST Solutions</div>
      </div>
      <div className="auth-right"><form className="auth-form" onSubmit={signingUp ? onSignUp : onSignIn} autoComplete="on">
        <div className="auth-modes" role="tablist" aria-label="Account access">
          <button type="button" role="tab" aria-selected={!signingUp} className={!signingUp ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
          <button type="button" role="tab" aria-selected={signingUp} className={signingUp ? "active" : ""} onClick={() => setMode("signup")}>Sign up</button>
        </div>
        <h2>{signingUp ? "Create your account" : "Welcome to PrimeSpace"}</h2>
        <p>{signingUp ? "Request access to your PrimeSpace organisation." : "Sign in to your workspace."}</p>
        {signingUp && <>
          <label><span className="formlabel">Full name</span><div className="field-ic"><span>👤</span><input name="name" type="text" placeholder="Enter your full name" required maxLength={180} autoComplete="name" /></div></label>
          <label><span className="formlabel">Organisation name</span><div className="field-ic"><span>🏢</span><input name="organisationName" type="text" placeholder="Enter your organisation" required maxLength={180} autoComplete="organization" /></div></label>
          <label><span className="formlabel">Account type</span><select name="requestedRole" defaultValue="Client User"><option>Property Manager</option><option>Helpdesk Executive</option><option>Supervisor</option><option>Technician</option><option>Client User</option></select></label>
        </>}
        <label><span className="formlabel">Email</span><div className="field-ic"><span>✉</span><input name="email" type="email" placeholder="Enter your email" required maxLength={254} autoComplete="email" /></div></label>
        <label><span className="formlabel">Password</span><div className="field-ic pw"><span>🔒</span><input name="password" type={passwordVisible ? "text" : "password"} placeholder={signingUp ? "At least 12 characters" : "Enter your password"} required minLength={signingUp ? 12 : undefined} maxLength={72} autoComplete={signingUp ? "new-password" : "current-password"} /><button type="button" className="secondary" onClick={() => setPasswordVisible((value) => !value)}>{passwordVisible ? "Hide" : "Show"}</button></div></label>
        {signingUp && <label><span className="formlabel">Confirm password</span><div className="field-ic"><span>🔒</span><input name="confirmPassword" type="password" placeholder="Re-enter your password" required minLength={12} maxLength={72} autoComplete="new-password" /></div></label>}
        {!signingUp && <button type="button" className="fp" onClick={() => setShowHelp(true)}>🔒 Forgot Password?</button>}
        {signingUp && <p className="signup-note">Enter the exact name of an organisation that already exists in PrimeSpace. Client User accounts are approved automatically. Property Manager, Helpdesk Executive, Supervisor, and Technician requests go to that organisation’s Super Admin for approval. Super Admin cannot be selected here.</p>}
        {error && <div className="autherr" role="alert">{error}</div>}
        {notice && <div className="signup-notice" role="status">{notice}</div>}
        <button type="submit" disabled={busy}>{busy ? (signingUp ? "Creating account…" : "Signing in…") : (signingUp ? "➜ Sign up" : "➜ Sign in")}</button>
      </form></div>
      {showHelp && <div className="modalback show" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowHelp(false); }}><div className="modal"><div className="modalhead"><h2>Account assistance</h2><button className="x" onClick={() => setShowHelp(false)}>✕</button></div><p>Please contact your PrimeSpace administrator for account access or password reset.</p><div className="modalfoot"><button onClick={() => setShowHelp(false)}>Close</button></div></div></div>}
    </div>
  );
}

function Dashboard({ summary, loading, error, onNavigate }) {
  const cards = [
    ["Open tickets", summary?.openTickets ?? 0, "Needs helpdesk attention", "◉", "helpdesk"],
    ["Active work orders", summary?.activeWorkOrders ?? 0, "Work currently in progress", "▤", "workorders"],
    ["Staff present", summary?.staffPresent ?? "—", "Today's attendance", "♟", "workforce"],
    ["Low-stock materials", summary?.lowStockItems ?? 0, "At or below minimum level", "▥", "inventory"],
  ];
  return <>
    <PageHeading title="Dashboard" description="Facility operations overview." />
    <div className="grid kpis">{cards.map(([label, value, note, icon, target]) => <button className="card click kpi-card" key={label} onClick={() => onNavigate(target)}><div className="kpi-top"><span>{label}</span><span className="kpi-icon">{icon}</span></div><div className="kpi-num">{loading ? "…" : value}</div><div className="kpi-note">{note}</div></button>)}</div>
    <LoadState loading={loading} error={error} emptyMessage={!summary ? "Dashboard metrics will appear when the dashboard API is available." : ""} />
    <div className="grid two"><div className="card"><h3>Work waiting for action</h3><p className="muted">Open tickets and assigned work orders are loaded from the backend.</p><button className="secondary" onClick={() => onNavigate("helpdesk")}>View helpdesk</button></div><div className="card"><h3>Recent activity</h3><p className="muted">Recent operational events will appear here from the audit API.</p><button className="secondary" onClick={() => onNavigate("audit")}>View audit log</button></div></div>
  </>;
}

function UsersRolesPage({ rows, roles, requests, loading, error, requestError, onCreate, onEdit, onResetPassword, onSetStatus, onDelete, onDecideRequest, currentUser }) {
  const [tab, setTab] = useState("users");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [roleChoice, setRoleChoice] = useState({});
  useEffect(() => { if (requests.length > 0) setTab("requests"); }, [requests.length]);
  const filtered = rows.filter((row) => {
    const matchesText = !query || `${row.name} ${row.login} ${row.role} ${row.scope}`.toLowerCase().includes(query.toLowerCase());
    return matchesText && (!status || row.status === status);
  });
  return <>
    <PageHeading title="Users, Roles & Permissions" description="Manage login accounts, property scope, and the modules each role can access."
      action={tab === "users" && <button onClick={onCreate}>+ Add user</button>} />
    <div className="role-tabs" role="tablist" aria-label="User and role management">
      <button role="tab" aria-selected={tab === "users"} className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>Users</button>
      <button role="tab" aria-selected={tab === "requests"} className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>Access requests{requests.length > 0 ? ` (${requests.length})` : ""}</button>
      <button role="tab" aria-selected={tab === "roles"} className={tab === "roles" ? "active" : ""} onClick={() => setTab("roles")}>Roles &amp; Permissions</button>
    </div>
    {tab === "users" ? <>
      {requests.length > 0 && <div className="card access-request-banner"><div><b>{requests.length} pending access request{requests.length === 1 ? "" : "s"}</b><span>Review role requests from this organisation.</span></div><button onClick={() => setTab("requests")}>Review requests</button></div>}
      <div className="toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users..." />
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option>Active</option><option>Pending Approval</option><option>Rejected</option><option>Disabled</option></select></div>
      {error ? <LoadState error={error} /> : loading ? <LoadState loading={loading} /> :
        <div className="tablewrap"><table className="table user-table"><thead><tr><th>Name</th><th>Role</th><th>Email / Login ID</th><th>Scope</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{filtered.map((record) => <tr key={record.id}>
            <td><b>{record.name}</b></td><td><span className="role-pill">{record.role || "Unassigned"}</span></td><td>{record.login}</td><td>{record.scope}</td>
            <td><StatusPill status={record.status} /></td>
            <td><div className="user-actions">
              <button className="secondary small" onClick={() => onEdit(record)}>Edit</button>
              <button className="secondary small" onClick={() => onResetPassword(record)}>Reset password</button>
              <button className="secondary small" disabled={record.login === currentUser?.email} onClick={() => onSetStatus(record, record.status === "Active" ? "Disabled" : "Active")}>{record.status === "Active" ? "Deactivate" : "Activate"}</button>
              <button className="danger small" disabled={record.login === currentUser?.email} onClick={() => onDelete(record)}>Delete</button>
            </div></td>
          </tr>)}</tbody>
        </table>{filtered.length === 0 && <div className="empty">No users match this search.</div>}</div>}
    </> : tab === "requests" ? <>
      <p className="muted">Platform-wide queue: Super Admins can review requests from every organisation.</p>
      {requestError ? <LoadState error={requestError} /> : loading ? <LoadState loading={loading} /> : requests.length === 0 ? <div className="card empty">There are no pending access requests.</div> :
        <div className="tablewrap"><table className="table user-table"><thead><tr><th>Name</th><th>Email</th><th>Organisation</th><th>Requested role</th><th>Grant role</th><th>Action</th></tr></thead>
          <tbody>{requests.map((request) => <tr key={request.id}><td><b>{request.name}</b></td><td>{request.email}</td><td>{request.organisation || "—"}</td><td>{request.requestedRole}</td>
            <td><select value={roleChoice[request.id] || request.requestedRole} onChange={(event) => setRoleChoice((current) => ({ ...current, [request.id]: event.target.value }))}>
              {["Property Manager", "Helpdesk Executive", "Supervisor", "Technician", "Client User"].map((name) => <option key={name}>{name}</option>)}
            </select></td>
            <td><div className="user-actions"><button className="small" onClick={() => onDecideRequest(request, "APPROVE", roleChoice[request.id] || request.requestedRole)}>Approve</button><button className="danger small" onClick={() => onDecideRequest(request, "REJECT")}>Reject</button></div></td>
          </tr>)}</tbody></table></div>}
    </> : <>
      {error ? <LoadState error={error} /> : loading ? <LoadState loading={loading} /> :
        <div className="tablewrap role-matrix-wrap"><table className="table role-matrix"><thead><tr><th>Role</th><th>What they can do</th><th>Modules</th></tr></thead>
          <tbody>{roles.map((role) => <tr key={role.name}><td><b>{role.name}</b></td><td>{role.description}</td>
            <td>{(role.modules || []).map((module) => PAGE_LIST.find(([id]) => id === module)?.[1] || module).join(" · ")}</td></tr>)}</tbody>
        </table></div>}
    </>}
  </>;
}

function ResetPasswordModal({ user, onClose, onSave }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget);
    const password = form.get("password");
    if (password !== form.get("confirmPassword")) { setError("Passwords do not match."); return; }
    setBusy(true);
    try { await onSave(user.id, password); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }
  return <div className="modalback show"><form className="modal" onSubmit={submit}>
    <div className="modalhead"><h2>Reset password</h2><button type="button" className="x" onClick={onClose}>✕</button></div>
    <p className="muted">Set a new password for {user.name}.</p>
    <div className="formgrid"><label><span className="formlabel">New password</span><input name="password" type="password" minLength={12} maxLength={72} required autoComplete="new-password" /></label>
      <label><span className="formlabel">Confirm password</span><input name="confirmPassword" type="password" minLength={12} maxLength={72} required autoComplete="new-password" /></label></div>
    {error && <div className="autherr">{error}</div>}
    <div className="modalfoot"><button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" disabled={busy}>{busy ? "Saving…" : "Reset password"}</button></div>
  </form></div>;
}

function ModulePage({ page, config, rows, loading, error, query, setQuery, statuses, statusFilter, setStatusFilter, onCreate, onEdit, onDelete, onTransition, canCreate, canDelete }) {
  return <>
    <PageHeading title={config.title} description={config.description} action={canCreate && <button onClick={onCreate}>+ {page === "helpdesk" ? "New ticket" : page === "workorders" ? "Work order" : "Add record"}</button>} />
    <div className="toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}...`} />{statuses.length > 0 && <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select>}</div>
    {error ? <LoadState error={error} /> : loading ? <LoadState loading={loading} /> : rows.length === 0 ? <div className="card empty">No records found.</div> :
      <div className="tablewrap"><table className="table"><thead><tr>{config.columns.map(([label]) => <th key={label}>{label}</th>)}<th>Action</th></tr></thead><tbody>{rows.map((record, index) => <tr key={record.id ?? index}>
        {config.columns.map(([, key, prefix]) => <td key={key}>{prefix && record[key] != null ? `${prefix}${record[key]}` : key === "status" ? <StatusPill status={record[key]} /> : showValue(record[key])}</td>)}
        <td><div className="btnrow">{page === "workorders" && record.status && nextStatus(record.status) && <button className="small" onClick={() => onTransition(record, nextStatus(record.status))}>Move to {nextStatus(record.status)}</button>}{canCreate && <button className="secondary small" onClick={() => onEdit(record)}>Edit</button>}{canDelete && <button className="danger small" onClick={() => onDelete(record)}>Delete</button>}</div></td>
      </tr>)}</tbody></table></div>}
  </>;
}

function AttendancePage({ rows, loading, error, onAction }) {
  return <>
    <PageHeading title="My Attendance" description="Check in and out using your assigned shift. The server records the actual time." action={<div className="btnrow"><button onClick={() => onAction("check-in")}>Check In</button><button className="secondary" onClick={() => onAction("check-out")}>Check Out</button></div>} />
    <LoadState loading={loading} error={error} />
    <div className="card"><h3>My attendance sessions</h3>{rows.length === 0 && !loading && !error ? <div className="empty">No attendance records found.</div> : <div className="tablewrap"><table className="table"><thead><tr><th>Date</th><th>Shift</th><th>Check in</th><th>Check out</th><th>Status</th><th>Working hours</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.id ?? index}><td>{showValue(row.workDate || row.date)}</td><td>{showValue(row.shiftName)}</td><td>{showValue(row.checkInAt || row.checkIn)}</td><td>{showValue(row.checkOutAt || row.checkOut)}</td><td><StatusPill status={row.status} /></td><td>{showValue(row.workingHours)}</td></tr>)}</tbody></table></div>}</div>
  </>;
}

function ReportsPage({ summary, rows, loading, error }) {
  return <><PageHeading title="Reports & Analytics" description="Live summaries from current backend records." />
    <LoadState loading={loading} error={error} />
    <div className="grid kpis">{[["Tickets", summary?.totalTickets ?? rows.length], ["Closed tickets", summary?.closedTickets ?? "—"], ["Completed work", summary?.completedWorkOrders ?? "—"], ["Low stock", summary?.lowStockItems ?? "—"]].map(([label, value]) => <div className="card" key={label}><div className="kpi-top">{label}</div><div className="kpi-num">{loading ? "…" : value}</div></div>)}</div>
    <div className="card"><h3>Report data</h3><p className="muted">Charts and CSV exports will use the report endpoints after they are implemented.</p></div>
  </>;
}

function ClientHelpdeskPage({ rows, loading, error, onCreate, onView }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const statuses = [...new Set(rows.map((ticket) => ticket.status).filter(Boolean))];
  const filtered = rows.filter((ticket) => {
    const text = `${ticket.id} ${ticket.title} ${ticket.requester} ${ticket.location} ${ticket.priority} ${ticket.status} ${ticket.assignee}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (!status || ticket.status === status);
  });
  return <>
    <PageHeading title="Helpdesk" description="Raise a request and track it until closure." action={<button onClick={onCreate}>+ Create ticket</button>} />
    <div className="toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tickets..." />
      <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></div>
    {error ? <LoadState error={error} /> : loading ? <LoadState loading={loading} /> : rows.length === 0 ?
      <div className="card empty">You have no tickets yet. Select <b>Create ticket</b> to raise a request.</div> : filtered.length === 0 ?
        <div className="card empty">No tickets match this search.</div> :
        <div className="tablewrap"><table className="table client-ticket-table"><thead><tr><th>Ticket</th><th>Issue</th><th>Requester</th><th>Location</th><th>Priority</th><th>Status</th><th>SLA</th><th>Assigned to</th><th>Action</th></tr></thead>
          <tbody>{filtered.map((ticket) => <tr key={ticket.id}><td><b>{formatTicketId(ticket.id)}</b></td><td>{ticket.title}</td><td>{ticket.requester || "You"}</td><td>{ticket.location || "—"}</td>
            <td><StatusPill status={ticket.priority} /></td><td><StatusPill status={ticket.status} /></td><td>{ticket.sla || "—"}</td><td>{ticket.assignee || "—"}</td>
            <td><button className="secondary small" onClick={() => onView(ticket)}>View</button></td></tr>)}</tbody></table></div>}
  </>;
}

function ClientTicketModal({ locations, optionsError, onClose, onSubmit }) {
  const [propertyId, setPropertyId] = useState(locations[0]?.propertyId || "");
  const [buildingId, setBuildingId] = useState("");
  const propertyOptions = [...new Map(locations.map((item) => [item.propertyId, { id: item.propertyId, name: item.propertyName }])).values()];
  const buildingOptions = [...new Map(locations.filter((item) => item.propertyId === propertyId && item.buildingId).map((item) => [item.buildingId, { id: item.buildingId, name: item.buildingName }])).values()];
  const floorOptions = [...new Map(locations.filter((item) => item.propertyId === propertyId && item.buildingId === buildingId && item.floorId).map((item) => [item.floorId, { id: item.floorId, name: item.floorName }])).values()];
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSubmit({ title: form.get("title"), category: form.get("category"), priority: form.get("priority"),
      propertyId, buildingId: buildingId || null, floorId: form.get("floorId") || null, description: form.get("description") });
  }
  return <div className="modalback show" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="modal" onSubmit={submit}>
    <div className="modalhead"><h2>Create ticket</h2><button type="button" className="x" onClick={onClose}>✕</button></div>
    <p className="muted">Describe the issue and where it occurred. The helpdesk team will assign it.</p>
    {optionsError && <div className="autherr">Could not load available locations: {optionsError}</div>}
    {locations.length === 0 && !optionsError && <div className="autherr">No properties are available for your account. Contact your administrator.</div>}
    <div className="formgrid">
      <label><span className="formlabel">Issue title *</span><input name="title" required maxLength={220} placeholder="Briefly describe the issue" /></label>
      <label><span className="formlabel">Category *</span><select name="category" required defaultValue="HVAC">{["HVAC", "Electrical", "Plumbing", "Civil", "Housekeeping", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span className="formlabel">Priority *</span><select name="priority" required defaultValue="Medium">{["Low", "Medium", "High", "Critical"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span className="formlabel">Property *</span><select required value={propertyId} onChange={(event) => { setPropertyId(event.target.value); setBuildingId(""); }}><option value="">Select property</option>{propertyOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label><span className="formlabel">Tower / building</span><select value={buildingId} onChange={(event) => setBuildingId(event.target.value)}><option value="">Select tower (optional)</option>{buildingOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label><span className="formlabel">Floor</span><select name="floorId" disabled={!buildingId}><option value="">Select floor (optional)</option>{floorOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="wide"><span className="formlabel">Description *</span><textarea name="description" required rows="4" placeholder="Add details that will help resolve the issue" /></label>
    </div>
    <div className="modalfoot"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button type="submit" disabled={!propertyId || locations.length === 0}>Create ticket</button></div>
  </form></div>;
}

function ClientTicketDetails({ ticket, onClose }) {
  return <div className="modalback show" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal">
    <div className="modalhead"><h2>{formatTicketId(ticket.id)} · Ticket details</h2><button className="x" onClick={onClose}>✕</button></div>
    <h3>{ticket.title}</h3><div className="ticket-detail-grid"><span>Requester</span><b>{ticket.requester || "You"}</b><span>Location</span><b>{ticket.location || "—"}</b><span>Category</span><b>{ticket.category}</b><span>Priority</span><b>{ticket.priority}</b><span>Status</span><b><StatusPill status={ticket.status} /></b><span>Assigned to</span><b>{ticket.assignee || "Not assigned yet"}</b></div>
    <p className="ticket-description">{ticket.description || "No description provided."}</p>
    <div className="modalfoot"><button onClick={onClose}>Close</button></div>
  </div></div>;
}

function formatTicketId(id) { return `T-${String(id || "").replaceAll("-", "").slice(0, 8).toUpperCase()}`; }

function SettingsPage({ user, onPassword }) {
  return <><PageHeading title="Settings" description="Account, workspace and data controls." />
    <div className="grid two"><div className="card"><h3>My account</h3><b>{user?.name || user?.fullName || user?.email}</b><p className="muted">{user?.email} · {user?.role}</p><button onClick={onPassword}>Change my password</button></div>
      <div className="card"><h3>Workspace</h3><p className="muted">Workspace settings are loaded from the backend.</p></div></div>
  </>;
}

function RecordModal({ title, fields, record, onClose, onSave }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    for (const [key, , type] of fields) if (type === "number" && values[key] !== "") values[key] = Number(values[key]);
    try { await onSave(values); } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }
  return <div className="modalback show" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}><form className="modal" onSubmit={submit}>
    <div className="modalhead"><h2>{title}</h2><button type="button" className="x" onClick={onClose}>✕</button></div>
    <div className="formgrid">{fields.map(([key, label, type = "text", required = false, options = []]) => { const isRequired = required || (key === "password" && !record); return <label key={key}><span className="formlabel">{label}{isRequired ? " *" : ""}</span>{type === "textarea" ? <textarea name={key} defaultValue={record?.[key] ?? ""} required={isRequired} rows="4" /> : type === "select" ? <select name={key} defaultValue={record?.[key] ?? options[0] ?? ""} required={isRequired}>{options.map((option) => <option key={option}>{option}</option>)}</select> : <input name={key} type={type} defaultValue={key === "password" ? "" : record?.[key] ?? ""} required={isRequired} />}</label>; })}</div>
    {error && <div className="autherr">{error}</div>}
    <div className="modalfoot"><button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div>
  </form></div>;
}

function PageHeading({ title, description, action }) { return <div className="heading"><div><h1>{title}</h1><p>{description}</p></div>{action && <div className="actions">{action}</div>}</div>; }
function LoadState({ loading, error, emptyMessage }) { if (loading) return <div className="card muted load-state">Loading records…</div>; if (error) return <div className="card error-state"><b>Could not load data from the backend.</b><p>{error}</p><p className="muted">Check that the backend is running and that this endpoint is implemented. PrimeSpace does not fall back to browser storage.</p></div>; if (emptyMessage) return <p className="muted">{emptyMessage}</p>; return null; }
function StatusPill({ status }) { const value = showValue(status); const color = /critical|rejected|expired|overdue|disabled|breached/i.test(value) ? "red" : /closed|completed|present|operational|active|verified|available|received|approved|resolved|valid|passed/i.test(value) ? "green" : /high|open|attention|absent|awaiting|pending|expiring|low stock|maintenance|planned/i.test(value) ? "amber" : "blue"; return <span className={`pill ${color}`}>{value}</span>; }
function nextStatus(status) { const flow = ["New", "Assigned", "Accepted", "In Progress", "Awaiting Material", "Completed", "Verified", "Closed"]; const index = flow.indexOf(status); return index >= 0 && index < flow.length - 1 ? flow[index + 1] : ""; }

export default App;
