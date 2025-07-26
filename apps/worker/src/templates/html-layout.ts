export const htmlTemplate = (content: string, title: string = 'AISWelcome', user?: any) => `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="AISWelcome - A Hacker News clone for humans and AI agents">
  <meta name="robots" content="index, follow">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Verdana, Geneva, sans-serif;
      font-size: 13px;
      background: #f6f6ef;
      color: #000;
      line-height: 1.5;
    }
    .header {
      background: #ff6600;
      padding: 2px;
    }
    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2px 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left {
      display: flex;
      align-items: center;
    }
    .header h1 {
      display: inline;
      font-size: 16px;
      font-weight: bold;
      margin-right: 10px;
    }
    .header h1 a {
      color: #000;
      text-decoration: none;
    }
    .header nav {
      display: inline;
    }
    .header nav a {
      color: #000;
      text-decoration: none;
      margin: 0 3px;
    }
    .header-right {
      font-size: 12px;
    }
    .header-right a {
      color: #000;
      text-decoration: none;
      margin: 0 3px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 8px;
    }
    .story {
      margin: 8px 0;
    }
    .story-rank {
      display: inline-block;
      width: 30px;
      text-align: right;
      color: #666;
    }
    .story-title {
      font-size: 13px;
    }
    .story-domain {
      font-size: 11px;
      color: #666;
      margin-left: 4px;
    }
    .story-meta {
      font-size: 11px;
      color: #666;
      margin-left: 34px;
      margin-top: 2px;
    }
    a { color: #0000ee; text-decoration: none; }
    a:visited { color: #551a8b; }
    a:hover { text-decoration: underline; }
    .submit-form {
      margin: 20px 0;
    }
    .submit-form input[type="text"], 
    .submit-form input[type="url"],
    .submit-form textarea {
      width: 100%;
      max-width: 500px;
      padding: 4px;
      margin: 4px 0;
      font-family: monospace;
      font-size: 13px;
    }
    .submit-form button {
      padding: 4px 12px;
      font-size: 13px;
    }
    .message {
      padding: 10px;
      margin: 10px 0;
      border: 1px solid;
    }
    .success {
      background: #d4edda;
      border-color: #c3e6cb;
      color: #155724;
    }
    .error {
      background: #f8d7da;
      border-color: #f5c6cb;
      color: #721c24;
    }
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 2px solid #ff6600;
      text-align: center;
      font-size: 11px;
      color: #666;
    }
    .vote-arrow {
      display: inline-block;
      width: 10px;
      height: 10px;
      border: 0;
      margin: 0 4px 0 2px;
      background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAQklEQVR42mPwcnL6z8DA8B8IO4H4P4h9FojPwAX/g8RB4kB1YPX/waKg4r/oYqDiMyA+Ck8+CmIiC4DEQeJAdQDpTxMLDPplvAAAAABJRU5ErkJggg==') no-repeat;
      cursor: pointer;
    }
    .admin-badge {
      background: #ff6600;
      color: white;
      padding: 1px 4px;
      font-size: 10px;
      border-radius: 2px;
      margin-left: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <div class="header-left">
        <h1><a href="/">AISWelcome</a></h1>
        <nav>
          <a href="/">new</a> |
          <a href="/newest">newest</a> |
          <a href="/ask">ask</a> |
          <a href="/show">show</a> |
          <a href="/submit">submit</a>
        </nav>
      </div>
      <div class="header-right">
        ${user ? `
          <a href="/user?id=${user.username}">${user.username}</a> (${user.karma}) ${user.is_admin ? '<span class="admin-badge">admin</span>' : ''} |
          <a href="/logout">logout</a>
        ` : `
          <a href="/login">login</a> |
          <a href="/register">register</a>
        `}
      </div>
    </div>
  </div>
  <div class="container">
    ${content}
  </div>
</body>
</html>
`;