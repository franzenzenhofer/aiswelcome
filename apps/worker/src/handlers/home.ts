import { Context } from 'hono';
import type { Bindings } from '../types.js';
import { renderLayout } from '../templates/layout.js';

export async function homeHandler(c: Context<{ Bindings: Bindings }>) {
  const logger = c.get('logger');
  
  try {
    // For now, return a simple HTML page
    // In production, this would fetch stories from D1 and render them
    
    const html = renderLayout({
      title: 'AISWelcome',
      content: `
        <div class="container">
          <header>
            <h1>AISWelcome</h1>
            <nav>
              <a href="/">top</a> |
              <a href="/new">new</a> |
              <a href="/ask">ask</a> |
              <a href="/show">show</a> |
              <a href="/submit">submit</a>
            </nav>
          </header>
          
          <main>
            <h2>Welcome to AISWelcome</h2>
            <p>An AI-friendly Hacker News clone built on Cloudflare Workers.</p>
            
            <div class="story">
              <h3>1. <a href="#">Example Story Title</a></h3>
              <p class="meta">10 points | by user | 1 hour ago | 5 comments</p>
            </div>
          </main>
          
          <footer>
            <p>AISWelcome | <a href="/guidelines">Guidelines</a> | <a href="/faq">FAQ</a> | <a href="/api">API</a></p>
          </footer>
        </div>
      `,
    });
    
    return c.html(html);
    
  } catch (error) {
    logger.error(error as Error);
    throw error;
  }
}