document.addEventListener('DOMContentLoaded', () => {
  const listView = document.getElementById('listView');
  const songView = document.getElementById('songView');
  const songList = document.getElementById('songList');
  const searchInput = document.getElementById('searchInput');
  const songTitle = document.getElementById('songTitle');
  const songArtist = document.getElementById('songArtist');
  const songContent = document.getElementById('songContent');
  const backBtn = document.querySelector('.cancionero__back-btn');
  const btnToneUp = document.getElementById('btnToneUp');
  const btnToneDown = document.getElementById('btnToneDown');
  const currentToneOffsetEl = document.getElementById('currentToneOffset');

  let songsData = [];
  let currentSong = null;
  let currentToneOffset = 0;

  // Escala cromática en inglés
  const scaleEn = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  // Escala cromática en español
  const scaleEs = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

  // Función auxiliar para capitalizar
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  // Función para transponer un solo acorde
  function transposeChord(chord, offset) {
    // Regex mejorada para soportar notación inglesa (C, D) y española (Do, Re)
    const match = chord.match(/^([CDEFGAB]|do|re|mi|fa|sol|la|si)([#b]?)(.*)$/i);
    if (!match) return chord; 

    let noteBase = match[1];
    const accidental = match[2];
    const modifier = match[3];

    let note = noteBase + accidental;
    const isSpanish = noteBase.length > 1; 

    if (isSpanish) {
      note = capitalize(noteBase) + accidental;
    } else {
      note = note.toUpperCase();
    }

    const flatToSharpEn = { 'Db':'C#', 'Eb':'D#', 'Gb':'F#', 'Ab':'G#', 'Bb':'A#' };
    const flatToSharpEs = { 'Dob':'Si', 'Reb':'Do#', 'Mib':'Re#', 'Fab':'Mi', 'Solb':'Fa#', 'Lab':'Sol#', 'Sib':'La#' };

    if (isSpanish && flatToSharpEs[note]) note = flatToSharpEs[note];
    else if (!isSpanish && flatToSharpEn[note]) note = flatToSharpEn[note];

    const currentScale = isSpanish ? scaleEs : scaleEn;
    const currentIndex = currentScale.indexOf(note);
    
    if (currentIndex === -1) return chord; 

    const newIndex = ((currentIndex + offset) % 12 + 12) % 12;
    const newNote = currentScale[newIndex];

    // Combinar la nueva nota con el modificador (ej: m, 7, maj)
    return newNote + modifier;
  }

  // Verificar si una línea es de acordes
  function isChordLine(line) {
    const trimmed = line.trim();
    if (trimmed.length === 0) return false;
    
    // Expresión regular para acordes en inglés o español
    const chordRegex = /^([CDEFGAB]|do|re|mi|fa|sol|la|si)[#b]?(m|min|maj|dim|aug|sus)?[0-9]?(\/([CDEFGAB]|do|re|mi|fa|sol|la|si)[#b]?)?$/i;
    
    const words = trimmed.split(/\s+/);
    return words.every(word => chordRegex.test(word));
  }

  // Renderizar el contenido de la canción transponiendo acordes
  function renderSongContent(content, offset) {
    const lines = content.split('\n');
    let html = '';

    lines.forEach(line => {
      if (isChordLine(line)) {
        // Encontrar cada acorde y sus espacios originales
        // Reemplazamos las palabras por su versión transpuesta y con estilo
        const transposedLine = line.replace(/([^\s]+)/g, (match) => {
          const newChord = transposeChord(match, offset);
          return `<span class="chord">${newChord}</span>`;
        });
        html += `<div>${transposedLine}</div>`;
      } else {
        html += `<div class="lyric">${line || '&nbsp;'}</div>`; // &nbsp; mantiene líneas vacías
      }
    });

    songContent.innerHTML = html;
  }

  // Mostrar lista de canciones
  function renderList(songs) {
    songList.innerHTML = '';
    songs.forEach(song => {
      const el = document.createElement('div');
      el.className = 'cancionero__item';
      el.innerHTML = `
        <h3 class="cancionero__item-title">${song.title}</h3>
        <p class="cancionero__item-artist">${song.artist}</p>
      `;
      el.addEventListener('click', () => openSong(song));
      songList.appendChild(el);
    });
  }

  // Abrir una canción
  function openSong(song) {
    currentSong = song;
    currentToneOffset = 0;
    currentToneOffsetEl.textContent = '0';
    
    songTitle.textContent = song.title;
    songArtist.textContent = song.artist;
    
    renderSongContent(song.content, currentToneOffset);

    listView.classList.add('cancionero__list-view--hidden');
    songView.classList.add('song-view--active');
    
    // Cambiar comportamiento del botón de volver
    backBtn.onclick = (e) => {
      e.preventDefault();
      closeSong();
    };
  }

  // Cerrar canción y volver a lista
  function closeSong() {
    currentSong = null;
    songView.classList.remove('song-view--active');
    listView.classList.remove('cancionero__list-view--hidden');
    
    // Restaurar comportamiento original (ir a index)
    backBtn.onclick = null;
  }

  // Controles de Transposición
  btnToneUp.addEventListener('click', () => {
    if (!currentSong) return;
    currentToneOffset++;
    currentToneOffsetEl.textContent = currentToneOffset > 0 ? `+${currentToneOffset}` : currentToneOffset;
    renderSongContent(currentSong.content, currentToneOffset);
  });

  btnToneDown.addEventListener('click', () => {
    if (!currentSong) return;
    currentToneOffset--;
    currentToneOffsetEl.textContent = currentToneOffset > 0 ? `+${currentToneOffset}` : currentToneOffset;
    renderSongContent(currentSong.content, currentToneOffset);
  });

  // Búsqueda
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = songsData.filter(s => 
      s.title.toLowerCase().includes(term) || 
      s.artist.toLowerCase().includes(term)
    );
    renderList(filtered);
  });

  // Cargar datos iniciales
  fetch('data/cancionero.json')
    .then(res => res.json())
    .then(data => {
      songsData = data;
      renderList(data);
    })
    .catch(err => {
      console.error('Error cargando el cancionero:', err);
      songList.innerHTML = '<p style="color:red">Error cargando las canciones.</p>';
    });
});
