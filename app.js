const STORAGE_KEY = "acfbi_data_v1";

// Preset admin authentication credentials
const ADMIN_CREDENTIALS = {
  email: "admin@university.edu",
  password: "admin123",
};

// ACFBI initial state
const initialData = {
  user: { firstName: "", lastName: "", email: "", matric: "" },
  applications: [],
  notifications: [],
  activity: [],
};

let data = loadData();

function loadData() {
  try {
    return (
      JSON.parse(localStorage.getItem(STORAGE_KEY)) ||
      structuredClone(initialData)
    );
  } catch {
    return structuredClone(initialData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function $(selector, root = document) {
  return root.querySelector(selector);
}
function $$(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}
function escapeHtml(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
function initials(name) {
  return name
    ? name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";
}
function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = "toast success show";
  setTimeout(() => (toast.className = "toast hidden"), 3300);
}

function openModal(content) {
  $("#modalContent").innerHTML = content;
  $("#modalBackdrop").classList.remove("hidden");
}
function closeModal() {
  $("#modalBackdrop").classList.add("hidden");
}

function dateGreeting() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}
function activeStudentApplication() {
  return data.applications.find(
    (a) =>
      a.student === `${data.user.firstName} ${data.user.lastName}` &&
      ["Approved", "Pending"].includes(a.status),
  );
}
function studentApplications() {
  return data.applications.filter(
    (a) => a.student === `${data.user.firstName} ${data.user.lastName}`,
  );
}

// Master View Switcher
function switchMainView(view) {
  $(".app-shell").classList.toggle("dashboard-shell", view !== "auth");
  $("#authView").classList.toggle("hidden", view !== "auth");
  $("#studentView").classList.toggle("hidden", view !== "student");
  $("#adminView").classList.toggle("hidden", view !== "admin");
  $(".mobile-brand").classList.toggle("hidden", view !== "auth");

  if (view === "auth") setAuthTab("login");
  if (view === "student") renderStudent();
  if (view === "admin") renderAdmin();
}

// Unified Login Handler
$("#loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = $("#loginEmail").value.trim();
  const password = $("#loginPassword").value.trim();

  if (
    email === ADMIN_CREDENTIALS.email &&
    password === ADMIN_CREDENTIALS.password
  ) {
    switchMainView("admin");
    showToast("Authenticated as Admin (ACFBI Staff).");
  } else {
    if (!data.user.email) {
      data.user.email = email;
      data.user.firstName = email.split("@")[0];
      data.user.lastName = "";
      saveData();
    }
    switchMainView("student");
    showToast("Welcome to ACFBI Portal.");
  }
});

function setAuthTab(tabName) {
  const login = tabName === "login";
  $$(".tab").forEach((tab) =>
    tab.classList.toggle("active", tab.dataset.authTab === tabName),
  );
  $("#authView").classList.toggle("register-mode", !login);
  $("#loginForm").classList.toggle("hidden", !login);
  $("#registerForm").classList.toggle("hidden", login);
}

// Student View Logic
function renderStudent() {
  const fullName =
    `${data.user.firstName} ${data.user.lastName}`.trim() || "Student";
  $("#studentName").textContent = data.user.firstName || "Student";
  $("#profileName").textContent = fullName;
  $("#profileInitials").textContent = initials(fullName);
  $("#studentDate").textContent = dateGreeting().toUpperCase();

  const app = activeStudentApplication();
  const count = studentApplications().filter(
    (a) => a.status === "Collected" || a.status === "Approved",
  ).length;
  $("#packagesCount").textContent = count;

  if (app) {
    $("#currentStatus").textContent =
      app.status === "Pending" ? "In Screening" : app.status;
    $("#statusCaption").textContent =
      app.status === "Pending"
        ? "Screening in progress"
        : "Enrolled for semester";
    $("#nextCollection").textContent =
      app.status === "Approved" ? "Bi-weekly slot" : "To be confirmed";
    $("#collectionCode").textContent = app.collectionCode || "N/A";
  } else {
    $("#currentStatus").textContent = "Not Enrolled";
    $("#statusCaption").textContent = "No active application";
    $("#nextCollection").textContent = "N/A";
  }

  $("#appMatric").value = data.user.matric || "";
  $("#appEmail").value = data.user.email || "";
  renderHistory();
  renderNotifications();
}

function historyStatus(status) {
  return status === "Collected"
    ? '<span class="status approved">Collected</span>'
    : `<span class="status ${status.toLowerCase()}">${status === "Pending" ? "In Screening" : status}</span>`;
}

function renderHistory() {
  const apps = studentApplications();
  if (apps.length === 0) {
    $("#historyBody").innerHTML =
      '<tr><td colspan="5" style="text-align:center;padding:24px;color:#7b8b87">No ACFBI applications found.</td></tr>';
    return;
  }
  $("#historyBody").innerHTML = apps
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(
      (a) =>
        `<tr><td><span class="history-name">${escapeHtml(a.period)}</span><span class="history-sub">${a.id} ${a.urgent ? "• Urgent" : ""}</span></td><td>${a.submitted}</td><td>${escapeHtml(a.package)}</td><td>${historyStatus(a.status)}</td><td><button class="text-button details-button" data-id="${a.id}">Details →</button></td></tr>`,
    )
    .join("");
}

function renderNotifications() {
  if (data.notifications.length === 0) {
    $("#notificationList").innerHTML =
      '<p class="empty-copy" style="padding:16px;text-align:center;color:#7b8b87">No notifications.</p>';
    $(".notification-button i").style.display = "none";
    return;
  }
  $("#notificationList").innerHTML = data.notifications
    .map(
      (n) =>
        `<div class="notification">${n.unread ? "<i></i>" : '<span style="width:8px"></span>'}<div><p>${escapeHtml(n.text)}</p><small>${n.time}</small></div></div>`,
    )
    .join("");
  const unread = data.notifications.some((n) => n.unread);
  $(".notification-button i").style.display = unread ? "block" : "none";
}

function showStudentPage(page) {
  $$(".student-page").forEach((el) =>
    el.classList.toggle("hidden", el.id !== `student-${page}`),
  );
  $$(".nav-item").forEach((el) =>
    el.classList.toggle("active", el.dataset.studentPage === page),
  );
  if (page === "history") renderHistory();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Admin View Logic
function renderAdmin() {
  const pending = data.applications.filter((a) => a.status === "Pending");
  const approved = data.applications.filter((a) => a.status === "Approved");
  const collected = data.applications.filter((a) => a.status === "Collected");

  $("#pendingCount").textContent = pending.length;
  $("#pendingBadge").textContent = pending.length;
  $("#urgentCount").textContent = pending.filter((a) => a.urgent).length;
  $("#approvedCount").textContent = approved.length;
  if ($("#distributedCount"))
    $("#distributedCount").textContent = collected.length;

  if ($("#admin-overview h1")) {
    $("#admin-overview h1").textContent = "Good morning, Yusuf.";
  }

  $("#awaitingList").innerHTML =
    pending.length > 0
      ? pending.slice(0, 3).map(applicantRow).join("")
      : '<p class="empty-copy" style="padding:16px;text-align:center;color:#7b8b87">All applications screened.</p>';

  $("#activityList").innerHTML =
    data.activity.length > 0
      ? data.activity
          .slice(0, 4)
          .map(
            (a) =>
              `<div class="activity"><span class="activity-icon">${a.icon}</span><div><p>${a.text}</p><small>${a.time}</small></div></div>`,
          )
          .join("")
      : '<p class="empty-copy" style="padding:16px;text-align:center;color:#7b8b87">No recent activity.</p>';

  renderAdminApplications();
}

function applicantRow(a) {
  return `<div class="awaiting-row"><span class="avatar">${a.initials}</span><div><div class="applicant-name">${escapeHtml(a.student)} ${a.urgent ? '<span title="Emergency Request" style="color:#df6753">● Emergency</span>' : ""}</div><div class="applicant-sub">${a.matric} · ${a.period}</div></div><span class="eligibility ${a.urgent ? "high" : "review"}">${a.urgent ? "Emergency" : "Screening"}</span><button class="review-button" data-review="${a.id}">Review</button></div>`;
}

function renderAdminApplications() {
  const query = ($("#applicationSearch")?.value || "").toLowerCase();
  const filter = $("#statusFilter")?.value || "all";
  const apps = data.applications
    .filter(
      (a) =>
        (filter === "all" || a.status === filter) &&
        (a.student.toLowerCase().includes(query) ||
          a.matric.toLowerCase().includes(query)),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  $("#adminApplicationsBody").innerHTML =
    apps.length > 0
      ? apps
          .map(
            (a) =>
              `<tr><td><div class="student-cell"><span class="avatar">${a.initials}</span><div><strong>${escapeHtml(a.student)}</strong><div class="history-sub">${a.matric}</div></div></div></td><td><strong>${escapeHtml(a.period)}</strong><div class="history-sub">${escapeHtml(a.package)}</div></td><td><span class="eligibility ${a.urgent ? "high" : "review"}">${a.urgent ? "Emergency" : "Standard Screening"}</span></td><td>${a.submitted}</td><td>${historyStatus(a.status)}</td><td>${a.status === "Pending" ? `<button class="review-button" data-review="${a.id}">Review</button>` : `<button class="text-button details-button" data-id="${a.id}">View</button>`}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="6" style="text-align:center;padding:30px;color:#7b8b87">No applications match filter.</td></tr>';
}

function showAdminPage(page) {
  $$(".admin-page").forEach((el) =>
    el.classList.toggle("hidden", el.id !== page),
  );
  $$(".admin-nav[data-admin-page]").forEach((el) =>
    el.classList.toggle("active", el.dataset.adminPage === page),
  );
  if (page === "admin-applications") renderAdminApplications();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function reviewApplication(id) {
  const app = data.applications.find((a) => a.id === id);
  if (!app) return;
  openModal(
    `<p class="eyebrow">ACFBI COMMITTEE REVIEW</p><h2>${escapeHtml(app.student)}</h2><p>${app.id} · Submitted ${app.submitted}</p><div class="review-details"><b>Matric:</b> ${app.matric}<br><b>Email:</b> ${escapeHtml(app.email)}<br><b>Session:</b> ${escapeHtml(app.period)}<br><b>Hamper:</b> ${escapeHtml(app.package)}<br><b>Emergency Request:</b> ${app.urgent ? "Yes (48-hr relief requested)" : "No (Standard cohort)"}<br><b>Situation:</b> ${escapeHtml(app.situation || "No additional notes supplied.")}</div><label style="margin-top:16px">Committee Note<textarea id="reviewNote" rows="3" placeholder="Visible to ACFBI committee only"></textarea></label><div class="modal-actions"><button class="secondary-button" id="rejectApp">Decline</button><button class="primary-button" id="approveApp">Approve / Enroll <span>✓</span></button></div>`,
  );
  $("#approveApp").onclick = () => decideApplication(id, "Approved");
  $("#rejectApp").onclick = () => decideApplication(id, "Rejected");
}

function decideApplication(id, status) {
  const app = data.applications.find((a) => a.id === id);
  if (!app) return;
  app.status = status;
  app.eligibility =
    status === "Approved" ? "Verified Enrolled" : "Not Eligible";
  if (status === "Approved")
    app.collectionCode = `ACFBI-${Math.floor(1000 + Math.random() * 8999)}`;
  const note = $("#reviewNote")?.value.trim();

  data.activity.unshift({
    icon: status === "Approved" ? "✓" : "×",
    text: `<strong>${escapeHtml(app.student)}</strong> was ${status === "Approved" ? "approved for enrollment" : "declined"} for ${escapeHtml(app.period)}.`,
    time: "Just now",
  });

  if (app.student === `${data.user.firstName} ${data.user.lastName}`) {
    data.notifications.unshift({
      text: `Your ACFBI request for ${app.period} was ${status === "Approved" ? "approved" : "declined"}.${note ? " Committee note added." : ""}`,
      time: "Just now",
      unread: true,
    });
  }
  saveData();
  closeModal();
  renderAdmin();
  showToast(`Application ${status.toLowerCase()}.`);
}

function exportCsv(filename, rows) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("CSV export downloaded.");
}

// General Event Listeners
$$(".tab").forEach((tab) =>
  tab.addEventListener("click", () => setAuthTab(tab.dataset.authTab)),
);
$$(".show-password").forEach((button) =>
  button.addEventListener("click", () => {
    const input = button.previousElementSibling;
    input.type = input.type === "password" ? "text" : "password";
    button.textContent = input.type === "password" ? "Show" : "Hide";
  }),
);

$("#registerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  data.user = {
    firstName: $("#firstName").value.trim(),
    lastName: $("#lastName").value.trim(),
    email: $("#registerEmail").value.trim(),
    matric: $("#registerMatric").value.trim(),
  };
  saveData();
  switchMainView("student");
  showToast("Account created successfully.");
});

$("#forgotPassword").onclick = () =>
  openModal(
    '<p class="eyebrow">ACFBI ACCOUNT RECOVERY</p><h2>Reset password</h2><p>Enter your institutional email to receive a password reset link.</p><label>Institutional email<input id="resetEmail" type="email" placeholder="you@university.edu" /></label><div class="modal-actions"><button class="primary-button" id="sendReset">Send reset link</button></div>',
  );

$$(".nav-item").forEach((btn) =>
  btn.addEventListener("click", () => showStudentPage(btn.dataset.studentPage)),
);
$$("[data-student-page]").forEach((btn) =>
  btn.addEventListener("click", () => showStudentPage(btn.dataset.studentPage)),
);

$("#notificationButton").onclick = () =>
  $("#notificationsPanel").classList.toggle("hidden");
$("#markRead").onclick = () => {
  data.notifications.forEach((n) => (n.unread = false));
  saveData();
  renderNotifications();
};

$("#idUpload").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) $("#fileName").textContent = file.name;
});

$("#applicationForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const period = $("#supportPeriod").value;
  const pack = $("#packageType").value;
  const now = new Date();
  const studentName =
    `${data.user.firstName} ${data.user.lastName}`.trim() || "Student User";

  const app = {
    id: `ACFBI-${now.getFullYear()}-${String(Math.floor(1000 + Math.random() * 8999))}`,
    student: studentName,
    initials: initials(studentName),
    email: $("#appEmail").value,
    matric: $("#appMatric").value,
    period,
    package: pack,
    submitted: formatDate(now),
    date: now.toISOString().slice(0, 10),
    status: "Pending",
    eligibility: $("#urgency").checked ? "Emergency" : "Standard Screening",
    urgent: $("#urgency").checked,
    situation: $("#situation").value,
  };

  data.applications.unshift(app);
  data.notifications.unshift({
    text: `Your ${period} application was received and is under ACFBI screening.`,
    time: "Just now",
    unread: true,
  });
  data.activity.unshift({
    icon: "▤",
    text: `<strong>${escapeHtml(app.student)}</strong> submitted a ${app.urgent ? "emergency " : ""}food assistance request.`,
    time: "Just now",
  });
  saveData();
  e.target.reset();
  $("#appMatric").value = data.user.matric;
  $("#appEmail").value = data.user.email;
  $("#fileName").textContent = "Upload student ID card";
  renderStudent();
  showStudentPage("history");
  showToast("ACFBI application submitted for confidential screening.");
});

$("#contactSupport").onclick = $("#contactSupport2").onclick = () =>
  openModal(
    '<p class="eyebrow">ACFBI CAMPUS COORDINATOR</p><h2>Contact support</h2><p>Our student support team responds confidentially within 24 hours.</p><label>Your message<textarea id="supportMessage" rows="4" placeholder="How can we assist you?"></textarea></label><div class="modal-actions"><button class="primary-button" id="sendSupport">Send message</button></div>',
  );
$("#addCalendar").onclick = () =>
  showToast("Pick-up reminder added to calendar.");
$("#profileButton").onclick = () =>
  openModal(
    `<p class="eyebrow">ACFBI STUDENT PROFILE</p><h2>${data.user.firstName} ${data.user.lastName}</h2><p>${data.user.email}<br>${data.user.matric}</p><div class="modal-actions"><button class="primary-button" id="profileDone">Done</button></div>`,
  );

$$(".admin-nav[data-admin-page]").forEach((btn) =>
  btn.addEventListener("click", () => showAdminPage(btn.dataset.adminPage)),
);
$$("[data-admin-page]").forEach((btn) =>
  btn.addEventListener("click", () => showAdminPage(btn.dataset.adminPage)),
);

$("#adminLogout").onclick = $("#studentLogout").onclick = () => {
  switchMainView("auth");
};
$("#applicationSearch").addEventListener("input", renderAdminApplications);
$("#statusFilter").addEventListener("change", renderAdminApplications);

$("#exportApplications").onclick = () =>
  exportCsv("acfbi-applications.csv", [
    ["Student", "Matric", "Session", "Hamper", "Status", "Submitted", "Type"],
    ...data.applications.map((a) => [
      a.student,
      a.matric,
      a.period,
      a.package,
      a.status,
      a.submitted,
      a.urgent ? "Emergency" : "Cohort",
    ]),
  ]);
$("#exportSummary").onclick = () =>
  exportCsv("acfbi-summary.csv", [
    ["Metric", "Value"],
    [
      "Pending Screening",
      data.applications.filter((a) => a.status === "Pending").length,
    ],
    [
      "Enrolled Cohort",
      data.applications.filter((a) => a.status === "Approved").length,
    ],
    [
      "Hampers Handed Over",
      data.applications.filter((a) => a.status === "Collected").length,
    ],
  ]);
$("#downloadReport").onclick = () =>
  exportCsv("acfbi-analytics-report.csv", [
    ["Metric", "Value"],
    ["Total Applications", data.applications.length],
    [
      "Emergency Relief Drives",
      data.applications.filter((a) => a.urgent).length,
    ],
  ]);

$("#newSlot").onclick = () =>
  openModal(
    '<p class="eyebrow">DISTRIBUTION PLANNING</p><h2>Add collection slot</h2><div class="two-col"><label>Date<input type="date" id="slotDate" /></label><label>Time<input type="time" id="slotTime" /></label></div><label>Slot capacity (hampers)<input type="number" id="slotCapacity" value="50" /></label><div class="modal-actions"><button class="primary-button" id="saveSlot">Save slot</button></div>',
  );
$("#recordCollection").onclick = () => {
  const n = Number(
    prompt("How many hampers were handed over in this window?", "1"),
  );
  if (n > 0)
    showToast(`${n} hamper${n === 1 ? "" : "s"} recorded as distributed.`);
};

// Global Modal Handlers
document.addEventListener("click", (e) => {
  const review = e.target.closest("[data-review]");
  if (review) reviewApplication(review.dataset.review);

  const details = e.target.closest(".details-button");
  if (details) {
    const a = data.applications.find((x) => x.id === details.dataset.id);
    if (a)
      openModal(
        `<p class="eyebrow">APPLICATION DETAILS</p><h2>${escapeHtml(a.period)}</h2><p>${a.id} · ${a.submitted}</p><div class="review-details"><b>Hamper:</b> ${escapeHtml(a.package)}<br><b>Status:</b> ${escapeHtml(a.status)}<br><b>Collection Code:</b> ${escapeHtml(a.collectionCode || "Pending approval")}<br><b>Request Type:</b> ${a.urgent ? "Emergency Relief Drive" : "Semester Cohort"}<br><b>Details:</b> ${escapeHtml(a.situation || "None supplied.")}</div><div class="modal-actions"><button class="primary-button" id="detailsDone">Done</button></div>`,
      );
  }

  if (
    e.target.id === "modalClose" ||
    e.target.id === "detailsDone" ||
    e.target.id === "profileDone"
  )
    closeModal();
  if (e.target.id === "sendReset") {
    closeModal();
    showToast("Reset instructions sent if email exists.");
  }
  if (e.target.id === "sendSupport") {
    closeModal();
    showToast("Message sent to ACFBI campus coordinator.");
  }
  if (e.target.id === "saveSlot") {
    closeModal();
    showToast("Collection slot created.");
  }
});

if ($("#modalBackdrop"))
  $("#modalBackdrop").addEventListener("click", (e) => {
    if (e.target === $("#modalBackdrop")) closeModal();
  });

// Initialize on Login Screen
switchMainView("auth");
