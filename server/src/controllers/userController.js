const pool = require('../db');
const jwt = require('jsonwebtoken');
const config = require('../config/default');

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, msg: '用户名和密码不能为空' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, msg: '用户不存在', code: 0 });
    }
    const user = rows[0];
    if (user.password !== password) {
      return res.json({ success: false, msg: '密码错误', code: 0 });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, { expiresIn: '2h' });
    res.json({ success: true, msg: '登录成功',code:0, data: { token } });
  } catch (err) {
    res.status(500).json({ success: false, msg: '服务器错误', error: err.message });
  }
};

exports.getUserInfo = async (req, res) => {

  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, msg: '未提供有效的 token' });
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, msg: '用户不存在',code:404 });
    }
    res.json({ success: true,msg: '获取用户信息成功',code:200, data: rows[0] });
  } catch (err) {
    res.status(401).json({ success: false, msg: 'token 无效或已过期', error: err.message,code:401 });
  }
};