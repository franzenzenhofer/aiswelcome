export interface LayoutOptions {
  title: string;
  content: string;
  description?: string;
  scripts?: string;
}

export function renderLayout(options: LayoutOptions): string {
  const {
    title,
    content,
    description = "An AI-friendly Hacker News clone",
    scripts = "",
  } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${description}">
  <title>${title}</title>
  <style>
    :root {
      --bg: #f6f6ef;
      --text: #000;
      --link: #0000ee;
      --visited: #551a8b;
      --border: #ff6600;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Verdana, Geneva, sans-serif;
      font-size: 13px;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 8px;
    }
    
    header {
      background: var(--border);
      padding: 2px 4px;
      margin-bottom: 10px;
    }
    
    header h1 {
      display: inline;
      font-size: 13px;
      font-weight: bold;
      margin-right: 10px;
    }
    
    header nav {
      display: inline;
    }
    
    header a {
      color: #000;
      text-decoration: none;
      margin: 0 3px;
    }
    
    a {
      color: var(--link);
      text-decoration: none;
    }
    
    a:visited {
      color: var(--visited);
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    .story {
      margin: 10px 0;
    }
    
    .story h3 {
      font-size: 13px;
      font-weight: normal;
      display: inline;
    }
    
    .meta {
      font-size: 11px;
      color: #666;
      margin-left: 20px;
    }
    
    footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 11px;
      color: #666;
    }
    
    form {
      margin: 20px 0;
    }
    
    input[type="text"],
    input[type="url"],
    input[type="email"],
    input[type="password"],
    textarea {
      font-family: monospace;
      font-size: 13px;
      padding: 2px;
      border: 1px solid #ccc;
    }
    
    button,
    input[type="submit"] {
      font-family: Verdana, Geneva, sans-serif;
      font-size: 13px;
      padding: 2px 8px;
    }
    
    .error {
      color: #f00;
      margin: 10px 0;
    }
    
    .success {
      color: #080;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  ${content}
  ${scripts}
</body>
</html>`;
}
