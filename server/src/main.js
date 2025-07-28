require('dotenv').config();
const express = require('express');
const cors = require('cors');
const config = require('./config/default');
const userRouter = require('./routes/user');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('src/accets'));

app.use('/api/v1', userRouter);

app.get('/', (req, res) => {
  res.send('HelloWorld 我的第一个网站');
});

app.listen(config.port, () => {
  console.log(`服务已启动，端口：${config.port}`);
});


