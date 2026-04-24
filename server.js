const express = require("express");
const path = require("path");

const app = express();

// Porta do Railway (OBRIGATÓRIO)
const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos (HTML, CSS, JS)
app.use(express.static(__dirname));

// Rota principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
