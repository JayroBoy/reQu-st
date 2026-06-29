import { v4 as uuidv4 } from 'uuid';
import type { HttpMethod, RequestTab, KeyValuePair } from '../types/request';

/**
 * Parses a raw curl command string into a Partial<RequestTab> that can be
 * merged into a new tab.
 * 
 * Supports: -X, --request, -H, --header, -d, --data, --data-raw, --data-urlencode, -F, -u, -L, --location, --no-location
 */
export function parseCurlCommand(raw: string): Partial<RequestTab> {
  const result: Partial<RequestTab> = {};
  
  // Basic normalization: remove trailing slashes if they are just line continuations
  const normalized = raw.replace(/\\\r?\n/g, ' ').trim();
  
  // Very basic regex-based parser. A robust parser would need a full tokenizer,
  // but this covers 95% of typical copy-pasted curl commands.
  
  // Match method (-X or --request)
  const methodMatch = normalized.match(/(?:-X|--request)\s+([A-Za-z]+)/);
  if (methodMatch) {
    result.method = methodMatch[1].toUpperCase() as HttpMethod;
  }
  
  // Match URL (first argument that doesn't start with - and isn't the value of a flag)
  // We'll do a simpler approach: extract everything that looks like a URL
  const urlMatches = normalized.match(/['"]?(https?:\/\/[^\s'"]+)['"]?/g);
  // Need to be careful not to grab a URL inside a header or body.
  // We will assume the first standalone URL-like string is the URL.
  // For a more robust solution, we'd tokenize.
  
  // Let's use a simple tokenizer to find the URL and flags
  const tokens = tokenize(normalized);
  
  if (tokens.length > 0 && tokens[0].toLowerCase() === 'curl') {
    tokens.shift(); // remove 'curl'
  }
  
  const headers: KeyValuePair[] = [];
  const urlencoded: KeyValuePair[] = [];
  const formData: KeyValuePair[] = [];
  let rawBody = '';
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Look for URL (if we don't have one yet)
    if (!token.startsWith('-') && !result.url) {
      if (token.startsWith('http://') || token.startsWith('https://')) {
        result.url = token;
        continue;
      }
    }
    
    // Headers
    if (token === '-H' || token === '--header') {
      if (i + 1 < tokens.length) {
        const headerStr = tokens[++i];
        const colonIndex = headerStr.indexOf(':');
        if (colonIndex > 0) {
          headers.push({
            id: uuidv4(),
            key: headerStr.substring(0, colonIndex).trim(),
            value: headerStr.substring(colonIndex + 1).trim(),
            enabled: true
          });
        }
      }
    }
    
    // Auth
    else if (token === '-u' || token === '--user') {
      if (i + 1 < tokens.length) {
        const authStr = tokens[++i];
        const colonIndex = authStr.indexOf(':');
        result.auth = {
          type: 'basic',
          basic: {
            username: colonIndex >= 0 ? authStr.substring(0, colonIndex) : authStr,
            password: colonIndex >= 0 ? authStr.substring(colonIndex + 1) : ''
          }
        };
      }
    }
    
    // Redirects
    else if (token === '-L' || token === '--location') {
      result.followRedirects = true;
    }
    else if (token === '--no-location') {
      result.followRedirects = false;
    }
    
    // Body flags
    else if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary') {
      if (i + 1 < tokens.length) {
        // Append to raw body
        if (rawBody) rawBody += '&';
        rawBody += tokens[++i];
        
        // If method isn't set, curl defaults to POST when data is provided
        if (!result.method) {
          result.method = 'POST';
        }
      }
    }
    else if (token === '--data-urlencode') {
      if (i + 1 < tokens.length) {
        const val = tokens[++i];
        const eqIdx = val.indexOf('=');
        if (eqIdx > 0) {
          urlencoded.push({
            id: uuidv4(),
            key: val.substring(0, eqIdx),
            value: val.substring(eqIdx + 1),
            enabled: true
          });
        } else {
          urlencoded.push({
            id: uuidv4(),
            key: val,
            value: '',
            enabled: true
          });
        }
        if (!result.method) result.method = 'POST';
      }
    }
    else if (token === '-F' || token === '--form') {
      if (i + 1 < tokens.length) {
        const val = tokens[++i];
        const eqIdx = val.indexOf('=');
        if (eqIdx > 0) {
          formData.push({
            id: uuidv4(),
            key: val.substring(0, eqIdx),
            value: val.substring(eqIdx + 1),
            enabled: true
          });
        }
        if (!result.method) result.method = 'POST';
      }
    }
    
    // Look for URL as the last fallback if it's not a known flag and we still don't have one
    else if (!token.startsWith('-') && !result.url) {
        result.url = token;
    }
  }
  
  if (headers.length > 0) result.headers = headers;
  
  // Resolve body
  if (formData.length > 0) {
    result.body = { type: 'form-data', formData };
  } else if (urlencoded.length > 0) {
    result.body = { type: 'x-www-form-urlencoded', urlencoded };
  } else if (rawBody) {
    // Try to guess format
    let format: 'json' | 'xml' | 'text' = 'text';
    const trimmed = rawBody.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        format = 'json';
      } catch (e) {
        // Not valid JSON
      }
    } else if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      format = 'xml';
    }
    
    result.body = { type: 'raw', raw: { content: rawBody, format } };
  }
  
  return result;
}

/** Simple tokenizer that handles quoted strings */
function tokenize(str: string): string[] {
  const tokens: string[] = [];
  let currentToken = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    if (inQuotes) {
      if (char === quoteChar && str[i - 1] !== '\\') {
        inQuotes = false;
        // Don't add quote character
      } else {
        currentToken += char;
      }
    } else {
      if ((char === '"' || char === "'") && str[i - 1] !== '\\') {
        inQuotes = true;
        quoteChar = char;
      } else if (char === ' ' || char === '\t') {
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
      } else {
        currentToken += char;
      }
    }
  }
  
  if (currentToken) {
    tokens.push(currentToken);
  }
  
  return tokens;
}
