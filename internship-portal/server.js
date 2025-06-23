const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
const querystring = require('querystring');
const { IncomingForm } = require('formidable');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// DB init
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root1234'
});

db.query('CREATE DATABASE IF NOT EXISTS user_signup', (err) => {
  if (err) throw err;
  db.changeUser({ database: 'user_signup' }, (err) => {
    if (err) throw err;

    db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
      );
    `);

    db.query(`
      CREATE TABLE IF NOT EXISTS internships (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        description TEXT,
        location VARCHAR(100),
        duration VARCHAR(50),
        stipend VARCHAR(50),
        deadline DATE,
        created_by VARCHAR(100)
      );
    `);

    db.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        internship_id INT,
        candidate_name VARCHAR(100),
        FOREIGN KEY (internship_id) REFERENCES internships(id)
      );
    `);

    db.query(`
      CREATE TABLE IF NOT EXISTS company (
        id INT PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100),
        description TEXT,
        image VARCHAR(255)
      );
    `, () => {
      db.query('INSERT IGNORE INTO company (id) VALUES (1)');
    });

    db.query(`
      CREATE TABLE IF NOT EXISTS candidate_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100),
        bio TEXT,
        UNIQUE KEY unique_email (email)
      );
    `);

    console.log('✅ DB & tables ready');
  });
});

const mockLoggedInUser = { id: 1, username: 'employer1' };

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    if (req.url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, req.url);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          return res.end('Image not found');
        }
        res.writeHead(200);
        res.end(data);
      });
      return;
    }

    if (req.url === '/api/internships' || req.url === '/api/candidate/internships') {
      db.query('SELECT id, title, location, duration, stipend, deadline, description, created_by FROM internships', (err, results) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Database error' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(results));
      });
      return;
    }

    if (req.url.startsWith('/api/candidate/applications')) {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const name = urlObj.searchParams.get('name');
      db.query(
        'SELECT internships.title, internships.location FROM applications JOIN internships ON applications.internship_id = internships.id WHERE applications.candidate_name = ?',
        [name],
        (err, results) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'DB error' }));
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(results));
        }
      );
      return;
    }

    if (req.url === '/api/company') {
      db.query('SELECT * FROM company WHERE id = 1', (err, results) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Company not found' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results[0] || {}));
      });
      return;
    }

    if (req.url === '/api/applicants') {
      const sql = `
        SELECT a.candidate_name, i.title, a.internship_id
        FROM applications a
        JOIN internships i ON a.internship_id = i.id
      `;
      db.query(sql, (err, results) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Failed to load applicants' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
      });
      return;
    }

    if (req.url === '/api/user') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockLoggedInUser));
      return;
    }

    let file = req.url === '/' ? '/login.html' : req.url;
    if (!path.extname(file)) file += '.html';
    const filePath = path.join(__dirname, file);
    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript'
    }[ext] || 'text/plain';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Page not found');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });

  } else if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);

    if (req.url === '/signup') {
      req.on('end', () => {
        const { username, email, password } = querystring.parse(body);
        db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, password], (err) => {
          if (err) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            return res.end('❌ Signup failed');
          }
          res.writeHead(302, { Location: '/login.html' });
          res.end();
        });
      });

    } else if (req.url === '/login') {
      req.on('end', () => {
        const { username, password, role } = querystring.parse(body);
        db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, results) => {
          if (err || results.length === 0) {
            res.writeHead(401, { 'Content-Type': 'text/html' });
            return res.end('<h3>Invalid login</h3>');
          }
          const page = role === 'employer' ? '/employer-dashboard.html' : role === 'candidate' ? '/candidate-dashboard.html' : '/login.html';
          res.writeHead(302, { Location: page });
          res.end();
        });
      });

    } else if (req.url === '/create-internship') {
      req.on('end', () => {
        const { title, description, location, duration, stipend, deadline, created_by } = querystring.parse(body);
        const sql = 'INSERT INTO internships (title, description, location, duration, stipend, deadline, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)';
        db.query(sql, [title, description, location, duration, stipend, deadline, created_by], (err) => {
          if (err) {
            res.writeHead(500);
            return res.end('Error creating internship');
          }
          res.writeHead(302, { Location: '/employer-dashboard.html' });
          res.end();
        });
      });

    } else if (req.url === '/apply-internship') {
      req.on('end', () => {
        const { internshipId, candidateName } = querystring.parse(body);
        db.query('INSERT INTO applications (internship_id, candidate_name) VALUES (?, ?)', [internshipId, candidateName], (err) => {
          if (err) {
            res.writeHead(500);
            return res.end('❌ Application failed');
          }
          res.writeHead(200);
          res.end('✅ Applied successfully');
        });
      });

    } else if (req.url === '/api/company/update') {
      const form = new IncomingForm({ multiples: false, uploadDir: uploadsDir, keepExtensions: true });
      form.parse(req, (err, fields, files) => {
        if (err) {
          res.writeHead(400);
          return res.end('Upload failed');
        }

        const { name, email, description } = fields;
        const imageFile = files.image && files.image.originalFilename ? path.basename(files.image.filepath) : null;

        const sql = imageFile
          ? 'UPDATE company SET name=?, email=?, description=?, image=? WHERE id=1'
          : 'UPDATE company SET name=?, email=?, description=? WHERE id=1';

        const values = imageFile
          ? [name, email, description, imageFile]
          : [name, email, description];

        db.query(sql, values, (err) => {
          if (err) {
            res.writeHead(500);
            return res.end('Update failed');
          }
          res.writeHead(200);
          res.end('✅ Company profile updated');
        });
      });

    } else if (req.url === '/api/candidate/profile') {
      req.on('end', () => {
        const { name, email, bio } = querystring.parse(body);
        db.query(
          'INSERT INTO candidate_profiles (name, email, bio) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE email=?, bio=?',
          [name, email, bio, email, bio],
          (err) => {
            if (err) {
              res.writeHead(500);
              return res.end('❌ Profile update failed');
            }
            res.writeHead(200);
            res.end('✅ Profile updated');
          }
        );
      });

    } else if (req.url === '/delete-internship') {
      req.on('end', () => {
        const { id } = querystring.parse(body);
        db.query('DELETE FROM internships WHERE id = ?', [id], (err) => {
          if (err) {
            res.writeHead(500);
            return res.end('❌ Failed to delete internship');
          }
          res.writeHead(200);
          res.end('✅ Internship deleted');
        });
      });

    } else {
      res.writeHead(404);
      res.end('404 Not Found');
    }

  } else {
    res.writeHead(404);
    res.end('404 Not Found');
  }
});

server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
