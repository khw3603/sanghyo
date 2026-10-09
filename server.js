const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sanghyo2024!';

// 볼륨 마운트 경로 우선 사용, 없으면 로컬 사용
const DATA_DIR = process.env.DATA_DIR || __dirname;
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const DEFAULT_CONTENT = path.join(__dirname, 'content.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// 디렉토리 초기화
function init() {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    if (DATA_DIR !== __dirname && !fs.existsSync(CONTENT_FILE)) {
      fs.copyFileSync(DEFAULT_CONTENT, CONTENT_FILE);
      console.log('콘텐츠 파일을 볼륨으로 초기화했습니다.');
    }
  } catch (e) {
    console.error('초기화 오류:', e.message);
  }
}
init();

// 이미지 업로드 설정
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.params.type}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('이미지 파일만 업로드 가능합니다.'));
  }
});

let activeToken = null;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(UPLOADS_DIR)); // 업로드 이미지 서빙

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
    try {
      res.json(JSON.parse(fs.readFileSync(DEFAULT_CONTENT, 'utf-8')));
    } catch {
      res.status(500).json({ error: '콘텐츠 파일을 읽을 수 없습니다.' });
    }
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

// 이미지 업로드 엔드포인트
app.post('/api/upload/:type', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일이 없습니다.' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ ok: true, url });
});

// 업로드된 이미지 목록
app.get('/api/uploads', requireAuth, (_req, res) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR)
      .filter(f => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f))
      .map(f => ({ name: f, url: `/uploads/${f}` }));
    res.json(files);
  } catch {
    res.json([]);
  }
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
  console.log(`업로드 경로: ${UPLOADS_DIR}`);
  console.log(`관리자 페이지: http://localhost:${PORT}/admin.html`);
});
