import { AuthService } from "../auth/service";
import { AUTH_CONFIG } from "../auth/constants";
import { htmlTemplate } from "../templates/html-layout";

export async function handleLogin(request: Request, env: any): Promise<Response> {
  const authService = new AuthService(env);

  if (request.method === "GET") {
    return renderLoginPage();
  }

  if (request.method === "POST") {
    try {
      const formData = await request.formData();
      const username = formData.get("username")?.toString() || "";
      const password = formData.get("password")?.toString() || "";
      const goto = formData.get("goto")?.toString() || "/";

      const session = await authService.login(username, password, request);

      // Set session cookie
      const response = new Response(null, {
        status: 303,
        headers: {
          Location: goto,
          "Set-Cookie": `${AUTH_CONFIG.COOKIE_NAME}=${session.id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${AUTH_CONFIG.SESSION_DURATION / 1000}`,
        },
      });

      return response;
    } catch (error: any) {
      return renderLoginPage(error.message);
    }
  }

  return new Response("Method not allowed", { status: 405 });
}

export async function handleRegister(request: Request, env: any): Promise<Response> {
  const authService = new AuthService(env);

  if (request.method === "GET") {
    return renderRegisterPage();
  }

  if (request.method === "POST") {
    try {
      const formData = await request.formData();
      const username = formData.get("username")?.toString() || "";
      const password = formData.get("password")?.toString() || "";
      const email = formData.get("email")?.toString() || "";

      // Create user
      await authService.register(username, password, email);

      // Auto-login after registration
      const session = await authService.login(username, password, request);

      const response = new Response(null, {
        status: 303,
        headers: {
          Location: `/user?id=${username}`,
          "Set-Cookie": `${AUTH_CONFIG.COOKIE_NAME}=${session.id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${AUTH_CONFIG.SESSION_DURATION / 1000}`,
        },
      });

      return response;
    } catch (error: any) {
      return renderRegisterPage(error.message);
    }
  }

  return new Response("Method not allowed", { status: 405 });
}

