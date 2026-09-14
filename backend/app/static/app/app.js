const API_BASE = "/api/v1";

let token = localStorage.getItem("genealadin_token");

const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const nav = document.getElementById("nav");
const authMessage = document.getElementById("authMessage");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function setAuthMessage(text, type) {
  authMessage.textContent = text;
  authMessage.className = "message" + (type ? " " + type : "");
}

function showApp() {
  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");
  nav.classList.remove("hidden");
}

function showAuth() {
  authSection.classList.remove("hidden");
  appSection.classList.add("hidden");
  nav.classList.add("hidden");
}

async function api(path, options = {}) {
  const headers = options.headers || {};
  if (token) headers["Authorization"] = "Bearer " + token;
  if (options.body) headers["Content-Type"] = "application/json";

  const response = await fetch(API_BASE + path, { ...options, headers });
  if (response.status === 401) {
    logout();
    throw new Error("החיבור פג, יש להתחבר שוב");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "משהו השתבש");
  }
  return data;
}

function logout() {
  token = null;
  localStorage.removeItem("genealadin_token");
  showAuth();
}

// ---- Auth ----

document.getElementById("showLoginBtn").addEventListener("click", () => {
  document.getElementById("showLoginBtn").classList.add("active");
  document.getElementById("showRegisterBtn").classList.remove("active");
  document.getElementById("loginForm").classList.remove("hidden");
  document.getElementById("registerForm").classList.add("hidden");
  setAuthMessage("");
});

document.getElementById("showRegisterBtn").addEventListener("click", () => {
  document.getElementById("showRegisterBtn").classList.add("active");
  document.getElementById("showLoginBtn").classList.remove("active");
  document.getElementById("registerForm").classList.remove("hidden");
  document.getElementById("loginForm").classList.add("hidden");
  setAuthMessage("");
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  setAuthMessage("מתחבר...");
  try {
    const form = new URLSearchParams();
    form.set("username", email);
    form.set("password", password);
    const response = await fetch(API_BASE + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "התחברות נכשלה");
    token = data.access_token;
    localStorage.setItem("genealadin_token", token);
    setAuthMessage("");
    showApp();
  } catch (err) {
    setAuthMessage(err.message, "error");
  }
});

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const full_name = document.getElementById("registerName").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  setAuthMessage("נרשם...");
  try {
    const response = await fetch(API_BASE + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: full_name || null }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "ההרשמה נכשלה");
    setAuthMessage("נרשמת בהצלחה! עכשיו התחבר.", "success");
    document.getElementById("showLoginBtn").click();
    document.getElementById("loginEmail").value = email;
  } catch (err) {
    setAuthMessage(err.message, "error");
  }
});

document.getElementById("logoutBtn").addEventListener("click", logout);

// ---- Tabs ----

document.querySelectorAll(".tab-btn[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn[data-tab]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
    document.getElementById("tab-" + btn.dataset.tab).classList.remove("hidden");
  });
});

// ---- Search ----

function renderArticles(container, articles) {
  if (!articles.length) {
    container.innerHTML = '<div class="empty-state">לא נמצאו תוצאות</div>';
    return;
  }
  container.innerHTML = articles
    .map(
      (a) => `
      <div class="result-card">
        <h3>${escapeHtml(a.title)}</h3>
        ${a.summary ? `<p>${escapeHtml(a.summary)}</p>` : ""}
        <a href="${escapeHtml(a.link)}" target="_blank" rel="noopener">מקור מקורי ↗</a>
        <div class="result-meta">${escapeHtml(a.published_at || "")}</div>
      </div>`
    )
    .join("");
}

document.getElementById("searchBtn").addEventListener("click", async () => {
  const query = document.getElementById("searchQuery").value.trim();
  const container = document.getElementById("searchResults");
  if (!query) return;
  container.innerHTML = '<div class="empty-state">מחפש...</div>';
  try {
    const results = await api("/search", { method: "POST", body: JSON.stringify({ query }) });
    renderArticles(container, results);
  } catch (err) {
    container.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
  }
});

// ---- Person search ----

