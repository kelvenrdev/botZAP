const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const port = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const punycode = require('punycode');  // após instalar o pacote com npm

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/", express.static(__dirname + "/"));

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname });
});

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'botZAP' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  }
});

client.initialize();

io.on('connection', (socket) => {
  socket.emit('msg', '© botZAP - Iniciado');
  socket.emit('qr', './icon.svg');

  client.on('qr', (qr) => {
    console.log('QR RECEBIDO', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('msg', '© botZAP QRCode recebido, aponte a câmera para seu celular!');
    });
  });

  client.on('ready', () => {
    socket.emit('ready', '© botZAP Dispositivo pronto!');
    socket.emit('msg', '© botZAP Dispositivo pronto!');
    socket.emit('qr', './check.svg');
    console.log('© botZAP Dispositivo pronto');
  });

  client.on('authenticated', () => {
    socket.emit('authenticated', '© botZAP Autenticado!');
    socket.emit('msg', '© botZAP Autenticado!');
    console.log('© botZAP Autenticado');
  });

  client.on('auth_failure', () => {
    socket.emit('msg', '© botZAP Falha na autenticação, reiniciando...');
    console.error('© botZAP Falha na autenticação');
  });

  client.on('change_state', (state) => {
    console.log('© botZAP Status de conexão:', state);
  });

  client.on('disconnected', (reason) => {
    socket.emit('msg', '© botZAP Cliente desconectado!');
    console.log('© botZAP Cliente desconectado', reason);
    client.initialize();
  });
});

// Send message
app.post('/send-message', [
  body('to').notEmpty(),
  body('msg').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({ msg }) => msg);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      msg: errors.mapped()
    });
  }

  const to = req.body.to;
  const numberDDI = to.substr(0, 2);
  const numberDDD = to.substr(2, 2);
  const numberUser = to.substr(-8, 8);
  const msg = req.body.msg;

  let numberZDG;
  if (numberDDI !== "55") {
    numberZDG = to + "@c.us";
  } else if (parseInt(numberDDD) <= 30) {
    numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
  } else {
    numberZDG = "55" + numberDDD + numberUser + "@c.us";
  }

  client.sendMessage(numberZDG, msg)
    .then(response => {
      res.status(200).json({
        status: true,
        msg: 'botZAP Mensagem enviada',
        response: response
      });
    })
    .catch(err => {
      res.status(500).json({
        status: false,
        msg: 'botZAP Mensagem não enviada',
        response: err.text
      });
    });
});

server.listen(port, () => {
  console.log(`App sendo execultado na porta: ${port}`);
});