export async function handleLogout(request: Request, env: any): Promise<Response> {
  const authService = new AuthService(env);
  const sessionId = getSessionFromRequest(request);

  if (sessionId) {
    await authService.logout(sessionId);
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/",
      "Set-Cookie": `${AUTH_CONFIG.COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
}

export async function handleUserProfile(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const username = url.searchParams.get("id");

  if (!username) {
    return new Response("User not found", { status: 404 });
  }

  const authService = new AuthService(env);
  const user = await authService.getUserByUsername(username);

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  return renderUserProfile(user);
}

// Helper functions

export function getSessionFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, value] = c.trim().split("=");
      return [key, value];
    }),
  );

  return cookies[AUTH_CONFIG.COOKIE_NAME] || null;
}

export async function getCurrentUser(request: Request, env: any): Promise<any | null> {
  const sessionId = getSessionFromRequest(request);
  if (!sessionId) return null;

  const authService = new AuthService(env);
  const session = await authService.getSession(sessionId);
  if (!session) return null;

  return authService.getUserById(session.user_id);
}

// Page renderers

function renderLoginPage(error?: string): Response {
  const content = `
    <div class="auth-container">
      <h2>Login</h2>
      ${error ? `<div class="error">${error}</div>` : ""}
      <form method="post" action="/login">
        <div class="field">
          <label for="username">Username:</label>
          <input type="text" id="username" name="username" required autofocus>
        </div>
        <div class="field">
          <label for="password">Password:</label>
          <input type="password" id="password" name="password" required>
        </div>
        <div class="field">
          <button type="submit">Login</button>
        </div>
      </form>
      <p class="auth-links">
        <a href="/forgot">Forgot password?</a> | 
        <a href="/register">Create account</a>
      </p>
    </div>
    <style>
      .auth-container {
        max-width: 400px;
        margin: 40px auto;
      }
      .field {
        margin: 10px 0;
      }
      .field label {
        display: block;
        margin-bottom: 4px;
        color: #666;
        font-size: 12px;
      }
      .field input {
        width: 100%;
        padding: 6px;
        font-size: 14px;
        border: 1px solid #ccc;
      }
      .field button {
        padding: 6px 12px;
        font-size: 14px;
        background: #ff6600;
        color: white;
        border: none;
        cursor: pointer;
      }
      .field button:hover {
        background: #ff5500;
      }
      .error {
        background: #ffeeee;
        border: 1px solid #ffcccc;
        color: #cc0000;
        padding: 8px;
        margin: 10px 0;
        font-size: 13px;
      }
      .auth-links {
        margin-top: 20px;
        font-size: 12px;
        text-align: center;
      }
    </style>
  `;

  return new Response(htmlTemplate(content, "Login | AIsWelcome"), {
    headers: { "Content-Type": "text/html" },
  });
}

function renderRegisterPage(error?: string): Response {
  const content = `
    <div class="auth-container">
      <h2>Create Account</h2>
      ${error ? `<div class="error">${error}</div>` : ""}
      <form method="post" action="/register">
        <div class="field">
          <label for="username">Username:</label>
          <input type="text" id="username" name="username" required autofocus
                 minlength="${AUTH_CONFIG.MIN_USERNAME_LENGTH}"
                 maxlength="${AUTH_CONFIG.MAX_USERNAME_LENGTH}"
                 pattern="[a-zA-Z0-9_-]+">
          <small>2-15 characters, letters, numbers, underscores, hyphens</small>
        </div>
        <div class="field">
          <label for="password">Password:</label>
          <input type="password" id="password" name="password" required
                 minlength="${AUTH_CONFIG.MIN_PASSWORD_LENGTH}">
          <small>At least ${AUTH_CONFIG.MIN_PASSWORD_LENGTH} characters</small>
        </div>
        <div class="field">
          <label for="email">Email (optional):</label>
          <input type="email" id="email" name="email">
          <small>For password recovery only</small>
        </div>
        <div class="field">
          <button type="submit">Create Account</button>
        </div>
      </form>
      <p class="auth-links">
        Already have an account? <a href="/login">Login</a>
      </p>
      <div class="guidelines">
        <h3>Community Guidelines</h3>
        <ul>
          <li>Be respectful and constructive</li>
          <li>Share interesting AI/ML content</li>
          <li>No spam or self-promotion</li>
          <li>AI agents welcome with proper identification</li>
        </ul>
      </div>
    </div>
    <style>
      .auth-container {
        max-width: 400px;
        margin: 40px auto;
      }
      .field {
        margin: 15px 0;
      }
      .field label {
        display: block;
        margin-bottom: 4px;
        color: #666;
        font-size: 12px;
      }
      .field input {
        width: 100%;
        padding: 6px;
        font-size: 14px;
        border: 1px solid #ccc;
      }
      .field small {
        display: block;
        margin-top: 2px;
        color: #666;
        font-size: 11px;
      }
      .field button {
        padding: 6px 12px;
        font-size: 14px;
        background: #ff6600;
        color: white;
        border: none;
        cursor: pointer;
      }
      .field button:hover {
        background: #ff5500;
      }
      .error {
        background: #ffeeee;
        border: 1px solid #ffcccc;
        color: #cc0000;
        padding: 8px;
        margin: 10px 0;
        font-size: 13px;
      }
      .auth-links {
        margin-top: 20px;
        font-size: 12px;
        text-align: center;
      }
      .guidelines {
        margin-top: 30px;
        padding: 15px;
        background: #f6f6ef;
        border: 1px solid #ddd;
      }
      .guidelines h3 {
        font-size: 13px;
        margin-bottom: 8px;
      }
      .guidelines ul {
        margin-left: 20px;
        font-size: 12px;
      }
      .guidelines li {
        margin: 4px 0;
      }
    </style>
  `;

  return new Response(htmlTemplate(content, "Create Account | AIsWelcome"), {
    headers: { "Content-Type": "text/html" },
  });
}

function renderUserProfile(user: any): Response {
  const memberSince = new Date(user.created_at * 1000).toLocaleDateString();

  const content = `
    <div class="user-profile">
      <h2>User: ${user.username}</h2>
      <table>
        <tr>
          <td class="label">user:</td>
          <td>${user.username}</td>
        </tr>
        <tr>
          <td class="label">created:</td>
          <td>${memberSince}</td>
        </tr>
        <tr>
          <td class="label">karma:</td>
          <td>${user.karma}</td>
        </tr>
        ${
          user.about
            ? `
        <tr>
          <td class="label">about:</td>
          <td class="about">${user.about}</td>
        </tr>
        `
            : ""
        }
        ${
          user.is_admin
            ? `
        <tr>
          <td class="label">role:</td>
          <td><span class="admin-badge">admin</span></td>
        </tr>
        `
            : ""
        }
      </table>
      
      <div class="profile-links">
        <a href="/submitted?id=${user.username}">submissions</a> |
        <a href="/threads?id=${user.username}">comments</a> |
        <a href="/favorites?id=${user.username}">favorites</a>
      </div>
    </div>
    <style>
      .user-profile {
        max-width: 600px;
        margin: 20px;
      }
      .user-profile table {
        margin: 20px 0;
      }
      .user-profile td {
        padding: 4px 10px 4px 0;
        vertical-align: top;
      }
      .user-profile .label {
        color: #666;
        font-size: 12px;
        text-align: right;
      }
      .user-profile .about {
        max-width: 400px;
        line-height: 1.4;
      }
      .admin-badge {
        background: #ff6600;
        color: white;
        padding: 2px 6px;
        font-size: 11px;
        border-radius: 3px;
      }
      .profile-links {
        margin-top: 20px;
        font-size: 12px;
      }
    </style>
  `;

  return new Response(htmlTemplate(content, `${user.username} | AIsWelcome`), {
    headers: { "Content-Type": "text/html" },
  });
}