document.getElementById("personBtn").addEventListener("click", async () => {
  const name = document.getElementById("personName").value.trim();
  const container = document.getElementById("personResults");
  if (!name) return;
  container.innerHTML = '<div class="empty-state">מחפש...</div>';
  try {
    const result = await api("/search/person", { method: "POST", body: JSON.stringify({ name }) });
    let html = "";
    if (result.linked_emails.length) {
      html += `<div class="report-summary"><strong>מיילים שנמצאו יחד עם השם (לבדיקה, לא אישור):</strong><br>${result.linked_emails
        .map(escapeHtml)
        .join(", ")}</div>`;
    }
    container.innerHTML = html;
    const articlesDiv = document.createElement("div");
    articlesDiv.className = "results";
    container.appendChild(articlesDiv);
    renderArticles(articlesDiv, result.matched_articles);
  } catch (err) {
    container.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
  }
});

// ---- Add source ----

document.getElementById("sourceBtn").addEventListener("click", async () => {
  const source_name = document.getElementById("sourceName").value.trim();
  const source_url = document.getElementById("sourceUrl").value.trim();
  const msg = document.getElementById("sourceMessage");
  if (!source_name || !source_url) {
    msg.textContent = "יש למלא שם וקישור";
    msg.className = "message error";
    return;
  }
  msg.textContent = "אוסף נתונים...";
  msg.className = "message";
  try {
    const job = await runScrapingJob(source_name, source_url);
    if (job.status === "completed") {
      msg.textContent = `הצלחה! נאספו ${job.result_count} פריטים.`;
      msg.className = "message success";
      document.getElementById("sourceName").value = "";
      document.getElementById("sourceUrl").value = "";
    } else {
      msg.textContent = "לא הצלחנו לאסוף מהמקור הזה: " + (job.error_message || "שגיאה לא ידועה");
      msg.className = "message error";
    }
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "message error";
  }
});

async function runScrapingJob(source_name, source_url) {
  return api("/scraping/jobs", {
    method: "POST",
    body: JSON.stringify({ source_name, source_url, source_type: "news", scraper_type: "rss" }),
  });
}

// ---- Quick seed: a handful of real, public news RSS feeds ----

const DEFAULT_SOURCES = [
  { name: "חדשות Google (עברית)", url: "https://news.google.com/rss?hl=iw&gl=IL&ceid=IL:iw" },
  { name: "חדשות Google (עולם)", url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en" },
  { name: "Ynet", url: "https://www.ynet.co.il/Integration/StoryRss2.xml" },
  { name: "BBC World", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
];

document.getElementById("seedBtn").addEventListener("click", async () => {
  const msg = document.getElementById("seedMessage");
  let totalItems = 0;
  let failedSources = [];

  for (const source of DEFAULT_SOURCES) {
    msg.textContent = `אוסף מ-${source.name}...`;
    msg.className = "message";
    try {
      const job = await runScrapingJob(source.name, source.url);
      if (job.status === "completed") {
        totalItems += job.result_count;
      } else {
        failedSources.push(source.name);
      }
    } catch (err) {
      failedSources.push(source.name);
    }
  }

  if (totalItems > 0) {
    msg.textContent = `הצלחה! נאספו ${totalItems} כתבות ממקורות חדשות.`;
    msg.className = "message success";
    if (failedSources.length) {
      msg.textContent += ` (לא הצלחנו לאסוף מ: ${failedSources.join(", ")})`;
    }
  } else {
    msg.textContent = "לא הצלחנו לאסוף מאף מקור כרגע. נסה שוב מאוחר יותר, או הוסף מקור ידנית למטה.";
    msg.className = "message error";
  }
});

// ---- Reports ----

document.getElementById("reportBtn").addEventListener("click", async () => {
  const query = document.getElementById("reportQuery").value.trim();
  const container = document.getElementById("reportResults");
  if (!query) return;
  container.innerHTML = '<div class="empty-state">יוצר דוח...</div>';
  try {
    const report = await api("/reports", { method: "POST", body: JSON.stringify({ query }) });
    const breakdownEntries = Object.entries(report.source_breakdown || {});
    const breakdownText = breakdownEntries.map(([name, count]) => `${escapeHtml(name)}: ${count}`).join(", ");
    const summaryLine = `נמצאו ${report.article_count} כתבות התואמות ל-"${escapeHtml(query)}"${
      breakdownText ? " — לפי מקור: " + breakdownText : ""
    }`;
    container.innerHTML = `<div class="report-summary">${summaryLine}</div>`;
    const articlesDiv = document.createElement("div");
    articlesDiv.className = "results";
    container.appendChild(articlesDiv);
    renderArticles(articlesDiv, report.articles);
  } catch (err) {
    container.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
  }
});

// ---- Init ----

if (token) {
  showApp();
} else {
  showAuth();
}
