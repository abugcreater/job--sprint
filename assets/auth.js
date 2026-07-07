(function () {
  "use strict";

  function appBase() {
    return window.location.pathname.startsWith("/job-sprint/") ? "/job-sprint" : "";
  }

  function appPath(path) {
    return `${appBase()}${path}`;
  }

  function defaultNextPath() {
    return appPath("/react/index.html#/today");
  }

  function nextPath() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const base = appBase();
    if (!next || !next.startsWith("/") || next.startsWith("//")) {
      return defaultNextPath();
    }
    if (base && next !== `${base}/schedule.html` && !next.startsWith(`${base}/`)) {
      return defaultNextPath();
    }
    return next;
  }

  const form = document.getElementById("loginForm");
  const userInput = document.getElementById("loginUser");
  const passwordInput = document.getElementById("loginPassword");
  const button = document.getElementById("loginButton");
  const message = document.getElementById("loginMessage");

  function setMessage(text, kind) {
    message.textContent = text;
    message.dataset.kind = kind || "info";
  }

  fetch(appPath("/api/auth/session"), { cache: "no-store" })
    .then((response) => response.json())
    .then((session) => {
      if (session.authenticated) {
        window.location.replace(nextPath());
      } else if (!session.authConfigured) {
        setMessage("应用层认证未配置。请先在服务器环境变量中设置账号、密码或密码哈希、session secret。", "error");
      }
    })
    .catch(() => {
      setMessage("暂时无法确认登录状态，请检查本地服务是否启动。", "error");
    });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    button.disabled = true;
    setMessage("正在登录...", "info");
    try {
      const response = await fetch(appPath("/api/auth/login"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: userInput.value,
          password: passwordInput.value
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || `登录失败：HTTP ${response.status}`);
      }
      setMessage("登录成功，正在进入工作台。", "success");
      window.location.replace(nextPath());
    } catch (error) {
      setMessage(error.message, "error");
      button.disabled = false;
    }
  });
})();
