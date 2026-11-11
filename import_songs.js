const fs = require('fs');
const path = require('path');

const inputDir = 'd:/letras';
const outputFile = path.join(__dirname, 'data', 'cancionero.json');

// Función para obtener todos los archivos de manera recursiva (por si hay subcarpetas)
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

async function run() {
  try {
    console.log(`Leyendo archivos desde ${inputDir}...`);
    if (!fs.existsSync(inputDir)) {
      console.error(`ERROR: La carpeta ${inputDir} no existe.`);
      return;
    }

    const allFiles = getAllFiles(inputDir);
    const txtFiles = allFiles.filter(file => file.toLowerCase().endsWith('.txt'));
    
    console.log(`Se encontraron ${txtFiles.length} archivos .txt`);

    const songs = [];
    let idCounter = 1;

    for (const filePath of txtFiles) {
      // Extraer el nombre del archivo sin extensión como título
      const fileName = path.basename(filePath, path.extname(filePath));
      
      // Intentar adivinar artista si el formato es "Artista - Titulo"
      let artist = "Desconocido";
      let title = fileName;
      
      if (fileName.includes(" - ")) {
        const parts = fileName.split(" - ");
        artist = parts[0].trim();
        title = parts[1].trim();
      }

      // Leer contenido
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        // Limpiamos los saltos de línea extra largos
        const cleanContent = content.replace(/\r\n/g, '\n');
        
        songs.push({
          id: idCounter.toString(),
          title: title,
          artist: artist,
          content: cleanContent
        });
        
        idCounter++;
      } catch (err) {
        console.error(`No se pudo leer el archivo: ${filePath}`);
      }
    }

    // Escribir el JSON resultante
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, JSON.stringify(songs, null, 2));
    
    console.log(`¡Éxito! Se han exportado ${songs.length} canciones a ${outputFile}`);

  } catch (error) {
    console.error("Ocurrió un error general:", error);
  }
}

run();
