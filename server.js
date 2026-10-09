const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sanghyo2024!';
const CONTENT_FILE = path.join(__dirname, 'content.json');

let activeToken = null;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname)));

const requireAuth = (req, res, next) => {
  if (req.headers['x-token'] && req.headers['x-token'] === activeToken) return next();
  res.status(401).json({ error: '인증이 필요합니다.' });
};

app.post('/api/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    activeToken = crypto.randomBytes(32).toString('hex');
    res.json({ token: activeToken });
  } else {
    res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
  }
});

app.post('/api/logout', requireAuth, (_req, res) => {
  activeToken = null;
  res.json({ ok: true });
});

app.get('/api/content', (_req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf-8')));
  } catch {
    res.status(500).json({ error: '콘텐츠 파일을 읽을 수 없습니다.' });
  }
});

app.post('/api/content', requireAuth, (req, res) => {
  try {
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(req.body, null, 2), 'utf-8');
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '저장에 실패했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
  console.log(`관리자 페이지: http://localhost:${PORT}/admin.html`);
  console.log(`초기 비밀번호: ADMIN_PASSWORD 환경변수 (기본값: sanghyo2024!)`);
});
